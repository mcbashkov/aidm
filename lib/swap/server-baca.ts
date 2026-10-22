/**
 * Pembacaan keadaan kontrak Tukar di SISI SERVER (Batch 8) untuk
 * `GET /api/swap/keadaan`.
 *
 * Dulu kedelapan angka dibaca dari browser; dari jaringan seluler satu
 * endpoint publik bisa tidak terjangkau dan sheet hanya bisa berkata "gagal
 * membaca". Server membacanya lewat daftar upstream yang sama dengan proxy
 * (kunci berbayar di depan, resmi sebagai cadangan), lalu meng-cache 10 detik
 * per alamat: cukup pendek untuk "segar pada detik tombol ditekan", cukup
 * panjang supaya buka-tutup sheet beruntun tidak memukul RPC berulang.
 *
 * Kedua kaki dibaca TERPISAH dan masing-masing membawa statusnya: yang
 * terbaca ditampilkan apa adanya, yang gagal disebut namanya. Kegagalan tidak
 * di-cache — "Coba lagi" harus benar-benar membaca ulang.
 */

import { createPublicClient, fallback, http, type Chain, type PublicClient } from "viem";
import { slugDariChainId } from "@/lib/chains/slug";
import { RPC_TIMEOUT_UPSTREAM_MS, upstreamUntuk } from "@/lib/rpc/proxy";
import {
  idmxAddress,
  swapBurnChain,
  swapClaimAddress,
  swapClaimChain,
  swapInitiatorAddress,
} from "@/lib/swap/config";
import { bacaKeadaanKlaim, bacaKeadaanSwap } from "@/lib/swap/client";
import type { KeadaanSwapRespons, KakiBsc, KakiOpbnb } from "@/lib/swap/tipe";

const CACHE_MS = 10_000;

/** Klien baca-saja sisi server: upstream server (bukan proxy sendiri). */
export function publicClientServer(chain: Chain): PublicClient {
  const slug = slugDariChainId(chain.id);
  const urls = slug ? upstreamUntuk(slug) : [...chain.rpcUrls.default.http];
  return createPublicClient({
    chain,
    transport: fallback(
      urls.map((u) => http(u, { timeout: RPC_TIMEOUT_UPSTREAM_MS, retryCount: 1 })),
    ),
  });
}

const cacheOpbnb = new Map<string, { sampai: number; nilai: KakiOpbnb }>();
let cacheBsc: { sampai: number; nilai: KakiBsc } | null = null;

function pesanGalat(err: unknown, nama: string): string {
  const m = err instanceof Error ? err.message : "";
  return /timeout|timed out/i.test(m)
    ? `${nama} tidak menjawab tepat waktu.`
    : `${nama} belum terbaca.`;
}

async function kakiOpbnb(alamat: `0x${string}`): Promise<KakiOpbnb> {
  const kunci = alamat.toLowerCase();
  const now = Date.now();
  const c = cacheOpbnb.get(kunci);
  if (c && c.sampai > now) return c.nilai;

  const chain = swapBurnChain();
  const idmx = idmxAddress();
  const initiator = swapInitiatorAddress();
  if (!idmx || !initiator) {
    return { status: "gagal", pada: now, galat: "Kontrak sisi opBNB belum dikonfigurasi." };
  }
  try {
    const s = await bacaKeadaanSwap(publicClientServer(chain), idmx, initiator, alamat);
    const nilai: KakiOpbnb = {
      status: "ok",
      pada: now,
      saldoIdmx: s.saldoIdmx.toString(),
      minSwap: s.minSwap.toString(),
      sisaJatahMinggu: s.sisaJatahMinggu.toString(),
      izin: s.izin.toString(),
      jeda: s.jeda,
    };
    cacheOpbnb.set(kunci, { sampai: now + CACHE_MS, nilai });
    if (cacheOpbnb.size > 500) {
      for (const [k, v] of cacheOpbnb) if (v.sampai <= now) cacheOpbnb.delete(k);
    }
    return nilai;
  } catch (err) {
    return { status: "gagal", pada: now, galat: pesanGalat(err, chain.name) };
  }
}

async function kakiBsc(): Promise<KakiBsc> {
  const now = Date.now();
  if (cacheBsc && cacheBsc.sampai > now) return cacheBsc.nilai;
  const chain = swapClaimChain();
  const claim = swapClaimAddress();
  if (!claim) {
    return { status: "gagal", pada: now, galat: "Kontrak sisi BSC belum dikonfigurasi." };
  }
  try {
    const k = await bacaKeadaanKlaim(publicClientServer(chain), claim);
    const nilai: KakiBsc = {
      status: "ok",
      pada: now,
      kurs: k.kurs.toString(),
      fee: k.fee.toString(),
      jeda: k.jeda,
    };
    cacheBsc = { sampai: now + CACHE_MS, nilai };
    return nilai;
  } catch (err) {
    return { status: "gagal", pada: now, galat: pesanGalat(err, chain.name) };
  }
}

/** Kedua kaki sekaligus, masing-masing berstatus. */
export async function keadaanSwapServer(
  alamat: `0x${string}`,
): Promise<KeadaanSwapRespons> {
  const [opbnb, bsc] = await Promise.all([kakiOpbnb(alamat), kakiBsc()]);
  return {
    pada: Date.now(),
    alamat,
    burnChainId: swapBurnChain().id,
    claimChainId: swapClaimChain().id,
    opbnb,
    bsc,
  };
}
