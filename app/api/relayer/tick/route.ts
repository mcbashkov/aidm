import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isRelayerConfigured, jalankanTick } from "@/lib/swap/relayer-server";
import { cocokCronSecret, TIDAK_DITEMUKAN } from "@/lib/api/cron";

export const runtime = "nodejs";
// Satu tick memindai log lintas ribuan blok lalu menandatangani; anggaran
// waktunya diatur di lib/swap/relayer-server.ts, ini hanya pagar luarnya.
export const maxDuration = 60;
// Endpoint ini MEMBACA RANTAI dan MENULIS DB — tidak boleh dilayani dari cache.
export const dynamic = "force-dynamic";

/**
 * POST/GET /api/relayer/tick — satu putaran relayer swap (§7.7 / §10).
 *
 * Bentuknya endpoint yang dipanggil penjadwal, BUKAN proses websocket 24/7,
 * karena aplikasi ini hidup di Vercel (serverless) — tidak ada proses panjang
 * untuk ditumpangi. Pemicunya boleh apa saja yang bisa memanggil URL tiap
 * menit: Vercel Cron, GitHub Actions, cron-job.org. Kodenya identik.
 *
 * Latensi ~1 menit memang terlihat user, dan itu jujur ditampilkan UI sebagai
 * "Diproses → Siap diklaim".
 */
async function tick(req: Request) {
  if (!cocokCronSecret(req)) {
    return NextResponse.json(TIDAK_DITEMUKAN, { status: 404 });
  }

  if (!isRelayerConfigured()) {
    return NextResponse.json(
      { error: "Relayer swap belum dikonfigurasi di server ini." },
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
    const hasil = await jalankanTick(supa);
    // Dicatat supaya "relayer diam" bisa dibedakan dari "relayer tidak jalan"
    // saat menelusuri keluhan burn yang belum jadi voucher.
    if (hasil.voucherBaru || hasil.voucherDiperpanjang || hasil.ditandaiTertebus) {
      console.log("[relayer] tick:", JSON.stringify(hasil));
    }
    return NextResponse.json({ ok: true, ...hasil });
  } catch (err) {
    // Kursor hanya maju setelah voucher tersimpan, jadi kegagalan di sini
    // berarti tick berikutnya memindai ulang rentang yang sama — tidak ada
    // burn yang terlewat karena satu tick gagal.
    console.error("[relayer] tick gagal:", err);
    return NextResponse.json(
      { error: "Tick relayer gagal." },
      { status: 500 },
    );
  }
}

export const POST = tick;
// GET ikut dilayani karena sebagian penjadwal (Vercel Cron di antaranya) hanya
// bisa mengirim GET. Otorisasinya sama persis.
export const GET = tick;
