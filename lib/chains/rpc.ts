/**
 * Daftar URL RPC untuk satu chain.
 *
 * Setiap chain di `lib/chains/*` mendeklarasikan RPC-nya sebagai DAFTAR, bukan
 * satu alamat: entri pertama adalah env (bila terisi) atau endpoint resmi
 * utama, sisanya cadangan. Pemakai `http()` polos dan Privy hanya membaca
 * entri pertama — perilaku lama tidak berubah — sedangkan `publicClient()` di
 * lib/swap/client.ts memakai seluruh daftar lewat `fallback()`.
 *
 * Kenapa perlu cadangan, dicatat dari kejadian nyata (2026-10-22): sheet Tukar
 * gagal di HP ("Gagal membaca data dari jaringan") sementara di PC berjalan.
 * Pembacaan kontrak dari browser menembak SATU endpoint publik; dari jaringan
 * seluler endpoint itu bisa tidak terjangkau sama sekali — port non-standar
 * difilter operator, atau rate-limit per IP terpakai habis oleh ribuan
 * pengguna di balik satu IP CGNAT — sementara endpoint resmi lain normal.
 *
 * Aturan "string tidak kosong" (.env.local.example) ikut ditegakkan di sini:
 * env yang ada tapi kosong diperlakukan sebagai tidak ada.
 */
export function daftarRpc(
  env: string | undefined,
  resmi: readonly string[],
): string[] {
  const dariEnv = (env ?? "").trim();
  if (!dariEnv) return [...resmi];
  // Env di depan; endpoint resmi tetap ikut sebagai cadangan, tanpa duplikat.
  return [dariEnv, ...resmi.filter((u) => u !== dariEnv)];
}
