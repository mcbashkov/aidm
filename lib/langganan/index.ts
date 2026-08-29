/**
 * Langganan Premium — angka dan istilah yang dipakai server MAUPUN layar.
 *
 * Menggantikan Kredit AI. Alasannya bukan teknis: kredit menuntut pengguna
 * memahami empat hal sebelum memakai satu fitur (apa itu kredit, berapa
 * harganya, mana yang hangus, mana yang tidak). Langganan menuntut satu
 * keputusan.
 */

/** Rupiah per bulan. Angka terkunci — jangan diubah tanpa keputusan PO. */
export const HARGA_BULANAN_IDR = 49_000;

/** Hari yang ditambahkan sekali bayar. */
export const PERIODE_HARI = 30;

/** Masa coba untuk akun baru, sekali seumur akun. */
export const MASA_COBA_HARI = 7;

/**
 * Kuota wajar per bulan WIB.
 *
 * Ini PAGAR ANTI-ABUSE, bukan fitur yang dipamerkan. Pengguna normal tidak
 * boleh pernah merasakannya — pemakaian riset tertinggi sepanjang hidup
 * aplikasi di produksi adalah 4 dalam total, bukan per bulan. Karena itu
 * angkanya TIDAK ditampilkan sebagai penghitung di layar utama; ia hanya
 * muncul sebagai keterangan kecil di /premium, dan menonjol hanya ketika
 * seseorang benar-benar mendekati batas.
 */
export const KUOTA_BULANAN = {
  riset: 30,
  konten: 60,
} as const;

export type FiturPremium = keyof typeof KUOTA_BULANAN;

/** Ambang "mendekati batas" — di bawah ini sisanya baru layak disebut. */
export const AMBANG_PERINGATAN = 5;

export type StatusLangganan = "masa_coba" | "aktif" | "tidak_aktif";

export interface Langganan {
  status: StatusLangganan;
  /** ISO. `null` hanya untuk `tidak_aktif`. */
  berakhirAt: string | null;
  /** Masa coba sudah pernah dipakai — menentukan apakah tombol coba muncul. */
  cobaDipakai: boolean;
}

/** Boleh membuka Riset & Konten. Satu tempat, supaya UI dan server sepakat. */
export function premiumAktif(l: Langganan | null | undefined): boolean {
  return l?.status === "aktif" || l?.status === "masa_coba";
}

/** Sisa hari, dibulatkan ke atas — "berakhir 0 hari lagi" tidak masuk akal. */
export function sisaHari(l: Langganan | null | undefined): number | null {
  if (!l?.berakhirAt) return null;
  const ms = new Date(l.berakhirAt).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

export const HARGA_TAMPIL = "Rp49.000";
