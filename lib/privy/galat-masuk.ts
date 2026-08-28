/**
 * Terjemahan galat Privy → kalimat Indonesia untuk layar masuk.
 *
 * Layar masuk adalah layar pertama yang dilihat pedagang, dan sejak alur
 * headless dipakai, TIDAK ADA lagi teks Privy yang muncul di sana — seluruh
 * kalimat, termasuk kalimat galat, lahir di berkas ini. Karena itu daftar di
 * bawah dipetakan dari `PrivyErrorCode` yang nyata, bukan dari pencocokan kata
 * pada pesan Inggris yang bisa berubah kapan saja tanpa pemberitahuan.
 */

import { PrivyErrorCode } from "@privy-io/react-auth";

/** Batas keras Privy: satu kode OTP hanya boleh dicoba 5 kali. Sesudah itu
 *  kodenya mati dan harus diminta ulang. Angka ini dari dokumentasi
 *  `loginWithCode` di SDK, bukan tebakan — dan copy-nya wajib mengikutinya,
 *  kalau tidak pengguna akan mengetik ulang kode yang sudah tidak berlaku. */
export const MAKS_PERCOBAAN_KODE = 5;

/** Jeda sebelum kode boleh dikirim ulang. */
export const JEDA_KIRIM_ULANG_DETIK = 60;

/**
 * Pembatalan oleh pengguna sendiri BUKAN galat.
 *
 * Menutup jendela Google lalu disambut kotak merah membuat orang mengira ia
 * merusak sesuatu, padahal ia hanya berubah pikiran. Layar cukup kembali diam.
 */
export function pembatalanPengguna(kode: unknown): boolean {
  return (
    kode === PrivyErrorCode.OAUTH_USER_DENIED ||
    kode === PrivyErrorCode.USER_EXITED_AUTH_FLOW
  );
}

/** Kode galat dari objek galat Privy, apa pun bentuk lemparannya. */
export function kodeGalat(err: unknown): string | undefined {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    for (const k of ["type", "code", "privyErrorCode"] as const) {
      const v = (err as Record<string, unknown>)[k];
      if (typeof v === "string") return v;
    }
  }
  return undefined;
}

/** Kalimat untuk galat saat MEMINTA kode ke sebuah alamat email. */
export function pesanKirimKode(kode: unknown): string {
  switch (kode) {
    case PrivyErrorCode.INVALID_DATA:
      return "Alamat emailnya sepertinya keliru. Coba periksa lagi.";
    case PrivyErrorCode.DISALLOWED_PLUS_EMAIL:
      return "Email dengan tanda + belum bisa dipakai. Coba alamat lain ya.";
    case PrivyErrorCode.TOO_MANY_REQUESTS:
      return "Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.";
    case PrivyErrorCode.CLIENT_REQUEST_TIMEOUT:
      return "Kodenya belum terkirim — sambungan terputus. Coba lagi ya.";
    case PrivyErrorCode.ALLOWLIST_REJECTED:
      return "Email ini belum terdaftar untuk mencoba AIDM.";
    case PrivyErrorCode.DISALLOWED_LOGIN_METHOD:
      return "Masuk lewat email sedang tidak tersedia. Coba lagi nanti ya.";
    default:
      return "Kodenya belum bisa dikirim sekarang. Coba lagi sebentar lagi.";
  }
}

/**
 * Kalimat untuk galat saat MEMASUKKAN kode.
 *
 * `sisaPercobaan` disuntik pemanggil karena Privy tidak mengembalikan angkanya
 * — kita yang menghitung. Peringatan di percobaan terakhir sengaja ditampilkan
 * meski hitungan itu bisa meleset (mis. dua tab): kaget di percobaan kelima
 * lebih buruk daripada hitungan yang sesekali tidak tepat.
 */
export function pesanKode(kode: unknown, sisaPercobaan: number): string {
  switch (kode) {
    case PrivyErrorCode.INVALID_CREDENTIALS:
      // Privy tidak membedakan "kode salah" dari "kode kedaluwarsa" — keduanya
      // datang sebagai invalid_credentials. Kalimatnya karena itu tidak
      // mengaku tahu yang mana; tawaran kode baru menutup kedua kemungkinan.
      if (sisaPercobaan <= 0) {
        return "Kode ini sudah tidak berlaku. Minta kode baru ya.";
      }
      if (sisaPercobaan === 1) {
        return "Kodenya belum cocok. Sisa 1 percobaan sebelum kami kirim kode baru.";
      }
      return "Kodenya belum cocok. Coba periksa lagi.";
    case PrivyErrorCode.TOO_MANY_REQUESTS:
      return "Terlalu banyak percobaan. Tunggu sebentar, lalu minta kode baru.";
    case PrivyErrorCode.CLIENT_REQUEST_TIMEOUT:
      return "Jawabanmu belum sampai — sambungan terputus. Coba lagi ya.";
    default:
      return "Belum bisa memasukkanmu sekarang. Coba lagi sebentar lagi.";
  }
}

/** Kalimat untuk galat alur Google. */
export function pesanOauth(kode: unknown): string {
  switch (kode) {
    case PrivyErrorCode.OAUTH_ACCOUNT_SUSPENDED:
      return "Akun Google itu sedang dibekukan. Coba pakai email saja ya.";
    case PrivyErrorCode.DISALLOWED_LOGIN_METHOD:
      return "Masuk lewat Google sedang tidak tersedia. Pakai email saja ya.";
    case PrivyErrorCode.LINKED_TO_ANOTHER_USER:
      return "Akun Google itu sudah tertaut ke akun AIDM lain.";
    case PrivyErrorCode.TOO_MANY_REQUESTS:
      return "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.";
    case PrivyErrorCode.CLIENT_REQUEST_TIMEOUT:
      return "Sambungan ke Google terputus. Coba lagi ya.";
    default:
      // TIDAK pernah menawarkan modal Privy sebagai cadangan: jatuh ke layar
      // berbahasa Inggris justru merusak hal yang sedang diperbaiki di sini.
      return "Masuk lewat Google belum berhasil. Coba lagi, atau pakai email saja.";
  }
}
