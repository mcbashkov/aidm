/**
 * Pembungkus klien untuk API misi (§11). Progres selalu datang dari server —
 * layar tidak pernah menghitung kelayakan reward sendiri.
 */

import { panggil, type ApiHasil } from "@/lib/api/panggil";
import type { MisiResponse } from "@/lib/missions";

export function ambilMisi(): Promise<ApiHasil<MisiResponse>> {
  return panggil("/api/missions");
}

export interface HasilKlaimMisi {
  ok: boolean;
  code: string;
  reward: number;
  txHash: string;
  status: "confirmed" | "submitted";
}

export function klaimMisi(code: string): Promise<ApiHasil<HasilKlaimMisi>> {
  return panggil("/api/missions/klaim", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
