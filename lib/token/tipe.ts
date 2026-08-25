/**
 * Keadaan saldo IDMX di layar.
 *
 * Tiga keadaan, bukan dua. Sebelumnya "belum dimuat" dan "tidak bisa dibaca"
 * sama-sama tampil sebagai "—", sehingga pengguna tidak punya cara membedakan
 * aplikasi yang sedang bekerja dari aplikasi yang sudah menyerah — dan pesan
 * kegagalan sempat terbaca padahal fetch-nya masih berjalan.
 *
 * Aturan yang mengikat: pesan gagal HANYA boleh muncul setelah permintaan
 * benar-benar selesai dan gagal. Selama `memuat`, layar diam dan bergerak
 * (shimmer), tidak menuduh apa pun.
 */
export type SaldoIdmx =
  | { keadaan: "memuat" }
  | { keadaan: "terbaca"; nilai: number }
  | { keadaan: "gagal" };

/** Jawaban GET /api/wallet/saldo. `null` = server tidak bisa memastikan. */
export interface SaldoResponse {
  idmx: number | null;
}
