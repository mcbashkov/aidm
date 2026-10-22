/**
 * Peta id → Chain untuk sisi klien, dengan RPC lewat proxy same-origin.
 *
 * Klien TIDAK BOLEH menentukan sendiri chain mana yang dipakai fitur Tukar —
 * lihat alasan lengkapnya di app/api/swap/config/route.ts. Yang boleh ia
 * lakukan hanya menerjemahkan nomor chain dari server menjadi objek Chain.
 *
 * Sejak Batch 8, objek Chain untuk browser menaruh `/api/rpc/<slug>` di depan
 * daftar RPC-nya: pembacaan dan pengiriman dari dompet berjalan same-origin
 * (kunci penyedia tetap di server, alamat pengguna tidak bocor ke penyedia
 * publik, satu pagar laju untuk semua tab), sementara daftar endpoint publik
 * tetap ikut sebagai cadangan terakhir bila proxy tidak terjangkau.
 */

import type { Chain } from "viem";
import { RANTAI, slugDariChainId } from "@/lib/chains/slug";

/** Origin aplikasi: `window` di browser; `NEXT_PUBLIC_APP_URL` saat SSR. */
export function asalAplikasi(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");
}

export function urlProxyRpc(chainId: number): string | null {
  const slug = slugDariChainId(chainId);
  return slug ? `${asalAplikasi()}/api/rpc/${slug}` : null;
}

/** Chain yang sama, dengan proxy same-origin di depan daftar RPC-nya. */
export function denganProxy(chain: Chain): Chain {
  const proxy = urlProxyRpc(chain.id);
  if (!proxy) return chain;
  const asli = chain.rpcUrls.default.http;
  return {
    ...chain,
    rpcUrls: {
      ...chain.rpcUrls,
      default: {
        ...chain.rpcUrls.default,
        http: [proxy, ...asli.filter((u) => u !== proxy)],
      },
    },
  };
}

export function chainDariId(id: number | undefined | null): Chain | null {
  if (typeof id !== "number") return null;
  const slug = slugDariChainId(id);
  return slug ? denganProxy(RANTAI[slug]) : null;
}
