/**
 * Chip personal untuk tab Catat (§7.2 alur #7, perluasan 2026-10-22).
 *
 * Chip contoh per peran (lib/earner.ts) mengajari cara memakai fitur; chip
 * PERSONAL mengulang apa yang pengguna sendiri pernah ucapkan — "Jual 3 nasi
 * goreng 45rb bayar QRIS" kemarin tinggal diketuk hari ini. Satu ketukan =
 * satu catatan, persis gerakan yang menaikkan metrik utara (transaksi
 * tercatat/hari), tanpa satu pun panggilan AI tambahan.
 *
 * Modul ini murni fungsi dan TANPA impor React/lucide, karena dipakai di dua
 * sisi: route handler (menyusun daftarnya dari `raw_input`) dan komponen
 * Catat (menggabungkannya dengan chip contoh).
 */

/** Lebih panjang dari ini bukan lagi contoh yang bisa dipindai, melainkan
 *  paragraf — chip-nya akan melebar menutupi baris. */
export const CHIP_MAKS_KARAKTER = 48;

/** Berapa chip personal yang ditampilkan di depan chip contoh. */
export const CHIP_PERSONAL_MAKS = 3;

/**
 * Pilih kalimat yang layak jadi chip dari daftar `raw_input`, TERBARU DULU
 * (daftar masuk dalam urutan kronologis naik; yang terakhir diucapkan tampil
 * paling depan). Duplikat dibuang tanpa memandang kapital/spasi.
 */
export function chipPersonal(
  kalimat: ReadonlyArray<string | null | undefined>,
  maks = CHIP_PERSONAL_MAKS,
): string[] {
  const hasil: string[] = [];
  const terlihat = new Set<string>();
  for (let i = kalimat.length - 1; i >= 0 && hasil.length < maks; i--) {
    const teks = (kalimat[i] ?? "").replace(/\s+/g, " ").trim();
    if (!teks || teks.length > CHIP_MAKS_KARAKTER) continue;
    const kunci = teks.toLowerCase();
    if (terlihat.has(kunci)) continue;
    terlihat.add(kunci);
    hasil.push(teks);
  }
  return hasil;
}

/** Personal di depan, lalu contoh yang belum terwakili oleh personal. */
export function gabungChips(
  personal: ReadonlyArray<string>,
  contoh: ReadonlyArray<string>,
): string[] {
  const ada = new Set(personal.map((c) => c.toLowerCase()));
  return [...personal, ...contoh.filter((c) => !ada.has(c.toLowerCase()))];
}
