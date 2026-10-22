/** Label bulan/periode Berkas — murni, dipakai PDF (server) dan UI (klien). */

export const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function labelBulan(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${NAMA_BULAN[m - 1]} ${y}`;
}

/** "April–September 2026" atau "Oktober 2025–Maret 2026". */
export function labelRentang(awal: string, akhir: string): string {
  const [ya, ma] = awal.split("-").map(Number);
  const [yb, mb] = akhir.split("-").map(Number);
  if (ya === yb) return `${NAMA_BULAN[ma - 1]}–${NAMA_BULAN[mb - 1]} ${ya}`;
  return `${NAMA_BULAN[ma - 1]} ${ya}–${NAMA_BULAN[mb - 1]} ${yb}`;
}

export function labelStatusBerkas(status: string): string {
  switch (status) {
    case "confirmed": return "Siap diunduh · ternotarisasi";
    case "dibuat": return "Siap diunduh";
    case "pending_segel": return "Siap diunduh · notarisasi diproses";
    case "gagal": return "Sedang disiapkan";
    default: return "Menunggu pembayaran";
  }
}
