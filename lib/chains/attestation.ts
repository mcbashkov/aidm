/**
 * Konstanta publik kontrak ReportAttestation (§9.4). TANPA rahasia — berkas
 * ini boleh diimpor dari mana saja (route PDF, verify publik, UI). Kunci
 * relayer hidup HANYA di lib/laporan/segel-server.ts.
 */

import { keccak256, parseAbi, stringToBytes, type Chain } from "viem";
import { opbnb, opbnbTestnet, DEFAULT_CHAIN } from "@/lib/chains/opbnb";

/** ABI minimal — hanya fungsi yang dipakai runtime, ditulis tangan supaya
 *  tidak bergantung pada artefak hasil kompilasi. */
export const REPORT_ATTESTATION_ABI = parseAbi([
  "function attestFor(address user, bytes32 periodKey, bytes32 reportHash)",
  "function verify(address user, bytes32 periodKey, bytes32 reportHash) view returns (bool ok, uint64 sealedAt)",
  "event Sealed(address indexed user, bytes32 indexed periodKey, bytes32 reportHash, uint64 sealedAt)",
]);

/**
 * Chain tempat kontrak segel hidup. Selama M4 kontrak ada di TESTNET sementara
 * app default mainnet — karena itu dipisah dari NEXT_PUBLIC_DEFAULT_CHAIN
 * lewat AIDM_SEAL_CHAIN (server-side; PDF & route segel dirender server).
 */
export function sealChain(): Chain {
  const pilihan = process.env.AIDM_SEAL_CHAIN;
  if (pilihan === "opbnb") return opbnb;
  if (pilihan === "opbnb-testnet") return opbnbTestnet;
  return DEFAULT_CHAIN;
}

/** Alamat kontrak, atau null bila belum di-deploy (M4 belum jalan). */
export function attestationAddress(): `0x${string}` | null {
  const a = process.env.NEXT_PUBLIC_REPORT_ATTESTATION_ADDRESS;
  return a && /^0x[0-9a-fA-F]{40}$/.test(a) ? (a as `0x${string}`) : null;
}

/** periodKey on-chain = keccak256 dari string periode (§9.4:
 *  `keccak("2026-08")`). */
export function periodKeyBytes32(period: string): `0x${string}` {
  return keccak256(stringToBytes(period));
}

/** URL explorer untuk sebuah tx di chain segel. */
export function explorerTxUrl(txHash: string): string {
  const base = sealChain().blockExplorers?.default.url ?? "";
  return base ? `${base}/tx/${txHash}` : "";
}
