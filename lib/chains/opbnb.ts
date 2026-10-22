import { defineChain, type Chain } from "viem";
import { daftarRpc } from "@/lib/chains/rpc";

/**
 * Jaringan default AIDM = opBNB (§9.1, §16 #9): gas sangat murah, ditanggung
 * treasury untuk klaim misi; tukar & withdraw dibayar user. Token IDM Reborn
 * tetap di BSC (jalur lintas-chain difinalkan sebelum M4).
 *
 * URL RPC berupa daftar (env di depan, resmi sebagai cadangan) — alasannya di
 * lib/chains/rpc.ts. Endpoint resmi:
 * https://docs.bnbchain.org/bnb-opbnb/get-started/network-info/
 */

export const OPBNB_RPC_RESMI = [
  "https://opbnb-mainnet-rpc.bnbchain.org",
  "https://opbnb.publicnode.com",
] as const;

export const OPBNB_TESTNET_RPC_RESMI = [
  "https://opbnb-testnet-rpc.bnbchain.org",
  "https://opbnb-testnet.publicnode.com",
] as const;

export const opbnb: Chain = defineChain({
  id: 204,
  name: "opBNB",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: daftarRpc(process.env.NEXT_PUBLIC_OPBNB_RPC_URL, OPBNB_RPC_RESMI),
    },
  },
  blockExplorers: {
    default: { name: "opBNBScan", url: "https://opbnb.bscscan.com" },
  },
  testnet: false,
});

export const opbnbTestnet: Chain = defineChain({
  id: 5611,
  name: "opBNB Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: daftarRpc(
        process.env.NEXT_PUBLIC_OPBNB_TESTNET_RPC_URL,
        OPBNB_TESTNET_RPC_RESMI,
      ),
    },
  },
  blockExplorers: {
    default: {
      name: "opBNBScan Testnet",
      url: "https://opbnb-testnet.bscscan.com",
    },
  },
  testnet: true,
});

export const SUPPORTED_CHAINS = [opbnb, opbnbTestnet] as const;

/** Chain default aktif — dikontrol NEXT_PUBLIC_DEFAULT_CHAIN (opbnb | opbnb-testnet). */
export const DEFAULT_CHAIN: Chain =
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN === "opbnb-testnet"
    ? opbnbTestnet
    : opbnb;
