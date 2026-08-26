/**
 * Sisi server alur segel (§7.5) — SATU-SATUNYA berkas yang menyentuh kunci
 * relayer treasury. Jangan pernah mengimpor berkas ini dari komponen klien.
 */

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  attestationAddress,
  periodKeyBytes32,
  sealChain,
  REPORT_ATTESTATION_ABI,
} from "@/lib/chains/attestation";
import { todayWib } from "@/lib/wib";
import { rentangTanggal } from "@/lib/laporan/periode";
import {
  ambilRollups,
  kategoriKanonik,
  ringkasDariRollups,
} from "@/lib/laporan/server";
import { hashLaporan } from "@/lib/laporan/kanonik";

function relayerKey(): `0x${string}` | null {
  const k = process.env.SEAL_RELAYER_PRIVATE_KEY;
  if (!k) return null;
  const hex = k.startsWith("0x") ? k : `0x${k}`;
  return /^0x[0-9a-fA-F]{64}$/.test(hex) ? (hex as `0x${string}`) : null;
}

/** Segel siap dipakai? — kontrak ter-deploy DAN kunci relayer terpasang.
 *  Dibaca GET /api/laporan supaya UI tidak menawarkan tombol yang pasti 501. */
export function isSealConfigured(): boolean {
  return attestationAddress() !== null && relayerKey() !== null;
}

/** Susun kanonik §17.2 + hash untuk satu periode, dari agregat DB yang sama
 *  persis dengan yang dilihat user di layar Laporan. */
export async function kanonikPeriode(
  supa: SupabaseClient,
  userId: string,
  period: string,
): Promise<{ kanonik: string; hash: string }> {
  const rentang = rentangTanggal(period);
  const [rollups, kategori] = await Promise.all([
    ambilRollups(supa, userId, rentang),
    kategoriKanonik(supa, userId, rentang),
  ]);
  const r = ringkasDariRollups(rollups);
  return hashLaporan({
    user_id: userId,
    period_key: period,
    generated_at: todayWib(),
    total_masuk: r.masuk,
    total_keluar: r.keluar,
    jml_transaksi: r.jmlTransaksi,
    hari_aktif: r.hariAktif,
    masuk_terverifikasi: r.masukTerverifikasi,
    rincian_kategori: kategori,
  });
}

export interface HasilAttest {
  txHash: `0x${string}`;
  /** true = receipt sukses dalam batas waktu; false = tx terkirim tapi
   *  receipt belum terlihat (status tetap pending, dicek lagi via GET). */
  confirmed: boolean;
}

/**
 * Kirim attestFor via relayer treasury (gasless bagi user, §7.5) dan tunggu
 * receipt. Melempar error bila tx gagal DIKIRIM; timeout receipt BUKAN error
 * (blok opBNB ~1 dtk, tapi RPC bisa lambat — biarkan GET yang menuntaskan).
 */
export async function attestOnChain(
  userWallet: `0x${string}`,
  period: string,
  hashHex: string,
): Promise<HasilAttest> {
  const address = attestationAddress();
  const key = relayerKey();
  if (!address || !key) throw new Error("Segel on-chain belum dikonfigurasi.");

  const chain = sealChain();
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain, transport: http() });
  const publik = createPublicClient({ chain, transport: http() });

  const txHash = await wallet.writeContract({
    address,
    abi: REPORT_ATTESTATION_ABI,
    functionName: "attestFor",
    args: [userWallet, periodKeyBytes32(period), `0x${hashHex}` as `0x${string}`],
  });

  try {
    const receipt = await publik.waitForTransactionReceipt({
      hash: txHash,
      timeout: 45_000, // AC §7.5: segel ≤ 60 dtk — sisakan ruang untuk DB
    });
    if (receipt.status !== "success") {
      throw new Error(`Transaksi segel revert (${txHash}).`);
    }
    return { txHash, confirmed: true };
  } catch (err) {
    // Revert = gagal sungguhan; selain itu (timeout RPC) = pending jujur.
    if (err instanceof Error && err.message.includes("revert")) throw err;
    return { txHash, confirmed: false };
  }
}

/** Cek receipt untuk segel berstatus pending (dipanggil GET status). */
export async function cekReceipt(
  txHash: `0x${string}`,
): Promise<"confirmed" | "failed" | "pending"> {
  try {
    const publik = createPublicClient({ chain: sealChain(), transport: http() });
    const receipt = await publik.getTransactionReceipt({ hash: txHash });
    return receipt.status === "success" ? "confirmed" : "failed";
  } catch {
    return "pending"; // belum masuk blok / RPC tak terjangkau — jangan mengarang
  }
}
