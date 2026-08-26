/**
 * Pembungkus klien untuk API misi (§11). Progres selalu datang dari server —
 * layar tidak pernah menghitung kelayakan reward sendiri.
 */

import { panggil, type ApiHasil } from "@/lib/api/panggil";
import type { MisiResponse } from "@/lib/missions";

export function ambilMisi(): Promise<ApiHasil<MisiResponse>> {
  return panggil("/api/missions");
}

/**
 * Jawaban klaim sejak batch B: server hanya MENCATAT niat, tidak menunggu
 * rantai. Tidak ada `txHash` di sini karena pada detik ini ia memang belum
 * ada — relayer cron yang mengirimnya, dan hash-nya muncul lewat GET
 * /api/missions saat sudah nyata.
 */
export interface HasilKlaimMisi {
  ok: boolean;
  code: string;
  reward: number;
  status: "diproses";
}

export function klaimMisi(code: string): Promise<ApiHasil<HasilKlaimMisi>> {
  return panggil("/api/missions/klaim", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
