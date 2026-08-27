/**
 * Konfigurasi Privy (auth + embedded wallet). App ID publik lewat env.
 * Saat App ID belum diisi (mode placeholder), aplikasi tetap jalan tanpa Privy
 * agar UI bisa didemokan; auth + wallet aktif begitu env diisi.
 */
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export const isPrivyConfigured = PRIVY_APP_ID.length > 0;

/**
 * Metode login yang diminta ke Privy. Harus SAMA dengan yang diaktifkan di
 * dashboard Privy — meminta metode yang belum aktif membuat Privy melempar
 * (mis. "Login with Google not allowed"). Bisa dipangkas lewat env tanpa ubah
 * kode saat sebuah metode belum siap, mis. `NEXT_PUBLIC_PRIVY_LOGIN_METHODS=email`.
 *
 * Urutan daftar ini TIDAK menentukan urutan tombol di modal Privy (itu urusan
 * `loginMethodsAndOrder`), tapi tetap ditulis Google dulu supaya kode terbaca
 * sesuai keputusan produk: Google utama, email cadangan.
 */
// `sms` DIBUANG 2026-08-27: `sms_auth: false` di dashboard Privy, dan meminta
// metode yang tidak aktif membuat Privy menolak saat metode itu dipilih.
// Jangan meminta yang tidak ada. Kembalikan ke sini bila SMS diaktifkan.
const DEFAULT_LOGIN_METHODS = ["google", "email"];

// `??` tidak cukup: env yang ada tapi KOSONG akan lolos jadi string kosong →
// daftar kosong → Privy melempar "You must enable at least one login method".
// Daftar hasil parse karenanya wajib divalidasi, bukan sekadar di-default.
const parsedLoginMethods = (process.env.NEXT_PUBLIC_PRIVY_LOGIN_METHODS ?? "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

export const PRIVY_LOGIN_METHODS =
  parsedLoginMethods.length > 0 ? parsedLoginMethods : DEFAULT_LOGIN_METHODS;
