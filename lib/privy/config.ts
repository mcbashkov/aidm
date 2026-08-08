/**
 * Konfigurasi Privy (auth + embedded wallet). App ID publik lewat env.
 * Saat App ID belum diisi (mode placeholder), aplikasi tetap jalan tanpa Privy
 * agar UI bisa didemokan; auth + wallet aktif begitu env diisi.
 */
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export const isPrivyConfigured = PRIVY_APP_ID.length > 0;
