/** Pembungkus klien Berkas Pengajuan (Batch 5). */

import { panggil, type ApiHasil } from "@/lib/api/panggil";

export interface BerkasItem {
  id: string;
  kode: "berkas6" | "berkas12";
  label: string;
  nomorDokumen: string;
  kodeVerifikasi: string;
  periodeAwal: string; // YYYY-MM
  periodeAkhir: string; // YYYY-MM
  status: "menunggu_bayar" | "dibuat" | "pending_segel" | "confirmed" | "gagal";
  bisaUnduh: boolean;
  createdAt: string;
}

export type HasilPesan =
  | { jalur: "plus"; berkas: { id: string; status: string; nomorDokumen: string } }
  | { jalur: "bayar"; orderId: string; token: string; redirectUrl: string };

export function daftarBerkas(): Promise<ApiHasil<{ items: BerkasItem[] }>> {
  return panggil("/api/berkas");
}

export function pesanBerkas(kode: "berkas6" | "berkas12"): Promise<ApiHasil<HasilPesan>> {
  return panggil("/api/berkas/pesan", { method: "POST", body: JSON.stringify({ kode }) });
}

/** Pratinjau = halaman 1 PDF (bytes). Dipakai langsung dengan fetch karena
 *  hasilnya biner, bukan JSON. */
export async function ambilPratinjau(kode: "berkas6" | "berkas12"): Promise<Blob | null> {
  try {
    const res = await fetch("/api/berkas/pratinjau", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kode }),
    });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export const urlUnduhBerkas = (id: string) => `/api/berkas/${id}/unduh`;
