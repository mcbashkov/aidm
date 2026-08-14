/**
 * Bentuk data laporan (§7.3). Dipakai bersama oleh tiga pihak: route
 * `GET /api/laporan` yang menghasilkannya, komponen layar Laporan yang
 * menampilkannya, dan dataset mock yang meniru bentuknya untuk mode demo.
 *
 * Nama field-nya camelCase (bukan snake_case seperti sebagian body API lain)
 * karena objek ini langsung dipakai komponen — sama seperti `Transaction`
 * yang sudah dinormalkan di `rowToTx`.
 */

export interface Ringkasan {
  masuk: number;
  keluar: number;
  sisa: number;
  jmlTransaksi: number;
  hariAktif: number;
  masukTerverifikasi: number;
  rasioTerverifikasi: number; // 0..1 dari nilai pemasukan
}

export interface TitikHarian {
  tanggal: string; // YYYY-MM-DD (WIB)
  masuk: number;
  keluar: number;
}

export interface BarisKategori {
  slug: string;
  nama: string;
  total: number;
  persen: number; // 0..1
}

export interface SealState {
  status: "belum" | "pending" | "tersegel";
  hash?: string;
  txHash?: string;
  sealedAt?: string;
}

/** Body `GET /api/laporan?period=` (§11). */
export interface LaporanResponse {
  period: string;
  kini: Ringkasan;
  sebelumnya: Ringkasan | null;
  series: TitikHarian[];
  masuk: BarisKategori[];
  keluar: BarisKategori[];
  segel: SealState;
  bolehSegel: boolean;
  bulanTercatat: number;
}

/** Bulan catatan yang dibutuhkan sebelum kartu valuasi terbuka (§7.9). */
export const VALUASI_BUTUH_BULAN = 6;

export const RINGKASAN_KOSONG: Ringkasan = {
  masuk: 0,
  keluar: 0,
  sisa: 0,
  jmlTransaksi: 0,
  hariAktif: 0,
  masukTerverifikasi: 0,
  rasioTerverifikasi: 0,
};
