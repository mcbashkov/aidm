import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isRelayerConfigured, jalankanTick } from "@/lib/swap/relayer-server";
import { jalankanTickMisi } from "@/lib/missions/relayer";
import { isKlaimConfigured } from "@/lib/missions/klaim-server";
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

  if (!isRelayerConfigured() && !isKlaimConfigured()) {
    return NextResponse.json(
      { error: "Relayer belum dikonfigurasi di server ini." },
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

  // Dua pekerjaan, satu tick, BERURUTAN — bukan `Promise.all`. Keduanya
  // memakai anggaran waktu yang sama, dan menjalankannya paralel hanya
  // menambah beban RPC bersamaan tanpa menyelesaikan apa pun lebih cepat.
  //
  // Keduanya juga sengaja tidak saling menjatuhkan: swap yang gagal tidak
  // boleh menghentikan klaim misi, dan sebaliknya. Kegagalan masing-masing
  // dicatat pada tempatnya, dan tick berikutnya mengulang bagiannya sendiri.
  const keluar: Record<string, unknown> = { ok: true };
  // Satu invokasi, satu `maxDuration` (60 detik), dua pekerjaan. Tenggat kirim
  // misi dihitung dari awal permintaan — bukan dari saat gilirannya tiba —
  // supaya tick swap yang lambat memakan jatahnya sendiri, bukan jatah misi.
  const mulaiTick = Date.now();

  if (isRelayerConfigured()) {
    try {
      const hasil = await jalankanTick(supa);
      // Dicatat supaya "relayer diam" bisa dibedakan dari "relayer tidak
      // jalan" saat menelusuri keluhan burn yang belum jadi voucher.
      if (hasil.voucherBaru || hasil.voucherDiperpanjang || hasil.ditandaiTertebus) {
        console.log("[relayer] tick swap:", JSON.stringify(hasil));
      }
      Object.assign(keluar, hasil);
    } catch (err) {
      // Kursor hanya maju setelah voucher tersimpan, jadi kegagalan di sini
      // berarti tick berikutnya memindai ulang rentang yang sama — tidak ada
      // burn yang terlewat karena satu tick gagal.
      console.error("[relayer] tick swap gagal:", err);
      keluar.swapGagal = true;
    }
  }

  if (isKlaimConfigured()) {
    try {
      const misi = await jalankanTickMisi(supa, mulaiTick + 45_000);
      if (misi.dikirim || misi.gagalKirim || misi.dikonfirmasi || misi.dipulihkan) {
        console.log("[relayer] tick misi:", JSON.stringify(misi));
      }
      keluar.misi = misi;
    } catch (err) {
      console.error("[relayer] tick misi gagal:", err);
      keluar.misiGagal = true;
    }
  }

  return NextResponse.json(keluar);
}

export const POST = tick;
// GET ikut dilayani karena sebagian penjadwal (Vercel Cron di antaranya) hanya
// bisa mengirim GET. Otorisasinya sama persis.
export const GET = tick;
