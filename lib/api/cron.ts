import { timingSafeEqual } from "node:crypto";

/**
 * Otorisasi endpoint pemeliharaan yang dipanggil penjadwal/operator.
 *
 * Diangkat dari `app/api/relayer/tick/route.ts` supaya endpoint pemeliharaan
 * berikutnya memakai penjaga yang SAMA, bukan menyalin ulang perbandingannya —
 * salinan yang meleset sedikit di sini berarti pintu yang terbuka.
 */
export function cocokCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // Tanpa secret, endpoint DITUTUP — bukan dibuka. Server yang lupa mengisinya
  // tidak boleh berubah menjadi tombol yang bisa ditekan siapa saja.
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const dibawa = header.startsWith("Bearer ")
    ? header.slice(7)
    : (req.headers.get("x-cron-secret") ?? "");
  if (dibawa.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(dibawa), Buffer.from(secret));
}

/** 404, bukan 401: endpoint ini bukan milik publik, dan menjawab "salah
 *  secret" akan mengonfirmasi keberadaannya kepada pemindai. */
export const TIDAK_DITEMUKAN = { error: "not found" } as const;
