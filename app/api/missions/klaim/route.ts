import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { evaluasiMisi } from "@/lib/missions/server";
import { ikutCapHarian } from "@/lib/missions";
import {
  GALAT_KLAIM,
  kodeDariSqlstate,
  type KodeGalatKlaim,
} from "@/lib/missions/galat";
import {
  idmxKeWei,
  isKlaimConfigured,
  missionIdOnChain,
  nonceBaru,
  tandatanganiVoucher,
  tebusVoucher,
} from "@/lib/missions/klaim-server";

export const runtime = "nodejs";
// AC §7.6: klaim menghasilkan tx sukses ≤ 30 detik.
export const maxDuration = 60;

/** Voucher berlaku 10 menit — cukup panjang untuk jaringan lambat, cukup
 *  pendek supaya voucher yang bocor tidak berumur panjang. */
const VOUCHER_TTL_DETIK = 600;

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
 * Kegagalan mengirim transaksi: bedakan "jaringan lambat" dari "relayer tidak
 * bisa dipakai". Keduanya 503 dan keduanya boleh dicoba lagi — yang berbeda
 * hanya kalimatnya, dan pengguna berhak tahu mana yang sedang terjadi.
 */
function kodeGalatRantai(err: unknown): KodeGalatKlaim {
  const pesan = err instanceof Error ? `${err.name} ${err.message}` : `${err}`;
  return /timeout|timed out|deadline/i.test(pesan)
    ? "CHAIN_TIMEOUT"
    : "RELAYER_UNAVAILABLE";
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
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

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

    const { data: w } = await supa
      .from("wallets")
      .select("address")
      .eq("user_id", uid)
      .maybeSingle();
    const wallet = w?.address as `0x${string}` | undefined;
    if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      // 409, bukan 400: permintaannya benar, keadaannya yang belum siap. Baris
      // `wallets` bisa memang belum ada saat embedded wallet Privy belum jadi.
      return tolak("WALLET_NOT_READY");
    }

    const { data: misiRow } = await supa
      .from("missions")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!misiRow) return tolak("MISSION_UNKNOWN");

    const nonce = nonceBaru();
    // Baris ditulis SEBELUM transaksi dikirim: indeks unik (user, misi,
    // periode) di 0017 inilah yang menghentikan klik ganda / dua tab menjadi
    // dua transaksi on-chain. Bentrok di sini = klaim sudah berjalan.
    const { data: klaimRow, error: errKlaim } = await supa
      .from("mission_claims")
      .insert({
        user_id: uid,
        mission_id: misiRow.id,
        amount_idmx: misi.reward,
        nonce: nonce.toString(),
        period_key: misi.periodKey,
        status: "signed",
      })
      .select("id")
      .single();
    if (errKlaim || !klaimRow) {
      const kode = kodeDariSqlstate(sqlstate(errKlaim));
      // Bentrok indeks periode adalah jalan kerja normal (dua tab, dua ketukan)
      // — bukan insiden. Sisanya dicatat LENGKAP dengan SQLSTATE-nya: kode
      // itulah yang membuat 22003 bisa dikenali dalam hitungan menit, bukan
      // hari, ketika kelas galat berikutnya muncul.
      if (kode !== "ALREADY_CLAIMED") {
        console.error(
          `[misi] insert klaim gagal (sqlstate=${sqlstate(errKlaim) ?? "-"}, kode=${kode}):`,
          errKlaim,
        );
      }
      return tolak(kode);
    }

    const voucher = {
      user: wallet,
      missionId: missionIdOnChain(code),
      amount: idmxKeWei(misi.reward),
      nonce,
      deadline: BigInt(Math.floor(Date.now() / 1000) + VOUCHER_TTL_DETIK),
      bucket: ikutCapHarian(misi.tipe) ? 0 : 1,
    };

    let tx;
    try {
      const signature = await tandatanganiVoucher(voucher);
      await supa
        .from("mission_claims")
        .update({ signature, status: "submitted" })
        .eq("id", klaimRow.id);
      tx = await tebusVoucher(voucher, signature);
    } catch (err) {
      // Ditandai failed supaya indeks unik (yang mengecualikan 'failed')
      // membebaskan misi ini untuk dicoba lagi.
      await supa
        .from("mission_claims")
        .update({ status: "failed" })
        .eq("id", klaimRow.id);
      const kode = kodeGalatRantai(err);
      console.error(`[misi] klaim gagal dikirim (kode=${kode}):`, err);
      return tolak(kode);
    }

    await supa
      .from("mission_claims")
      .update({
        tx_hash: tx.txHash,
        status: tx.confirmed ? "confirmed" : "submitted",
      })
      .eq("id", klaimRow.id);

    return NextResponse.json({
      ok: true,
      code,
      reward: misi.reward,
      txHash: tx.txHash,
      status: tx.confirmed ? "confirmed" : "submitted",
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
