/** Pembungkus klien Modul Pajak OP (Batch 9). */

import { panggil, type ApiHasil } from "@/lib/api/panggil";
import type { PajakResponse } from "@/lib/pajak/server";

export type { PajakResponse };

export function ambilPajak(tahun?: number): Promise<ApiHasil<PajakResponse>> {
  return panggil(`/api/pajak${tahun ? `?tahun=${tahun}` : ""}`);
}

export function buatRincianPajak(tahun: number): Promise<ApiHasil<{ dokumen: { id: string; nomorDokumen: string; status: string }; unduhUrl: string | null }>> {
  return panggil("/api/pajak/rincian", { method: "POST", body: JSON.stringify({ tahun }) });
}

/** PDF dikirim langsung (tidak disimpan server). null + kode bila ditolak. */
export async function buatPernyataanPajak(
  args: { tahun: number; nama: string; npwp: string },
): Promise<{ ok: true; blob: Blob; nomor: string } | { ok: false; status: number; error: string; kode?: string }> {
  try {
    const res = await fetch("/api/pajak/pernyataan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string; kode?: string };
      return { ok: false, status: res.status, error: j.error ?? "Surat belum bisa dibuat.", kode: j.kode };
    }
    return { ok: true, blob: await res.blob(), nomor: res.headers.get("X-Nomor-Dokumen") ?? "" };
  } catch {
    return { ok: false, status: 0, error: "Kamu sedang offline — surat butuh koneksi." };
  }
}

export const urlUnduhDokumenPajak = (id: string) => `/api/pajak/dokumen/${id}/unduh`;
