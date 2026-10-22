/**
 * BNB Smart Chain — rumah token IDM Reborn dan kontrak SwapClaim (§10).
 *
 * Dipisah dari `lib/chains/opbnb.ts` karena memang jaringan yang berbeda:
 * IDMX hidup di opBNB, IDM Reborn di BSC, dan satu kontrak tidak bisa
 * menyentuh keduanya. Definisi ditulis tangan (bukan mengambil dari
 * `viem/chains`) supaya URL RPC bisa ditimpa lewat env — RPC publik bawaan
 * sering kena rate-limit saat relayer memindai log secara berkala.
 *
 * SEMUA endpoint di bawah berjalan di port 443. Endpoint lama
 * `data-seed-prebsc-1-s1.bnbchain.org:8545` sengaja DIBUANG: port 8545 lazim
 * difilter jaringan seluler, dan itulah sebab sheet Tukar gagal membaca BSC
 * testnet dari HP sementara di PC (WiFi) berjalan — permintaan dari browser
 * tidak pernah sampai. Daftar resmi (batas 10K permintaan / 5 menit per
 * endpoint):
 * https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/
 */

import { defineChain, type Chain } from "viem";
import { daftarRpc } from "@/lib/chains/rpc";

export const BSC_RPC_RESMI = [
  "https://bsc-dataseed.bnbchain.org",
  "https://bsc-dataseed-public.bnbchain.org",
  "https://bsc-dataseed.defibit.io",
] as const;

export const BSC_TESTNET_RPC_RESMI = [
  "https://bsc-testnet-dataseed.bnbchain.org",
  "https://bsc-testnet.bnbchain.org",
  // Cadangan ketiga dari PublicNode, bukan `bsc-prebsc-dataseed.bnbchain.org`:
  // host itu memang terdaftar di dokumentasi BNB, tetapi hanya pada :8545 —
  // di port 443 ia menjawab 503 (diperiksa dua kali, 2026-10-22). Entri yang
  // selalu gagal bukan cadangan, cuma satu lapis timeout sebelum cadangan
  // sungguhan. Ketiganya dipastikan menjawab eth_chainId 0x61 lewat 443.
  "https://bsc-testnet.publicnode.com",
] as const;

export const bsc: Chain = defineChain({
  id: 56,
  name: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: {
    default: {
      http: daftarRpc(process.env.NEXT_PUBLIC_BSC_RPC_URL, BSC_RPC_RESMI),
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
      http: daftarRpc(
        process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL,
        BSC_TESTNET_RPC_RESMI,
      ),
    },
  },
  blockExplorers: {
    default: { name: "BscScan Testnet", url: "https://testnet.bscscan.com" },
  },
  testnet: true,
});
