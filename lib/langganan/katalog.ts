/**
 * Katalog produk premium (PERINTAH-AGEN-PREMIUM §1.1–§1.2, Batch 5–6).
 *
 * SATU-SATUNYA tempat angka rupiah dan nama produk hidup. UI membaca dari
 * sini; tidak ada angka rupiah hard-coded di komponen. Harga adalah inferensi
 * pasar yang BELUM diuji (riset §Harga) — karena itu ia harus bisa diubah
 * dari satu berkas tanpa menyentuh UI, dan setiap pratinjau/klik/bayar
 * dicatat di `premium_events` supaya konversi per peran terbaca sebelum harga
 * diubah.
 *
 * Tidak ada SKU bulanan, tidak ada "Kredit AI" sebagai saldo (dibatalkan PO
 * 2026-08-28). Langganan tidak pernah dibayar token.
 */

import { labelBerkas } from "@/lib/kesiapan/hitung";
import type { Tingkat } from "@/lib/kesiapan/hitung";

export type KodeProduk = "berkas6" | "berkas12" | "plus" | "pajak";

export interface Produk {
  kode: KodeProduk;
  /** Nama internal & di Akun/kuitansi. Judul PDF memakai label peran. */
  nama: string;
  hargaIdr: number;
  /** Berkas: rentang bulan. Plus/pajak: masa berlaku dalam hari. */
  bulan?: 6 | 12;
  periodeHari?: number;
  /** false sampai Fase B (Batch 9) menyalakannya di katalog. */
  tersedia: boolean;
}

export const PLUS_PERIODE_HARI = 365;
/** Wajar: Plus memberi Berkas tanpa bayar per dokumen, maksimal ini per 365 hari. */
export const PLUS_BERKAS_MAKS = 12;

export const KATALOG: Record<KodeProduk, Produk> = {
  berkas6: {
    kode: "berkas6",
    nama: "Berkas Pengajuan 6 bulan",
    hargaIdr: 49_000,
    bulan: 6,
    tersedia: true,
  },
  berkas12: {
    kode: "berkas12",
    nama: "Berkas Pengajuan 12 bulan",
    hargaIdr: 79_000,
    bulan: 12,
    tersedia: true,
  },
  plus: {
    kode: "plus",
    nama: "AIDM Plus — 1 tahun",
    hargaIdr: 149_000,
    periodeHari: PLUS_PERIODE_HARI,
    tersedia: true,
  },
  pajak: {
    kode: "pajak",
    nama: "Paket Pajak Tahunan",
    hargaIdr: 59_000,
    periodeHari: 365,
    tersedia: false, // Fase B (Batch 9)
  },
};

export function kodeProdukSah(v: unknown): v is KodeProduk {
  return v === "berkas6" || v === "berkas12" || v === "plus" || v === "pajak";
}

export function kodeBerkasSah(v: unknown): v is "berkas6" | "berkas12" {
  return v === "berkas6" || v === "berkas12";
}

/** "Rp49.000" — pemisah ribuan titik, tanpa desimal. */
export function formatHargaIdr(idr: number): string {
  return `Rp${Math.round(idr).toLocaleString("id-ID")}`;
}

/** "Berkas Usaha 6 Bulan" / "Riwayat Pendapatan 12 Bulan" (§1.2). */
export function labelBerkasPeran(
  earnerType: string | null | undefined,
  bulan: 6 | 12,
): string {
  return `${labelBerkas(earnerType)} ${bulan} Bulan`;
}

/** "Buat Berkas Usaha" — label pintu di Laporan/Beranda (§1.2). */
export function labelPintu(earnerType: string | null | undefined): string {
  return `Buat ${labelBerkas(earnerType)}`;
}

/**
 * Syarat beli (§1.5): berkas6 bila tingkat ≥ siap3; berkas12 bila ≥6 bulan
 * aktif di 12 bulan terakhir. Di bawah syarat, tombol tetap tampil tetapi
 * nonaktif dengan kalimat ini; pratinjau selalu boleh dibuka.
 */
export function syaratBeli(
  kode: "berkas6" | "berkas12",
  kesiapan: { tingkat: Tingkat; bulanAktif6: number; bulanAktif12: number },
): { boleh: boolean; alasan: string | null } {
  if (kode === "berkas6") {
    const boleh = kesiapan.tingkat === "siap3" || kesiapan.tingkat === "siap6";
    return {
      boleh,
      alasan: boleh
        ? null
        : `Catat sampai 3 bulan aktif dulu (sekarang ${kesiapan.bulanAktif6})`,
    };
  }
  const boleh = kesiapan.bulanAktif12 >= 6;
  return {
    boleh,
    alasan: boleh
      ? null
      : `Catat sampai 6 bulan aktif dulu (sekarang ${kesiapan.bulanAktif12})`,
  };
}
