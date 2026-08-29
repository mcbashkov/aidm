import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cocokCronSecret, TIDAK_DITEMUKAN } from "@/lib/api/cron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Satu jalan memusnahkan paling banyak BATAS baris; itu jauh di bawah batas
// waktu mana pun. Angkanya dipasang longgar hanya untuk melindungi dari
// database yang sedang lambat, bukan karena pekerjaannya berat.
export const maxDuration = 60;

/**
 * Retensi `raw_input` (§12 privasi · §16 #10, diputuskan 2026-08-14).
 *
 * Kalimat asli pengguna hidup 90 hari, lalu dianonimkan: `raw_input` dihapus,
 * entri transaksi terstruktur dipertahankan. Halaman Kebijakan Privasi sudah
 * memberi tahu pengguna bahwa ini terjadi — endpoint inilah yang membuatnya
 * benar-benar terjadi.
 */
const RETENSI_HARI = 90;

/**
 * Berapa banyak baris per jalan. Dibatasi supaya satu pemanggilan tidak pernah
 * menjadi transaksi panjang yang mengunci tabel catat. Penjadwalnya harian,
 * jadi tumpukan sebesar apa pun habis dalam hitungan hari — dan tumpukan besar
 * hanya mungkin lahir dari cron yang mati berminggu-minggu, keadaan yang
 * memang seharusnya terlihat di angka `sisa` di bawah, bukan disembunyikan
 * dengan menghapus semuanya sekaligus.
 */
const BATAS_PER_JALAN = 5000;

/**
 * POST/GET /api/pemeliharaan/purge — satu putaran pemeliharaan harian:
 * pemusnahan `raw_input` yang lewat retensi + penyapuan langganan kedaluwarsa.
 *
 * Bentuknya endpoint berpenjadwal, sama seperti `/api/relayer/tick`, dengan
 * alasan yang sama: aplikasi ini hidup di Vercel dan tidak punya proses
 * panjang untuk ditumpangi. Penjaganya juga sama persis (`cocokCronSecret`),
 * bukan salinannya — pintu pemeliharaan yang perbandingannya ditulis ulang
 * di tiap berkas adalah pintu yang cepat atau lambat akan meleset.
 */
async function purge(req: Request) {
  if (!cocokCronSecret(req)) {
    return NextResponse.json(TIDAK_DITEMUKAN, { status: 404 });
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

  // Langganan yang lewat tanggal diturunkan ke 'tidak_aktif'. Ini KEBERSIHAN,
  // bukan penegakan: `statusLangganan()` sudah memperlakukan tanggal yang lewat
  // sebagai tidak aktif pada saat dibaca, jadi hak akses tidak pernah menunggu
  // cron berikutnya. Yang dikerjakan di sini hanya merapikan barisnya.
  let langgananDisapu: number | null = null;
  const { data: sapu, error: errSapu } = await supa.rpc(
    "langganan_sapu_kedaluwarsa",
  );
  if (errSapu) {
    // Tidak menggagalkan seluruh tick: purge `raw_input` punya tenggat hukum
    // sendiri dan tidak boleh berhenti karena pekerjaan lain tersandung.
    console.error("[pemeliharaan] sapu langganan gagal:", errSapu);
  } else {
    langgananDisapu = typeof sapu === "number" ? sapu : 0;
  }

  const { data, error } = await supa.rpc("purge_raw_input", {
    p_hari: RETENSI_HARI,
    p_batas: BATAS_PER_JALAN,
  });
  if (error) {
    console.error("[purge] raw_input gagal:", error);
    return NextResponse.json(
      { error: "Pemusnahan gagal dijalankan." },
      { status: 500 },
    );
  }

  const dihapus = typeof data === "number" ? data : 0;

  // Sisa yang masih lewat tenggat. Dilaporkan supaya "cron jalan tapi tidak
  // pernah selesai" bisa dibedakan dari "memang sudah bersih" — keduanya sama
  // sama menghasilkan dihapus=0 pada jalan berikutnya.
  const batas = new Date(
    Date.now() - RETENSI_HARI * 86_400_000,
  ).toISOString();
  const { count: sisa } = await supa
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .not("raw_input", "is", null)
    .lt("created_at", batas);

  if (dihapus > 0 || (sisa ?? 0) > 0) {
    console.log(
      `[purge] raw_input: ${dihapus} dimusnahkan, ${sisa ?? "?"} masih lewat ${RETENSI_HARI} hari`,
    );
  }

  return NextResponse.json({
    ok: true,
    retensiHari: RETENSI_HARI,
    dihapus,
    sisa: sisa ?? null,
    langgananDisapu,
  });
}

export const POST = purge;
// GET ikut dilayani karena sebagian penjadwal (Vercel Cron di antaranya) hanya
// bisa mengirim GET. Otorisasinya sama persis.
export const GET = purge;
