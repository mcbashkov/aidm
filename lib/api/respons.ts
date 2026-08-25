import { NextResponse } from "next/server";

/**
 * Header untuk respons yang berisi data milik satu pengguna.
 *
 * `private` — melarang cache bersama (CDN, proxy kantor) menyimpannya sama
 * sekali. Tanpa ini, satu lapisan perantara bisa menyajikan laporan keuangan
 * seorang pedagang kepada pedagang lain yang kebetulan lewat jalur yang sama.
 *
 * `no-store` — melarang penyimpanan di mana pun, termasuk disk browser. Lebih
 * keras daripada `no-cache` (yang masih menyimpan, hanya wajib bertanya dulu).
 * Yang kita hindari bukan cuma respons basi, tapi keberadaan salinannya.
 *
 * `max-age=0` — pengaman untuk perantara lawas yang mengabaikan `no-store`.
 *
 * Ketiganya sengaja tidak bergantung pada service worker: `app/sw.ts` memang
 * sudah menetapkan `NetworkOnly` untuk seluruh `/api/*`, tapi header ini tetap
 * berlaku di browser tanpa service worker, di mode samaran, dan di setiap
 * perantara antara server dan perangkat.
 */
export const HEADER_DATA_PRIBADI = {
  "Cache-Control": "private, no-store, max-age=0",
} as const;

/**
 * `NextResponse.json` untuk data milik pengguna.
 *
 * Ada sebagai satu fungsi supaya aturannya tidak perlu diingat ulang di tiap
 * titik `return`. Route yang mengembalikan angka uang WAJIB memakai ini, bukan
 * `NextResponse.json` langsung — termasuk untuk jawaban galat, karena pesan
 * galat pun bisa membocorkan ada-tidaknya sebuah akun.
 */
export function jsonPribadi(
  data: unknown,
  init?: { status?: number },
): NextResponse {
  return NextResponse.json(data as never, {
    ...init,
    headers: HEADER_DATA_PRIBADI,
  });
}
