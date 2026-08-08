import { defineChain, type Chain } from "viem";

/**
 * Jaringan default AIDM = opBNB (§9.1, §16 #9): gas sangat murah, ditanggung
 * treasury untuk klaim misi; tukar & withdraw dibayar user. Token IDM Reborn
 * tetap di BSC (jalur lintas-chain difinalkan sebelum M4).
 */

export const opbnb: Chain = defineChain({
  id: 204,
  name: "opBNB",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_OPBNB_RPC_URL ||
          "https://opbnb-mainnet-rpc.bnbchain.org",
      ],
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
      http: [
        process.env.NEXT_PUBLIC_OPBNB_TESTNET_RPC_URL ||
          "https://opbnb-testnet-rpc.bnbchain.org",
      ],
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
