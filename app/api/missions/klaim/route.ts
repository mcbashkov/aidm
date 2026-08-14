import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { evaluasiMisi } from "@/lib/missions/server";
import { ikutCapHarian } from "@/lib/missions";
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
  if (!code) {
    return NextResponse.json({ error: "Misi tidak dikenal." }, { status: 400 });
  }

  if (!isKlaimConfigured()) {
    return NextResponse.json(
      { error: "Klaim on-chain belum dikonfigurasi di server ini." },
      { status: 501 },
    );
  }

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
    if (!misi) {
      return NextResponse.json({ error: "Misi tidak dikenal." }, { status: 400 });
    }
    if (!misi.selesai) {
      return NextResponse.json(
        { error: "Misi ini belum selesai." },
        { status: 400 },
      );
    }
    if (misi.diklaim) {
      return NextResponse.json(
        { error: "Misi ini sudah diklaim untuk periode ini." },
        { status: 409 },
      );
    }
    if (misi.alasanTerkunci) {
      return NextResponse.json({ error: misi.alasanTerkunci }, { status: 429 });
    }

    const { data: w } = await supa
      .from("wallets")
      .select("address")
      .eq("user_id", uid)
      .maybeSingle();
    const wallet = w?.address as `0x${string}` | undefined;
    if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
      return NextResponse.json(
        { error: "Akun belum punya wallet — masuk ulang untuk membuatnya." },
        { status: 400 },
      );
    }

    const { data: misiRow } = await supa
      .from("missions")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!misiRow) {
      return NextResponse.json({ error: "Misi tidak aktif." }, { status: 400 });
    }

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
      if (`${errKlaim?.code}`.startsWith("23")) {
        return NextResponse.json(
          { error: "Misi ini sudah diklaim untuk periode ini." },
          { status: 409 },
        );
      }
      throw errKlaim ?? new Error("insert klaim gagal");
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
      console.error("[misi] klaim gagal:", err);
      return NextResponse.json(
        { error: "Klaim gagal dikirim ke jaringan. Coba lagi ya." },
        { status: 502 },
      );
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
    console.error("[misi] klaim gagal:", err);
    return NextResponse.json(
      { error: "Gagal mengklaim misi. Coba lagi ya." },
      { status: 500 },
    );
  }
}
