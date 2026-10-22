/**
 * Nama pendek (slug) untuk keempat jaringan yang dikenal aplikasi, dipakai
 * sebagai segmen URL proxy RPC same-origin (`/api/rpc/<slug>`, Batch 8) dan
 * sebagai kunci env penyedia RPC sisi server.
 *
 * Aman diimpor dari klien: hanya menarik definisi chain (URL `NEXT_PUBLIC_*`),
 * tidak membaca env server.
 */

import type { Chain } from "viem";
import { opbnb, opbnbTestnet } from "@/lib/chains/opbnb";
import { bsc, bscTestnet } from "@/lib/chains/bsc";

export type SlugRantai = "opbnb" | "opbnb-testnet" | "bsc" | "bsc-testnet";

export const RANTAI: Record<SlugRantai, Chain> = {
  opbnb,
  "opbnb-testnet": opbnbTestnet,
  bsc,
  "bsc-testnet": bscTestnet,
};

export function slugSah(s: string): s is SlugRantai {
  return s === "opbnb" || s === "opbnb-testnet" || s === "bsc" || s === "bsc-testnet";
}

export function slugDariChainId(id: number): SlugRantai | null {
  for (const slug of Object.keys(RANTAI) as SlugRantai[]) {
    if (RANTAI[slug].id === id) return slug;
  }
  return null;
}
