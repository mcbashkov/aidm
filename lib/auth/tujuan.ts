/**
 * Tujuan setelah masuk — dipindahkan dari query string ke sessionStorage.
 *
 * Kenapa tidak boleh tinggal di query string: Privy mengirim
 * `window.location.href` APA ADANYA sebagai `redirect_to` ke `/oauth/init`
 * (default SDK bila `customOAuthRedirectUrl` tidak disetel), lalu mencocokkan
 * URL utuh itu dengan allowlist dashboard. Terbukti lewat probe terisolasi
 * (2026-08-27, PKCE segar, urutan diacak, hanya `redirect_to` yang berbeda):
 *
 *   ✅ 200  https://ai.idmtoken.com/masuk
 *   ❌ 401  https://ai.idmtoken.com/masuk?next=%2Fberanda   "Redirect URL is not allowed"
 *   ❌ 401  https://ai.idmtoken.com/masuk?apa=saja
 *   ❌ 401  https://ai.idmtoken.com/masuk#fragmen
 *
 * Query string APA PUN — dan fragmen apa pun — membuatnya tidak pernah cocok
 * dengan entri allowlist mana pun, termasuk wildcard. Karena `?next=` ditulis
 * middleware kita sendiri, satu-satunya perbaikan yang berumur panjang adalah
 * menyingkirkannya dari URL, bukan menambah entri allowlist yang tidak akan
 * pernah cocok.
 *
 * Membuangnya begitu saja dari middleware bukan pilihan: itu menghapus
 * kemampuan kembali ke halaman yang tadi dituju — orang yang membuka tautan ke
 * /laporan akan selalu mendarat di beranda.
 */

const KUNCI = "aidm_tujuan";
export const TUJUAN_BAWAAN = "/beranda";

/**
 * Path internal yang aman, atau `null`.
 *
 * Nilai ini datang dari query string, jadi ia adalah masukan yang tidak
 * dipercaya. Mengalihkan browser ke nilai mentah dari query adalah open
 * redirect — penyerang mengirimkan tautan `/masuk?next=//situs-palsu.com`,
 * korban melihat domain kita di bilah alamat, masuk, lalu dilempar ke situs
 * tiruan yang meminta kredensialnya lagi.
 *
 * Tiga saringan, dan ketiganya perlu:
 *   1. wajib diawali `/` — menolak `https://…` dan `javascript:…`;
 *   2. menolak `//` dan `/\` — keduanya dibaca browser sebagai URL
 *      protocol-relative menuju host lain, padahal diawali `/`;
 *   3. dibandingkan ulang lewat `new URL(...)` terhadap origin sekarang —
 *      jaring terakhir untuk bentuk aneh yang lolos dua saringan di atas.
 */
export function pathInternal(nilai: string | null | undefined): string | null {
  if (!nilai || nilai[0] !== "/") return null;
  if (nilai[1] === "/" || nilai[1] === "\\") return null;
  if (typeof window === "undefined") return null;
  try {
    const u = new URL(nilai, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    // Fragmen sengaja DIBUANG, bukan dipertahankan: ia tidak pernah dikirim
    // ke server, tidak membawa apa pun yang kita butuhkan, dan URL berfragmen
    // adalah salah satu bentuk yang ditolak Privy.
    return `${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

/**
 * Simpan `?next=` ke sessionStorage lalu BERSIHKAN URL-nya.
 *
 * Dipanggil saat layar masuk dimuat, sebelum pengguna sempat menekan apa pun.
 * Sejak `customOAuthRedirectUrl` dipatok di `lib/privy/provider.tsx`, URL
 * halaman tidak lagi menentukan `redirect_to` — pembersihan ini tinggal
 * kerapian: bilah alamat yang bersih, dan satu jalan buntu lebih sedikit bila
 * suatu saat ada jalur login lain yang kembali memakai `window.location.href`.
 */
export function simpanTujuanDariUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const tujuan = pathInternal(url.searchParams.get("next"));

  if (tujuan) {
    try {
      sessionStorage.setItem(KUNCI, tujuan);
    } catch {
      // Mode privat / storage diblokir. Bukan alasan menggagalkan login —
      // pengguna hanya akan mendarat di beranda alih-alih halaman tujuannya.
    }
  }

  // HANYA `next` yang dibuang — JANGAN pernah mengosongkan seluruh query.
  //
  // Privy mengembalikan pengguna dari Google ke URL ini membawa
  // `privy_oauth_code`, `privy_oauth_provider`, dan `privy_oauth_state` di
  // query string. Efek komponen anak berjalan SEBELUM efek provider di
  // atasnya, jadi `url.search = ""` di sini akan menghapus ketiganya sebelum
  // SDK sempat membacanya — memutus alur yang justru sedang diperbaiki.
  const adaNext = url.searchParams.has("next");
  if (adaNext || url.hash) {
    url.searchParams.delete("next");
    url.hash = "";
    window.history.replaceState(null, "", url.toString());
  }
}

/**
 * Ambil tujuan SEKALI PAKAI. Selalu mengembalikan path yang sah.
 *
 * Dihapus segera setelah dibaca: nilai yang tertinggal akan memantulkan
 * pengguna ke halaman yang ia tuju sesi lalu — tujuan yang benar sekali,
 * lalu salah selamanya.
 */
export function ambilTujuan(): string {
  if (typeof window === "undefined") return TUJUAN_BAWAAN;
  let tersimpan: string | null = null;
  try {
    tersimpan = sessionStorage.getItem(KUNCI);
    sessionStorage.removeItem(KUNCI);
  } catch {
    /* storage diblokir — jatuh ke bawaan */
  }
  return pathInternal(tersimpan) ?? TUJUAN_BAWAAN;
}
