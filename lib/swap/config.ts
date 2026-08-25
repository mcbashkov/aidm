/**
 * Konstanta publik fitur Tukar (§7.7 / §10). TANPA rahasia — berkas ini boleh
 * diimpor dari mana saja, termasuk komponen klien. Kunci penandatangan voucher
 * hidup HANYA di `lib/swap/relayer-server.ts`.
 *
 * Alur yang dilayani berkas ini melintasi dua jaringan:
 *
 *   opBNB · SwapInitiator.swap()  → IDMX dibakar, event SwapRequested
 *   (relayer menandatangani voucher untuk nonce event itu)
 *   BSC   · SwapClaim.claim()     → IDM Reborn dibayar, fee 1 IDM dibakar
 *
 * Karena itu ada DUA chain resolver di bawah, dan keduanya bisa berbeda fase
 * dari chain default aplikasi — persis seperti segel dan misi.
 */

import { parseAbi, type Chain } from "viem";
import { envPertama } from "@/lib/env";
import { opbnb, opbnbTestnet, DEFAULT_CHAIN } from "@/lib/chains/opbnb";
import { bsc, bscTestnet } from "@/lib/chains/bsc";

/** ABI minimal — hanya yang dipakai runtime, ditulis tangan supaya tidak
 *  bergantung pada artefak hasil kompilasi. */
export const SWAP_INITIATOR_ABI = parseAbi([
  "function swap(uint256 idmxAmount)",
  "function MIN_SWAP() view returns (uint256)",
  "function weeklyCap() view returns (uint256)",
  "function remainingWeeklyAllowance(address user) view returns (uint256)",
  "function paused() view returns (bool)",
  "event SwapRequested(address indexed user, uint256 idmxAmount, uint256 indexed nonce, uint256 timestamp)",
]);

/**
 * IDMX dari sisi klien. `approve` ada di sini karena SwapInitiator membakar
 * lewat `burnFrom` — tanpa izin dari pemiliknya, `swap()` akan revert. Itu
 * sebabnya alur Tukar selalu dua tanda tangan pada pemakaian pertama.
 */
export const IDMX_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
]);

export const SWAP_CLAIM_ABI = parseAbi([
  "struct SwapVoucher { address user; uint256 idmxBurned; uint256 nonce; uint64 deadline; }",
  "function claim((address,uint256,uint256,uint64) v, bytes signature)",
  "function nonceUsed(uint256 nonce) view returns (bool)",
  "function rateIdmxPerIdm() view returns (uint256)",
  "function maxIdmxPerVoucher() view returns (uint256)",
  "function paused() view returns (bool)",
  "function FEE_IDM() view returns (uint256)",
]);

/**
 * Chain sisi burn (IDMX). Mengikuti chain kontrak reward, karena IDMX yang
 * dibakar di sini adalah IDMX yang sama yang dibayarkan misi — keduanya wajib
 * berada di jaringan yang sama atau alurnya patah.
 */
export function swapBurnChain(): Chain {
  const pilihan = envPertama("AIDM_REWARD_CHAIN", "AIDM_SEAL_CHAIN");
  if (pilihan === "opbnb") return opbnb;
  if (pilihan === "opbnb-testnet") return opbnbTestnet;
  return DEFAULT_CHAIN;
}

/**
 * Chain sisi klaim (IDM Reborn). Kosongkan `AIDM_SWAP_CHAIN` dan fase BSC
 * mengikuti fase opBNB otomatis (testnet↔testnet, mainnet↔mainnet) — pasangan
 * yang salah fase berarti voucher ditandatangani untuk kontrak yang tidak ada.
 */
export function swapClaimChain(): Chain {
  const pilihan = process.env.AIDM_SWAP_CHAIN;
  if (pilihan === "bsc") return bsc;
  if (pilihan === "bsc-testnet") return bscTestnet;
  return swapBurnChain().testnet ? bscTestnet : bsc;
}

function alamat(nilai: string | undefined): `0x${string}` | null {
  return nilai && /^0x[0-9a-fA-F]{40}$/.test(nilai)
    ? (nilai as `0x${string}`)
    : null;
}

export function swapInitiatorAddress(): `0x${string}` | null {
  return alamat(process.env.NEXT_PUBLIC_SWAP_INITIATOR_ADDRESS);
}

export function swapClaimAddress(): `0x${string}` | null {
  return alamat(process.env.NEXT_PUBLIC_SWAP_CLAIM_ADDRESS);
}

export function idmRebornAddress(): `0x${string}` | null {
  return alamat(process.env.NEXT_PUBLIC_IDM_REBORN_ADDRESS);
}

/** IDMX di opBNB — token yang dibakar, sekaligus yang saldonya tampil di
 *  kartu wallet. */
export function idmxAddress(): `0x${string}` | null {
  return alamat(process.env.NEXT_PUBLIC_IDMX_ADDRESS);
}

/** Kedua kaki kontrak sudah nyata? Selama false, UI Tukar nonaktif dan API
 *  menjawab 501 — pola "string tidak kosong" yang dipakai segel & misi. */
export function isSwapConfigured(): boolean {
  return swapInitiatorAddress() !== null && swapClaimAddress() !== null;
}

/** URL explorer sisi burn (opBNB) untuk sebuah tx. */
export function explorerBurnTxUrl(txHash: string): string {
  const base = swapBurnChain().blockExplorers?.default.url ?? "";
  return base ? `${base}/tx/${txHash}` : "";
}

/** URL explorer sisi klaim (BSC) untuk sebuah tx. */
export function explorerClaimTxUrl(txHash: string): string {
  const base = swapClaimChain().blockExplorers?.default.url ?? "";
  return base ? `${base}/tx/${txHash}` : "";
}
