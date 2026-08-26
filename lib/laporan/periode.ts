/**
 * Batas periode laporan dalam zona WIB (§17.2 "semua tanggal WIB").
 *
 * Satu sumber kebenaran untuk SEMUA rentang periode di aplikasi. Alasannya
 * bukan sekadar hemat baris: laporan menggabungkan dua sumber berbeda —
 * `daily_rollups` (berkolom `date` WIB) untuk ringkasan/grafik dan
 * `transactions` (berkolom `timestamptz`) untuk rincian kategori. Bila kedua
 * sumber memakai definisi "30 hari" yang sedikit berbeda, total kategori tidak
 * akan sama dengan total ringkasan di layar yang sama — persis yang dilarang
 * AC §7.3 ("ringkasan, grafik, kategori konsisten").
 *
 * Karena itu batas selalu dihitung sebagai TANGGAL WIB dulu, lalu diturunkan
 * jadi ISO dengan offset +07:00. Kedua sumber membaca garis potong yang sama.
 */

import { todayWib } from "@/lib/wib";

/** Rentang tanggal WIB; `end` EKSKLUSIF. `null` = tanpa batas di sisi itu. */
export interface RentangTanggal {
  start: string | null;
  end: string | null;
}

/** Geser tanggal YYYY-MM-DD sebanyak n hari (aritmetika kalender, bukan ms). */
export function geserHari(tanggal: string, n: number): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Awal bulan berikutnya dari kunci 'YYYY-MM'. */
function bulanBerikutnya(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

export const HARI_30D = 30;

/** Batas tanggal WIB untuk sebuah nilai `period` (§7.3 #1). */
export function rentangTanggal(period: string, now = new Date()): RentangTanggal {
  if (/^\d{4}-\d{2}$/.test(period)) {
    return { start: `${period}-01`, end: bulanBerikutnya(period) };
  }
  const hariIni = todayWib(now);
  if (period === "30d") {
    // 30 hari kalender WIB TERMASUK hari ini — bukan "sekarang dikurangi 30×24
    // jam". Jendela bergerak per jam membuat angka laporan berubah sendiri
    // sepanjang hari tanpa transaksi baru.
    return { start: geserHari(hariIni, -(HARI_30D - 1)), end: geserHari(hariIni, 1) };
  }
  if (period === "today") {
    return { start: hariIni, end: geserHari(hariIni, 1) };
  }
  return { start: null, end: null }; // 'semua'
}

/** Periode pembanding (kartu naik/turun §7.3 #2): jendela sepanjang & tepat
 *  sebelum periode terpilih. `null` bila periode tak punya pembanding. */
export function rentangSebelumnya(
  period: string,
  now = new Date(),
): RentangTanggal | null {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split("-").map(Number);
    const prev =
      m === 1
        ? `${y - 1}-12`
        : `${y}-${String(m - 1).padStart(2, "0")}`;
    return { start: `${prev}-01`, end: `${period}-01` };
  }
  const kini = rentangTanggal(period, now);
  if (!kini.start) return null;
  if (period === "30d") {
    return { start: geserHari(kini.start, -HARI_30D), end: kini.start };
  }
  if (period === "today") {
    return { start: geserHari(kini.start, -1), end: kini.start };
  }
  return null;
}

/** Tengah malam WIB sebuah tanggal sebagai ISO — batas untuk kolom timestamptz. */
export function isoAwalHariWib(tanggal: string): string {
  return `${tanggal}T00:00:00+07:00`;
}

/** Batas ISO untuk query `transactions` — diturunkan dari batas tanggal yang
 *  sama persis dengan yang dipakai `daily_rollups`. */
export function rentangIso(
  period: string,
  now = new Date(),
): { start?: string; end?: string } {
  const { start, end } = rentangTanggal(period, now);
  return {
    ...(start ? { start: isoAwalHariWib(start) } : {}),
    ...(end ? { end: isoAwalHariWib(end) } : {}),
  };
}

/** Tanggal 1 pada bulan yang memuat `tanggal`. */
export function awalBulan(tanggal: string): string {
  return `${tanggal.slice(0, 7)}-01`;
}

/** Geser awal-bulan sebanyak n bulan (n boleh negatif). */
export function geserBulan(tanggalAwalBulan: string, n: number): string {
  const [y, m] = tanggalAwalBulan.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

const BULAN_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "14 Agustus 2026" dari 'YYYY-MM-DD'. Sengaja memotong STRING, bukan lewat
 *  `new Date()`: tanggal WIB yang diformat dengan zona server bisa mundur
 *  sehari di mesin berzona negatif — dan tanggal itu tercetak di laporan bank. */
export function formatTanggalWib(tanggal: string): string {
  const [y, m, d] = tanggal.split("-");
  return `${Number(d)} ${BULAN_ID[Number(m) - 1]} ${y}`;
}

/** Label periode untuk judul layar & kop PDF — termasuk jendela bergulir yang
 *  tidak punya nama bulan ("16 Juli – 14 Agustus 2026"). */
export function labelPeriode(period: string, now = new Date()): string {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split("-").map(Number);
    return `${BULAN_ID[m - 1]} ${y}`;
  }
  const { start, end } = rentangTanggal(period, now);
  if (!start || !end) return "Semua periode";
  const akhir = geserHari(end, -1); // `end` eksklusif → hari terakhir sebenarnya
  return start === akhir
    ? formatTanggalWib(start)
    : `${formatTanggalWib(start)} – ${formatTanggalWib(akhir)}`;
}

/**
 * Boleh disegel? (§7.5) — hanya periode BULANAN yang sudah lewat sepenuhnya.
 * Bulan berjalan dan jendela bergulir ('30d') tidak, karena angkanya masih
 * bisa bertambah dan segel harus mengikat laporan yang final.
 */
export function bolehSegel(period: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}$/.test(period)) return false;
  return bulanBerikutnya(period) <= todayWib(now);
}
