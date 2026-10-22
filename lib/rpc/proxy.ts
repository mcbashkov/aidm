/**
 * Proxy JSON-RPC same-origin (PERINTAH-AGEN-PREMIUM §Batch 8) — sisi server.
 *
 * Browser (sheet Tukar, dompet Privy) tidak lagi menembak RPC publik langsung.
 * Ia memanggil `POST /api/rpc/<chain>`, dan rute itu meneruskan ke penyedia:
 * `*_RPC_URL_SERVER` (kunci berbayar, opsional) di depan, daftar endpoint
 * resmi sebagai cadangan. Kunci penyedia tidak pernah sampai ke klien.
 *
 * Yang dijaga di sini — semua pagar, tanpa satu pun yang mengubah isi:
 *   · allowlist method (tanpa `eth_sendTransaction`, tanpa `debug_*`/admin)
 *   · batch ≤ 10, body ≤ 64 KB, `eth_getLogs` ≤ 2.000 blok dengan rentang
 *     eksplisit (tag seperti `latest` ditolak: rentangnya tidak bisa diperiksa
 *     tanpa bertanya dulu ke jaringan)
 *   · batas laju per sesi (atau per IP tanpa sesi), pola `catat_rate_inc` 0028
 *     — fungsi `rpc_rate_inc` (0037)
 *   · timeout upstream 8 detik, pindah ke cadangan pada galat/5xx/timeout
 *
 * `eth_chainId` dijawab lokal tanpa menyentuh upstream: nilainya konstanta
 * chain, dan ini permintaan yang paling sering dikirim dompet.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { daftarRpc } from "@/lib/chains/rpc";
import { envPertama } from "@/lib/env";
import { RANTAI, type SlugRantai } from "@/lib/chains/slug";

/**
 * Method yang diteruskan. Daftar perintah ditambah `eth_getBlockByNumber` dan
 * `eth_getBlockByHash`: viem memanggil `eth_getBlockByNumber("latest")` untuk
 * menaksir biaya EIP-1559 sebelum setiap transaksi dan saat menunggu struk,
 * jadi tanpa keduanya approve/swap dari dompet gagal di langkah pertama.
 * Keduanya baca-saja.
 */
export const RPC_METODE_BOLEH: ReadonlySet<string> = new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_call",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getBalance",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_sendRawTransaction",
  "eth_getLogs",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
]);

export const RPC_BATAS_BATCH = 10;
export const RPC_BATAS_BODY_BYTE = 64 * 1024;
export const RPC_TIMEOUT_UPSTREAM_MS = 8_000;
/** Seluruh percobaan upstream (termasuk cadangan) harus selesai dalam ini. */
export const RPC_TENGGAT_TOTAL_MS = 14_000;
export const RPC_RENTANG_LOG_MAKS = 2_000;
/**
 * 120 permintaan/menit per kunci. Satu approve + swap dari dompet ≈ 10–15
 * panggilan, dan `waitForTransactionReceipt` viem menanya `eth_blockNumber`
 * tiap beberapa detik; satu menit sibuk pengguna sungguhan ada di kisaran
 * 40–60. Yang terhalang hanya skrip. Isi batch dihitung per item.
 */
export const RPC_RATE_PER_MENIT = 120;
export const RPC_RATE_JENDELA_DETIK = 60;

const ENV_SERVER: Record<SlugRantai, string> = {
  opbnb: "OPBNB_RPC_URL_SERVER",
  "opbnb-testnet": "OPBNB_TESTNET_RPC_URL_SERVER",
  bsc: "BSC_RPC_URL_SERVER",
  "bsc-testnet": "BSC_TESTNET_RPC_URL_SERVER",
};

/**
 * Daftar upstream sisi server untuk satu chain: kunci berbayar (bila ada) di
 * depan, lalu daftar chain (env `NEXT_PUBLIC_*` + endpoint resmi) sebagai
 * cadangan — `daftarRpc` yang sama dengan sisi klien, tanpa duplikat.
 */
export function upstreamUntuk(slug: SlugRantai): string[] {
  return daftarRpc(
    envPertama(ENV_SERVER[slug]),
    RANTAI[slug].rpcUrls.default.http,
  );
}

export interface PermintaanRpc {
  jsonrpc?: string;
  id?: unknown;
  method: string;
  params?: unknown;
}

export type HasilPeriksa =
  | { ok: true; items: PermintaanRpc[]; batch: boolean }
  | { ok: false; status: number; id: unknown; kode: number; pesan: string };

const HEX = /^0x[0-9a-fA-F]+$/;

function periksaRentangLog(params: unknown): string | null {
  const p = Array.isArray(params) ? params[0] : undefined;
  if (!p || typeof p !== "object") {
    return "eth_getLogs membutuhkan objek filter";
  }
  const f = p as { blockHash?: unknown; fromBlock?: unknown; toBlock?: unknown };
  if (typeof f.blockHash === "string") return null;
  if (typeof f.fromBlock !== "string" || typeof f.toBlock !== "string" ||
      !HEX.test(f.fromBlock) || !HEX.test(f.toBlock)) {
    return `eth_getLogs: fromBlock/toBlock harus angka heksadesimal eksplisit (rentang ≤ ${RPC_RENTANG_LOG_MAKS} blok)`;
  }
  const dari = BigInt(f.fromBlock);
  const sampai = BigInt(f.toBlock);
  if (sampai < dari || sampai - dari > BigInt(RPC_RENTANG_LOG_MAKS)) {
    return `eth_getLogs: rentang blok maksimal ${RPC_RENTANG_LOG_MAKS}`;
  }
  return null;
}

/** Validasi bentuk & isi permintaan. Tidak menyentuh jaringan. */
export function periksaBody(json: unknown): HasilPeriksa {
  const batch = Array.isArray(json);
  const items = (batch ? json : [json]) as unknown[];
  if (batch && items.length === 0) {
    return { ok: false, status: 400, id: null, kode: -32600, pesan: "Batch kosong" };
  }
  if (items.length > RPC_BATAS_BATCH) {
    return {
      ok: false, status: 400, id: null, kode: -32600,
      pesan: `Batch maksimal ${RPC_BATAS_BATCH} permintaan`,
    };
  }
  const bersih: PermintaanRpc[] = [];
  for (const it of items) {
    if (!it || typeof it !== "object" || Array.isArray(it)) {
      return { ok: false, status: 400, id: null, kode: -32600, pesan: "Permintaan tidak valid" };
    }
    const r = it as PermintaanRpc;
    if (typeof r.method !== "string") {
      return { ok: false, status: 400, id: r.id ?? null, kode: -32600, pesan: "Permintaan tanpa method" };
    }
    if (!RPC_METODE_BOLEH.has(r.method)) {
      return {
        ok: false, status: 400, id: r.id ?? null, kode: -32601,
        pesan: `Method ${r.method} tidak dilayani proxy ini`,
      };
    }
    if (r.method === "eth_getLogs") {
      const galat = periksaRentangLog(r.params);
      if (galat) return { ok: false, status: 400, id: r.id ?? null, kode: -32602, pesan: galat };
    }
    bersih.push(r);
  }
  return { ok: true, items: bersih, batch };
}

/** Jawaban lokal bila SEMUA item adalah `eth_chainId`; selain itu null. */
export function jawabLokal(
  items: PermintaanRpc[],
  chainId: number,
  batch: boolean,
): unknown | null {
  if (!items.every((i) => i.method === "eth_chainId")) return null;
  const hex = `0x${chainId.toString(16)}`;
  const jawab = items.map((i) => ({ jsonrpc: "2.0", id: i.id ?? null, result: hex }));
  return batch ? jawab : jawab[0];
}

/**
 * Teruskan body (sudah divalidasi) ke upstream berurutan sampai ada yang
 * menjawab 2xx. Jawaban JSON-RPC bergalat (HTTP 200) adalah jawaban yang sah
 * dan diteruskan apa adanya — hanya galat transport/timeout/non-2xx yang
 * membuat giliran pindah ke cadangan. `null` = semua upstream gagal.
 */
export async function teruskan(
  urls: readonly string[],
  body: string,
): Promise<string | null> {
  const mulai = Date.now();
  for (const url of urls) {
    const sisa = RPC_TENGGAT_TOTAL_MS - (Date.now() - mulai);
    if (sisa < 500) break;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), Math.min(RPC_TIMEOUT_UPSTREAM_MS, sisa));
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body,
        signal: ac.signal,
        cache: "no-store",
      });
      if (!r.ok) continue;
      return await r.text();
    } catch {
      continue;
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}

/**
 * Naikkan penghitung laju untuk satu kunci; nilai SETELAH kenaikan. `null`
 * bila penghitungnya sendiri tidak tersedia — dan, seperti di Catat, `null`
 * berarti "lewatkan", bukan "tolak": pagar anti-abuse tidak boleh menjadi
 * sebab seluruh dompet berhenti ketika database tersendat.
 */
export async function naikkanLajuRpc(
  kunci: string,
  tambah: number,
): Promise<number | null> {
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return null;
  }
  const { data, error } = await supa.rpc("rpc_rate_inc", {
    p_kunci: kunci,
    p_jendela_detik: RPC_RATE_JENDELA_DETIK,
    p_tambah: tambah,
  });
  if (error || typeof data !== "number") return null;
  return data;
}
