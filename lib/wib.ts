/**
 * Batas hari WIB — SATU tempat, dipakai server maupun klien.
 *
 * Seluruh aplikasi ini berjalan di atas satu keputusan: **hari adalah hari
 * WIB**, di mana pun servernya berdiri dan di zona mana pun perangkat
 * penggunanya disetel. Laporan bulanan, progres misi harian, cap IDMX harian,
 * kuota mencatat, dan pengelompokan Riwayat semuanya memakai batas yang sama —
 * dan angka-angka itu saling dibandingkan pengguna. Batas yang bergeser di
 * salah satunya tidak akan tampil sebagai galat; ia tampil sebagai "misi harian
 * saya tidak bertambah padahal sudah mencatat", keluhan yang mahal ditelusuri.
 *
 * Sebelum berkas ini ada, rumus `+ 7 jam` disalin di tujuh tempat lintas
 * delapan berkas. Ketujuhnya kebetulan masih identik saat disatukan (diperiksa
 * satu per satu, 2026-08-26) — tapi "kebetulan masih identik" adalah jaminan
 * yang habis masa berlakunya pada penyuntingan berikutnya.
 *
 * Kenapa offset tetap +7 dan bukan `Intl`/`toLocaleString('Asia/Jakarta')`:
 * WIB tidak pernah mengenal daylight saving dan tidak berubah sejak 1988, jadi
 * aritmetika epoch memberi jawaban yang sama dengan basis zona waktu tanpa
 * bergantung pada data ICU yang bisa berbeda antar runtime.
 */

/** WIB = UTC+7, tetap sepanjang tahun. */
export const WIB_OFFSET_MS = 7 * 3600_000;

/**
 * Tanggal hari ini menurut WIB, `YYYY-MM-DD`.
 *
 * Bekerja dari epoch, jadi hasilnya tidak bergantung zona server maupun zona
 * perangkat — hanya pada jam yang benar.
 */
export function todayWib(now = new Date()): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Kunci bulan WIB, `YYYY-MM`. */
export function bulanWib(now = new Date()): string {
  return todayWib(now).slice(0, 7);
}

/**
 * Tengah malam WIB hari berjalan sebagai ISO UTC — batas untuk membandingkan
 * kolom `timestamptz` (kuota harian, kredit gratis harian).
 */
export function wibDayStartIso(now = new Date()): string {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  const startUtcMs =
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) -
    WIB_OFFSET_MS;
  return new Date(startUtcMs).toISOString();
}
