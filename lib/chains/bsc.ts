/**
 * BNB Smart Chain — rumah token IDM Reborn dan kontrak SwapClaim (§10).
 *
 * Dipisah dari `lib/chains/opbnb.ts` karena memang jaringan yang berbeda:
 * IDMX hidup di opBNB, IDM Reborn di BSC, dan satu kontrak tidak bisa
 * menyentuh keduanya. Definisi ditulis tangan (bukan mengambil dari
 * `viem/chains`) supaya URL RPC bisa ditimpa lewat env — RPC publik bawaan
 * sering kena rate-limit saat relayer memindai log secara berkala.
 */

import { defineChain, type Chain } from "viem";

export const bsc: Chain = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_BSC_RPC_URL ||
          "https://bsc-dataseed.bnbchain.org",
      ],
    },
  },
  blockExplorers: {
    default: { name: "BscScan", url: "https://bscscan.com" },
  },
  testnet: false,
});

export const bscTestnet: Chain = defineChain({
  id: 97,
  name: "BNB Smart Chain Testnet",
  nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ||
          "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      ],
    },
  },
  blockExplorers: {
    default: { name: "BscScan Testnet", url: "https://testnet.bscscan.com" },
  },
  testnet: true,
});
