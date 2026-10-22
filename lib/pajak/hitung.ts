/**
 * Pajak OP — perhitungan murni (PERINTAH-AGEN-PREMIUM §Batch 9).
 *
 * Dasar: PP 20/2026 — PPh Final 0,5% untuk WP orang pribadi tanpa batas
 * waktu; bagian peredaran bruto sampai dengan Rp500 juta dalam satu tahun
 * pajak tidak dikenai PPh; setor paling lambat tanggal 15 bulan berikutnya.
 *
 * Yang dihitung di sini HANYA aritmetika atas omzet per bulan yang sudah
 * dijumlahkan database (`laporan_bulanan`, pemasukan confirmed). Tidak ada
 * Date, tidak ada zona waktu: bulan adalah string 'YYYY-MM' WIB persis seperti
 * yang disimpan. Tidak ada NPWP, tidak ada identitas. Bukan nasihat pajak —
 * setiap layar yang menampilkannya wajib memuat kalimat itu.
 */

export const BATAS_BEBAS_IDR = 500_000_000;
/** 0,5% — PP 20/2026. */
export const TARIF_PPH_FINAL = 0.005;
/** Setoran paling lambat tanggal 15 bulan berikutnya. */
export const TANGGAL_SETOR = 15;

export const KALIMAT_BUKAN_NASIHAT =
  "Bukan nasihat pajak. Cocokkan dengan Coretax atau konsultan pajak.";

export interface OmzetBulan {
  /** 'YYYY-MM' */
  bulan: string;
  /** Pemasukan confirmed bulan itu (rupiah bulat). */
  omzet: number;
}

export interface BarisPajak {
  bulan: string;
  omzet: number;
  /** Kumulatif sejak Januari tahun pajak itu, termasuk bulan ini. */
  kumulatif: number;
  /** Bulan ini sudah berada di atas batas bebas (seluruhnya atau sebagian). */
  kenaPph: boolean;
  /** Bagian omzet bulan ini yang kena: pada bulan terlampaui hanya selisih
   *  di atas Rp500 juta; bulan-bulan berikutnya seluruh omzet. */
  dasarKena: number;
  /** round(dasarKena × 0,5%). */
  setoran: number;
  /** 'YYYY-MM-15' bulan berikutnya — hanya bila setoran > 0. */
  jatuhTempo: string | null;
}

export interface HasilPajak {
  tahun: number;
  omzetTahun: number;
  batasBebas: number;
  /** Kumulatif tahun ini sudah di atas batas bebas. */
  melewati: boolean;
  /** Bulan pertama kumulatif melewati batas, atau null. */
  bulanMelewati: string | null;
  /** Dua belas baris Januari–Desember; bulan tanpa catatan bernilai 0. */
  bulanan: BarisPajak[];
  totalSetoran: number;
}

export function geserBulan(bulan: string, n: number): string {
  const [y, m] = bulan.split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  const ty = Math.floor(idx / 12);
  const tm = (idx % 12) + 1;
  return `${ty}-${String(tm).padStart(2, "0")}`;
}

/** Dua belas baris pajak untuk satu tahun pajak dari omzet per bulan. */
export function hitungPajak(tahun: number, omzetBulanan: OmzetBulan[]): HasilPajak {
  const peta = new Map<string, number>();
  for (const b of omzetBulanan) {
    if (!b.bulan.startsWith(`${tahun}-`)) continue;
    peta.set(b.bulan, (peta.get(b.bulan) ?? 0) + Math.max(0, Math.round(b.omzet)));
  }
  const bulanan: BarisPajak[] = [];
  let kumulatif = 0;
  let bulanMelewati: string | null = null;
  let totalSetoran = 0;
  for (let m = 1; m <= 12; m++) {
    const bulan = `${tahun}-${String(m).padStart(2, "0")}`;
    const omzet = peta.get(bulan) ?? 0;
    const sebelum = kumulatif;
    kumulatif += omzet;
    let dasarKena = 0;
    if (kumulatif > BATAS_BEBAS_IDR) {
      // Bagian di atas batas: pada bulan terlampaui hanya selisihnya.
      dasarKena = sebelum >= BATAS_BEBAS_IDR ? omzet : kumulatif - BATAS_BEBAS_IDR;
      if (bulanMelewati === null) bulanMelewati = bulan;
    }
    const kenaPph = dasarKena > 0;
    const setoran = kenaPph ? Math.round(dasarKena * TARIF_PPH_FINAL) : 0;
    totalSetoran += setoran;
    bulanan.push({
      bulan,
      omzet,
      kumulatif,
      kenaPph,
      dasarKena,
      setoran,
      jatuhTempo: setoran > 0 ? `${geserBulan(bulan, 1)}-${TANGGAL_SETOR}` : null,
    });
  }
  return {
    tahun,
    omzetTahun: kumulatif,
    batasBebas: BATAS_BEBAS_IDR,
    melewati: bulanMelewati !== null,
    bulanMelewati,
    bulanan,
    totalSetoran,
  };
}

export interface Pengingat {
  /** Bulan pajak yang setorannya jatuh tempo ('YYYY-MM'). */
  bulanPajak: string;
  setoran: number;
  /** 'YYYY-MM-15' */
  jatuhTempo: string;
  /** Hari tersisa sampai jatuh tempo (0 = hari ini). */
  sisaHari: number;
}

/**
 * Pengingat setoran: tampil tanggal 1–15 untuk bulan pajak sebelumnya bila
 * setorannya > 0. `hasil` harus untuk tahun pajak bulan sebelumnya (pemanggil
 * yang memilih; Januari menunjuk Desember tahun lalu).
 */
export function pengingatSetoran(hasil: HasilPajak, hariIniWib: string): Pengingat | null {
  const bulanIni = hariIniWib.slice(0, 7);
  const tanggal = Number(hariIniWib.slice(8, 10));
  if (!Number.isFinite(tanggal) || tanggal > TANGGAL_SETOR) return null;
  const bulanPajak = geserBulan(bulanIni, -1);
  const baris = hasil.bulanan.find((b) => b.bulan === bulanPajak);
  if (!baris || baris.setoran <= 0 || !baris.jatuhTempo) return null;
  return {
    bulanPajak,
    setoran: baris.setoran,
    jatuhTempo: baris.jatuhTempo,
    sisaHari: TANGGAL_SETOR - tanggal,
  };
}

/** "Rp1.234.567" tanpa desimal. */
export function formatRp(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}
