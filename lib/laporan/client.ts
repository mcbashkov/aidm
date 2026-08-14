/**
 * Pembungkus klien untuk API laporan (§11). Seluruh angka datang jadi dari
 * server — layar tidak pernah menjumlah transaksi sendiri (§7.3).
 */

import { panggil, type ApiHasil } from "@/lib/api/panggil";
import type { LaporanResponse } from "@/lib/laporan/types";

export function ambilLaporan(
  period: string,
): Promise<ApiHasil<LaporanResponse>> {
  return panggil(`/api/laporan?period=${encodeURIComponent(period)}`);
}

/** URL unduhan PDF periode (§11 GET /api/laporan/pdf). */
export function urlPdfLaporan(period: string): string {
  return `/api/laporan/pdf?period=${encodeURIComponent(period)}`;
}
