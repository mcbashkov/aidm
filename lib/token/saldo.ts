/**
 * Saldo IDMX on-chain untuk kartu wallet & header (§9 / §7.9).
 *
 * Dibaca di SERVER, bukan di browser: `NEXT_PUBLIC_OPBNB_*_RPC_URL` memang
 * publik, tapi memanggilnya dari klien berarti tiap tab menembak RPC sendiri
 * dan alamat pengguna bocor ke penyedia RPC pada setiap muat halaman. Server
 * membaca sekali, semua tab ikut hasilnya.
 *
 * Dua pengaman yang WAJIB ada karena `/api/me` dipanggil pada SETIAP navigasi
 * (lihat components/providers/me-provider.tsx):
 *
 *   1. Batas waktu keras — RPC yang menggantung tidak boleh menahan seluruh
 *      respons profil. Lebih baik menampilkan saldo basi/nol daripada layar
 *      yang membeku.
 *   2. Cache pendek per alamat — navigasi beruntun dalam satu menit tidak perlu
 *      memukul RPC berkali-kali. Cache hidup di memori proses, jadi ia hangat
 *      hanya selama instans serverless-nya hangat; itu sudah cukup karena yang
 *      dilindungi adalah ledakan permintaan, bukan volume jangka panjang.
 */

import { createPublicClient, http, formatEther } from "viem";
import { idmxAddress, IDMX_ABI, swapBurnChain } from "@/lib/swap/config";

/** Melewati ini, respons profil jalan tanpa saldo. Angka RPC opBNB normal
 *  ada di kisaran 100–300 ms; 2,5 detik berarti benar-benar bermasalah. */
const BATAS_MS = 2_500;

const CACHE_MS = 60_000;

const cache = new Map<string, { nilai: number; sampai: number }>();

/**
 * Saldo IDMX (satuan token, bukan wei) milik `address`.
 *
 * Mengembalikan `null` — bukan 0 — bila saldo tidak bisa dipastikan (kontrak
 * belum dikonfigurasi, RPC gagal, waktu habis). Perbedaan ini penting: 0 adalah
 * pernyataan "dompetmu kosong", sedangkan `null` berarti "kami belum tahu", dan
 * UI menampilkan keduanya secara berbeda. Menyamakan keduanya pernah menjadi
 * bug hardcode `idmx: 0` yang membuat saldo nyata tak pernah terlihat.
 */
export async function saldoIdmx(address: string): Promise<number | null> {
  const token = idmxAddress();
  if (!token) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return null;

  const kunci = address.toLowerCase();
  const now = Date.now();
  const cached = cache.get(kunci);
  if (cached && cached.sampai > now) return cached.nilai;

  try {
    const klien = createPublicClient({
      chain: swapBurnChain(),
      transport: http(undefined, { timeout: BATAS_MS }),
    });
    const wei = await Promise.race([
      klien.readContract({
        address: token,
        abi: IDMX_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      }),
      new Promise<never>((_, tolak) =>
        setTimeout(() => tolak(new Error("timeout")), BATAS_MS),
      ),
    ]);

    const nilai = Number(formatEther(wei as bigint));
    cache.set(kunci, { nilai, sampai: now + CACHE_MS });
    // Cache dibatasi supaya proses yang berumur panjang tidak menumpuk alamat
    // tanpa batas. 500 alamat sudah jauh di atas jumlah tab aktif wajar.
    if (cache.size > 500) {
      for (const [k, v] of cache) if (v.sampai <= now) cache.delete(k);
    }
    return nilai;
  } catch {
    // Sengaja tidak dicatat sebagai error: RPC publik sesekali gagal, dan
    // membanjiri log dengan kegagalan yang sudah ditangani hanya menutupi
    // masalah yang sungguhan.
    return cached?.nilai ?? null;
  }
}
