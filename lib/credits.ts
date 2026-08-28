import type { SupabaseClient } from "@supabase/supabase-js";
import { todayWib } from "@/lib/wib";
import { getCreditParams } from "@/lib/config";

/**
 * Operasi kredit di atas ledger append-only (§7.5 / §10). Saldo = SUM(amount).
 *
 * Seluruh perubahan saldo dikerjakan di dalam Postgres (migrasi 0024), bukan di
 * sini. Alasannya bukan selera: menghitung saldo di Node berarti membaca, lalu
 * memutuskan, lalu menulis — tiga langkah dengan dua celah di antaranya. Dua
 * permintaan bersamaan sama-sama melihat saldo lama dan sama-sama memotong
 * penuh. Fungsi Postgres memegang kunci per-user selama ketiganya, sehingga
 * "baca, putuskan, tulis" menjadi satu langkah yang tidak bisa disela.
 *
 * Pola pembebanan tidak berubah: "charge-on-success" — kredit dipotong hanya
 * saat query berhasil (cache/segar); gagal total = tidak dipotong (AC §7.2).
 */

/** Nilai balikan RPC yang seharusnya angka. Bukan angka = ada yang salah di
 *  jalur data, dan menerjemahkannya jadi 0 berarti melaporkan "kamu kehabisan
 *  kredit" untuk sesuatu yang sebenarnya gangguan server. */
function angka(nilai: unknown, fungsi: string): number {
  if (typeof nilai === "number" && Number.isFinite(nilai)) return nilai;
  throw new Error(`${fungsi} mengembalikan nilai bukan angka: ${String(nilai)}`);
}

/**
 * Saldo kredit user.
 *
 * MELEMPAR bila pembacaan gagal — sengaja. Versi sebelumnya menelan galat dan
 * mengembalikan 0, sehingga satu hiccup database membuat `/api/research`
 * menjawab 402 "Kredit tidak cukup": angka yang salah, disampaikan sebagai
 * fakta tentang uang pengguna. Kegagalan harus terbaca sebagai kegagalan
 * (kontrak tiga-keadaan §P0-1), bukan menyamar jadi saldo kosong.
 */
export async function getBalance(
  supa: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supa.rpc("kredit_saldo", { p_user: userId });
  if (error) throw error;
  return angka(data, "kredit_saldo");
}

/** Beri kredit gratis harian sekali per hari WIB (idempoten). Return saldo. */
export async function ensureDailyFree(
  supa: SupabaseClient,
  userId: string,
): Promise<number> {
  const params = await getCreditParams();
  // Hari dikirim dari `lib/wib.ts`, bukan dihitung ulang di SQL: batas hari WIB
  // punya SATU definisi di aplikasi ini, dan indeks unik yang menegakkan
  // idempotensi mengunci kolom yang sama.
  const { data, error } = await supa.rpc("kredit_harian", {
    p_user: userId,
    p_hari: todayWib(),
    p_jumlah: params.daily_free,
  });
  if (error) throw error;
  return angka(data, "kredit_harian");
}

/**
 * Potong kredit untuk pekerjaan yang SUDAH terkirim.
 *
 * Tidak menolak saat saldo kurang, dan itu disengaja: pemanggilnya adalah
 * charge-on-success, jadi risetnya sudah berjalan dan sudah membakar uang API.
 * Menolak potongan di titik ini berarti menyerahkan barangnya gratis. Saldo
 * boleh menembus nol satu kali lewat balapan; pagar SEBELUM kerja di
 * `app/api/research/route.ts` yang menghentikan permintaan berikutnya.
 */
export async function charge(
  supa: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  refId?: string,
): Promise<number> {
  const { data, error } = await supa.rpc("kredit_potong", {
    p_user: userId,
    p_jumlah: amount,
    p_alasan: reason,
    p_ref: refId ?? null,
  });
  if (error) throw error;
  return angka(data, "kredit_potong");
}
