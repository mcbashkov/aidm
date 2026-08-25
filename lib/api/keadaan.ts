/**
 * Tiga keadaan untuk data yang diambil dari server.
 *
 * Dua keadaan tidak pernah cukup. Layar yang hanya mengenal "belum ada data"
 * dan "ada data" akan memetakan KEGAGALAN ke keadaan kosong, dan di aplikasi
 * pembukuan keadaan kosong punya arti sendiri yang sangat spesifik: "kamu
 * belum pernah mencatat apa pun". Seorang pedagang di area sinyal lemah yang
 * membuka aplikasinya lalu membaca "Rp0 · Belum ada transaksi" tidak sedang
 * melihat kegagalan jaringan — ia sedang melihat kabar bahwa catatannya
 * hilang. Itu jauh lebih menakutkan daripada layar galat mana pun.
 *
 * `offline` disimpan DI DALAM keadaan gagal, bukan dibaca ulang dari
 * `navigator.onLine` saat render: jaringan bisa sudah pulih di antara saat
 * permintaan gagal dan saat pesannya digambar, dan pesan yang tidak cocok
 * dengan sebabnya lebih membingungkan daripada pesan umum.
 */
export type Keadaan<T> =
  | { keadaan: "memuat" }
  | { keadaan: "terbaca"; data: T }
  | { keadaan: "gagal"; offline: boolean };

/**
 * Kalimat untuk keadaan gagal.
 *
 * "Catatanmu aman tersimpan" bukan basa-basi penghalus. Ketakutan kehilangan
 * data adalah kerugian sesungguhnya dari bug ini, dan kalimat itu yang
 * menjawabnya langsung. Ia hanya dipakai untuk kasus offline karena di sanalah
 * kita benar-benar tahu datanya utuh di server — untuk kegagalan lain kita
 * tidak tahu apa yang terjadi, dan menjanjikan keamanan yang belum tentu benar
 * akan merusak kepercayaan yang justru sedang kita jaga.
 */
export function pesanGagal(offline: boolean): string {
  return offline
    ? "Kamu sedang offline. Catatanmu aman tersimpan — sambungkan internet untuk melihatnya."
    : "Belum bisa memuat datamu. Coba lagi ya.";
}
