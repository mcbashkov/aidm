/**
 * Terjemahan galat Privy → kalimat Indonesia untuk layar masuk.
 *
 * Layar masuk adalah layar pertama yang dilihat pedagang, dan sejak alur
 * headless dipakai, TIDAK ADA lagi teks Privy yang muncul di sana — seluruh
 * kalimat, termasuk kalimat galat, lahir di berkas ini. Karena itu daftar di
 * bawah dipetakan dari `PrivyErrorCode` yang nyata, bukan dari pencocokan kata
 * pada pesan Inggris yang bisa berubah kapan saja tanpa pemberitahuan.
 */

import type { PrivyErrorCode } from "@privy-io/react-auth";

/**
 * Kode galat Privy sebagai NILAI — bukan tipe.
 *
 * `PrivyErrorCode` di SDK adalah `declare enum` yang diekspor TYPE-ONLY:
 * tidak ada objeknya di bundel. `import { PrivyErrorCode }` lolos typecheck
 * (TypeScript melihat sebuah enum) tapi bernilai `undefined` saat berjalan.
 * `next build` cuma menggerutu "Attempted import error" — peringatan, bukan
 * kesalahan, jadi ia lolos sampai produksi.
 *
 * Akibatnya setiap `case PrivyErrorCode.X` dulu membandingkan dengan
 * `undefined`, dan gagal DUA ARAH sekaligus:
 *
 *   · galat berkode nyata ("invalid_credentials") tidak cocok dengan apa pun →
 *     selalu jatuh ke kalimat cadangan yang tidak menolong siapa pun;
 *   · galat TANPA kode (`undefined`) justru cocok dengan case PERTAMA →
 *     kalimat spesifik yang SALAH, disampaikan dengan yakin. Orang yang
 *     jaringannya putus diberi tahu "alamat emailnya sepertinya keliru".
 *
 * Nilainya disalin dari `declare enum PrivyErrorCode`. Itu duplikasi, tapi
 * duplikasi yang jujur — alternatifnya bergantung pada sesuatu yang memang
 * tidak ada saat berjalan. `satisfies` menjadikannya duplikasi yang DIJAGA:
 * bila Privy mengganti salah satu string di versi berikutnya, `tsc` yang
 * gagal, bukan pengguna yang menerima kalimat keliru.
 */
const KODE = {
  ALLOWLIST_REJECTED: "allowlist_rejected",
  CLIENT_REQUEST_TIMEOUT: "client_request_timeout",
  DISALLOWED_LOGIN_METHOD: "disallowed_login_method",
  DISALLOWED_PLUS_EMAIL: "disallowed_plus_email",
  INVALID_CREDENTIALS: "invalid_credentials",
  INVALID_DATA: "invalid_data",
  LINKED_TO_ANOTHER_USER: "linked_to_another_user",
  OAUTH_ACCOUNT_SUSPENDED: "oauth_account_suspended",
  OAUTH_USER_DENIED: "oauth_user_denied",
  TOO_MANY_REQUESTS: "too_many_requests",
  USER_EXITED_AUTH_FLOW: "exited_auth_flow",
} as const satisfies Record<string, `${PrivyErrorCode}`>;

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
    kode === KODE.OAUTH_USER_DENIED ||
    kode === KODE.USER_EXITED_AUTH_FLOW
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
    case KODE.INVALID_DATA:
      return "Alamat emailnya sepertinya keliru. Coba periksa lagi.";
    case KODE.DISALLOWED_PLUS_EMAIL:
      return "Email dengan tanda + belum bisa dipakai. Coba alamat lain ya.";
    case KODE.TOO_MANY_REQUESTS:
      return "Terlalu banyak permintaan. Tunggu sebentar, lalu coba lagi.";
    case KODE.CLIENT_REQUEST_TIMEOUT:
      return "Kodenya belum terkirim — sambungan terputus. Coba lagi ya.";
    case KODE.ALLOWLIST_REJECTED:
      return "Email ini belum terdaftar untuk mencoba AIDM.";
    case KODE.DISALLOWED_LOGIN_METHOD:
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
    case KODE.INVALID_CREDENTIALS:
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
    case KODE.TOO_MANY_REQUESTS:
      return "Terlalu banyak percobaan. Tunggu sebentar, lalu minta kode baru.";
    case KODE.CLIENT_REQUEST_TIMEOUT:
      return "Jawabanmu belum sampai — sambungan terputus. Coba lagi ya.";
    default:
      return "Belum bisa memasukkanmu sekarang. Coba lagi sebentar lagi.";
  }
}

/** Kalimat untuk galat alur Google. */
export function pesanOauth(kode: unknown): string {
  switch (kode) {
    case KODE.OAUTH_ACCOUNT_SUSPENDED:
      return "Akun Google itu sedang dibekukan. Coba pakai email saja ya.";
    case KODE.DISALLOWED_LOGIN_METHOD:
      return "Masuk lewat Google sedang tidak tersedia. Pakai email saja ya.";
    case KODE.LINKED_TO_ANOTHER_USER:
      return "Akun Google itu sudah tertaut ke akun AIDM lain.";
    case KODE.TOO_MANY_REQUESTS:
      return "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.";
    case KODE.CLIENT_REQUEST_TIMEOUT:
      return "Sambungan ke Google terputus. Coba lagi ya.";
    default:
      // TIDAK pernah menawarkan modal Privy sebagai cadangan: jatuh ke layar
      // berbahasa Inggris justru merusak hal yang sedang diperbaiki di sini.
      return "Masuk lewat Google belum berhasil. Coba lagi, atau pakai email saja.";
  }
}
