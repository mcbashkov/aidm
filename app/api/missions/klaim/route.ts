import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentSession } from "@/lib/catat/server";
import { alamatWalletUser } from "@/lib/wallet/server";
import { evaluasiMisi } from "@/lib/missions/server";
import {
  GALAT_KLAIM,
  kodeDariSqlstate,
  type KodeGalatKlaim,
} from "@/lib/missions/galat";
import { isKlaimConfigured, nonceBaru } from "@/lib/missions/klaim-server";

export const runtime = "nodejs";
// Tidak ada lagi panggilan rantai di jalur ini — yang tersisa hanyalah
// beberapa query Postgres. Anggaran panjang yang dulu diperlukan untuk
// menunggu receipt justru menyamarkan kelambatan bila suatu saat muncul.
export const maxDuration = 15;

/**
 * Satu bentuk penolakan untuk seluruh handler: `{ code, message }`.
 *
 * `pesan` hanya diisi bila kita punya kalimat yang LEBIH spesifik daripada
 * kalimat baku kode itu (mis. cap harian yang menyebut angkanya). Statusnya
 * selalu dari tabel — supaya satu kode tidak pernah keluar dengan dua status
 * berbeda tergantung cabang mana yang memanggilnya.
 */
function tolak(kode: KodeGalatKlaim, pesan?: string) {
  const def = GALAT_KLAIM[kode];
  return NextResponse.json(
    { code: kode, message: pesan ?? def.message },
    { status: def.status },
  );
}

/** SQLSTATE dari galat PostgREST, bila galatnya memang datang dari Postgres. */
function sqlstate(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code?: unknown }).code;
    if (typeof c === "string") return c;
  }
  return undefined;
}

/**
 * POST /api/missions/klaim — {code} (§7.6 / §11).
 *
 * Server MENGHITUNG ULANG progres dari data sumber sebelum menandatangani —
 * tidak pernah memercayai klaim kelayakan dari klien. Cap harian & anti-replay
 * ditegakkan lagi di kontrak (`MissionRewards.sol`), jadi pemeriksaan di sini
 * adalah lapis pertama yang ramah pengguna, bukan satu-satunya penjaga.
 */
export async function POST(req: Request) {
  const sesi = currentSession();
  if (!sesi) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const uid = sesi.uid;

  let code = "";
  try {
    const body = (await req.json()) as { code?: unknown };
    if (typeof body.code === "string") code = body.code;
  } catch {
    /* ditolak di bawah */
  }
  if (!code) return tolak("MISSION_UNKNOWN");

  if (!isKlaimConfigured()) return tolak("CLAIM_NOT_CONFIGURED");

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }

  try {
    const hasil = await evaluasiMisi(supa, uid, true);
    const misi = hasil.misi.find((m) => m.code === code);
    if (!misi) return tolak("MISSION_UNKNOWN");
    if (!misi.selesai) return tolak("MISSION_NOT_COMPLETE");
    if (misi.diklaim) return tolak("ALREADY_CLAIMED");
    if (misi.alasanTerkunci) {
      // Kode datang dari evaluator, bukan disimpulkan dari isi kalimat.
      return tolak(misi.kodeTerkunci ?? "UNEXPECTED", misi.alasanTerkunci);
    }

    // Baris `wallets` bisa memang belum ada — dan bila begitu, alamatnya
    // ditanyakan ke Privy lalu disimpan di sini juga. Reward tidak boleh
    // hangus hanya karena embedded wallet lahir beberapa detik setelah sesi.
    const hasilWallet = await alamatWalletUser(supa, uid, sesi.did);
    if (hasilWallet.status !== "ada") {
      // 409, bukan 400: permintaannya benar, keadaannya yang belum siap.
      return tolak(
        hasilWallet.status === "galat-privy"
          ? "WALLET_LOOKUP_FAILED"
          : "WALLET_NOT_READY",
      );
    }
    // Alamatnya sendiri tidak dipakai di sini — relayer yang membacanya saat
    // mengirim. Yang dibutuhkan jalur ini hanyalah KEPASTIAN bahwa dompetnya
    // ada, supaya kita tidak mengantrekan pekerjaan yang pasti tidak bisa
    // diselesaikan dan baru memberi tahu penggunanya semenit kemudian.
    if (hasilWallet.diisiSusulan) {
      console.log(`[wallet] alamat diisi susulan saat klaim (uid=${uid})`);
    }

    const { data: misiRow } = await supa
      .from("missions")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!misiRow) return tolak("MISSION_UNKNOWN");

    const nonce = nonceBaru();
    // NIAT ditulis, lalu selesai. Tidak ada satu pun panggilan rantai di jalur
    // permintaan ini — itulah keseluruhan gagasannya. `nonce` sengaja lahir di
    // sini, SEBELUM apa pun dikirim: ia yang membuat kebenaran on-chain selalu
    // bisa ditanyakan ulang (`nonceUsed`) seandainya kita kehilangan jejak, dan
    // ia yang membuat kirim ulang tidak mungkin membayar dua kali.
    //
    // Indeks unik (user, misi, periode) di 0017 adalah penjaga idempotensinya —
    // sama seperti `swap_vouchers.nonce` di 0018, jaminannya ditegakkan
    // DATABASE, bukan oleh kehati-hatian kode. Dua tab, dua ketukan, atau dua
    // permintaan yang tiba bersamaan menghasilkan satu baris; yang kalah
    // menerima 23505 dan dijawab ALREADY_CLAIMED.
    const { data: klaimRow, error: errKlaim } = await supa
      .from("mission_claims")
      .insert({
        user_id: uid,
        mission_id: misiRow.id,
        amount_idmx: misi.reward,
        nonce: nonce.toString(),
        period_key: misi.periodKey,
        status: "queued",
      })
      .select("id")
      .single();
    if (errKlaim || !klaimRow) {
      const kode = kodeDariSqlstate(sqlstate(errKlaim));
      // Bentrok indeks periode adalah jalan kerja normal (dua tab, dua ketukan)
      // — bukan insiden. Sisanya dicatat LENGKAP dengan SQLSTATE-nya.
      if (kode !== "ALREADY_CLAIMED") {
        console.error(
          `[misi] insert klaim gagal (sqlstate=${sqlstate(errKlaim) ?? "-"}, kode=${kode}):`,
          errKlaim,
        );
      }
      return tolak(kode);
    }

    // "diproses", bukan "berhasil". Rewardnya memang belum ada di dompet siapa
    // pun sampai relayer mengirimnya, dan layar menampilkan apa adanya.
    return NextResponse.json({
      ok: true,
      code,
      reward: misi.reward,
      status: "diproses",
    });
  } catch (err) {
    // Hanya sampai sini bila kita benar-benar tidak tahu apa yang terjadi.
    // SQLSTATE ikut dicatat kalau ada — galat Postgres yang lolos ke sini
    // berarti ada cabang yang belum dipetakan, dan kodenya yang menunjukkan
    // cabang mana.
    console.error(
      `[misi] klaim gagal tak terduga (sqlstate=${sqlstate(err) ?? "-"}):`,
      err,
    );
    return tolak("UNEXPECTED");
  }
}
