/** Pembungkus klien invoice & bukti potong (Batch 11). */

import { panggil, type ApiHasil } from "@/lib/api/panggil";
import type { PaymentMethod } from "@/lib/transactions";
import type { BuktiPotongRow, InvoiceKlien, RekapBuktiPotong, StatusPotong } from "@/lib/invoice/server";

export type { InvoiceKlien, BuktiPotongRow, RekapBuktiPotong, StatusPotong };

export const daftarInvoice = () => panggil<{ items: InvoiceKlien[] }>("/api/invoice");

export const buatInvoice = (b: { klien: string; uraian: string; nominal: number; jatuhTempo: string | null }) =>
  panggil<{ invoice: InvoiceKlien }>("/api/invoice", { method: "POST", body: JSON.stringify(b) });

export const lunasiInvoice = (id: string, metode: PaymentMethod, catat = true) =>
  panggil<{ invoice: InvoiceKlien }>(`/api/invoice/${id}`, { method: "PATCH", body: JSON.stringify({ aksi: "lunas", catat, metode }) });

export const batalkanInvoice = (id: string) =>
  panggil<{ invoice: InvoiceKlien }>(`/api/invoice/${id}`, { method: "PATCH", body: JSON.stringify({ aksi: "batal" }) });

export const urlPdfInvoice = (id: string, jenis: "invoice" | "kuitansi") => `/api/invoice/${id}/pdf?jenis=${jenis}`;

/**
 * Bagikan PDF lewat Web Share API (berkas) bila tersedia; kalau tidak,
 * unduh biasa. Mengembalikan "dibagikan" | "diunduh" | "gagal".
 */
export async function bagikanPdf(url: string, namaBerkas: string): Promise<"dibagikan" | "diunduh" | "gagal"> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return "gagal";
    const blob = await res.blob();
    const file = new File([blob], namaBerkas, { type: "application/pdf" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: namaBerkas });
        return "dibagikan";
      } catch {
        /* dibatalkan pengguna → jatuh ke unduh */
      }
    }
    const a = document.createElement("a");
    const href = URL.createObjectURL(blob);
    a.href = href;
    a.download = namaBerkas;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    return "diunduh";
  } catch {
    return "gagal";
  }
}

export const daftarBuktiPotong = (tahun: number) =>
  panggil<{ items: BuktiPotongRow[]; rekap: RekapBuktiPotong; tahun: number }>(`/api/pajak/bukti-potong?tahun=${tahun}`);

export const tambahBuktiPotong = (b: {
  klien: string; tanggal: string; bruto: number; status: StatusPotong; nominalPotongan: number; nomorBukti: string | null; invoiceId?: string | null;
}) => panggil<{ item: BuktiPotongRow }>("/api/pajak/bukti-potong", { method: "POST", body: JSON.stringify(b) });

export const hapusBuktiPotong = (id: string) =>
  panggil<{ ok: true }>(`/api/pajak/bukti-potong?id=${id}`, { method: "DELETE" });
