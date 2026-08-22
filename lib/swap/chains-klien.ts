/**
 * Peta id → Chain untuk sisi klien.
 *
 * Klien TIDAK BOLEH menentukan sendiri chain mana yang dipakai fitur Tukar —
 * lihat alasan lengkapnya di app/api/swap/config/route.ts. Yang boleh ia
 * lakukan hanya menerjemahkan nomor chain dari server menjadi objek Chain,
 * dan objek itu aman dibangun di browser karena URL RPC-nya memang berawalan
 * `NEXT_PUBLIC_`.
 */

import type { Chain } from "viem";
import { opbnb, opbnbTestnet } from "@/lib/chains/opbnb";
import { bsc, bscTestnet } from "@/lib/chains/bsc";

const SEMUA: Chain[] = [opbnb, opbnbTestnet, bsc, bscTestnet];

export function chainDariId(id: number | undefined | null): Chain | null {
  if (typeof id !== "number") return null;
  return SEMUA.find((c) => c.id === id) ?? null;
}
