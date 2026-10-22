/**
 * Tipe & pembaca CSV "catatan per layanan" aplikator ojol (PERINTAH-AGEN-PREMIUM
 * §Batch 10) — TANPA UI. Format resmi aplikator belum ada (≈2027); skema di
 * sini generik dan disengaja longgar: tanggal, platform, kotor, potongan,
 * bersih. Kolom dikenali dari nama kepala (beberapa sinonim), bukan posisi.
 *
 * Murni: tidak membaca berkas, tidak menyentuh database. Pemanggil yang
 * membuka berkas dan memutuskan apa yang dilakukan dengan barisnya.
 */

import { normalisasiPlatform, type PlatformOjol } from "@/lib/parse/platform";

export interface BarisImporOjol {
  /** YYYY-MM-DD (dinormalkan dari dd/mm/yyyy, yyyy-mm-dd, dd-mm-yyyy). */
  tanggal: string;
  platform: PlatformOjol;
  kotor: number;
  potongan: number;
  bersih: number;
  /** Nomor baris asal (1 = baris data pertama) untuk pesan galat. */
  baris: number;
}

export interface HasilImporOjol {
  baris: BarisImporOjol[];
  /** Baris yang dilewati beserta alasannya. */
  dilewati: { baris: number; alasan: string }[];
}

const KEPALA: Record<keyof Omit<BarisImporOjol, "baris">, RegExp> = {
  tanggal: /^(tanggal|tgl|date|waktu)$/i,
  platform: /^(platform|aplikasi|layanan|app|sumber)$/i,
  kotor: /^(kotor|bruto|gross|pendapatan|total)$/i,
  potongan: /^(potongan|komisi|fee|biaya|deduction)$/i,
  bersih: /^(bersih|netto|net|diterima)$/i,
};

function pecahBaris(baris: string, pemisah: string): string[] {
  const out: string[] = [];
  let sel = "";
  let kutip = false;
  for (let i = 0; i < baris.length; i++) {
    const ch = baris[i];
    if (ch === '"') {
      if (kutip && baris[i + 1] === '"') { sel += '"'; i++; } else kutip = !kutip;
    } else if (ch === pemisah && !kutip) {
      out.push(sel); sel = "";
    } else sel += ch;
  }
  out.push(sel);
  return out.map((s) => s.trim());
}

/** "Rp1.250.000", "1250000", "1.250.000,50" → 1250000 (rupiah bulat). */
export function angkaRupiah(nilai: string): number | null {
  const bersih = nilai.replace(/rp/i, "").replace(/\s/g, "");
  if (!bersih) return null;
  // Pemisah ribuan titik & desimal koma (gaya Indonesia); buang desimal.
  const tanpaDesimal = bersih.includes(",") ? bersih.split(",")[0] : bersih;
  const digit = tanpaDesimal.replace(/\./g, "").replace(/[^\d-]/g, "");
  if (!/^-?\d+$/.test(digit)) return null;
  return Number(digit);
}

export function tanggalIso(nilai: string): string | null {
  const v = nilai.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(v);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** Baca teks CSV (pemisah `,` atau `;`, kepala di baris pertama). */
export function bacaCsvOjol(teks: string): HasilImporOjol {
  const barisTeks = teks.replace(/^﻿/, "").split(/\r?\n/).filter((b) => b.trim());
  if (barisTeks.length < 2) return { baris: [], dilewati: [{ baris: 0, alasan: "CSV kosong" }] };
  const pemisah = (barisTeks[0].match(/;/g) ?? []).length > (barisTeks[0].match(/,/g) ?? []).length ? ";" : ",";
  const kepala = pecahBaris(barisTeks[0], pemisah);
  const idx: Partial<Record<keyof typeof KEPALA, number>> = {};
  kepala.forEach((k, i) => {
    for (const [nama, re] of Object.entries(KEPALA) as [keyof typeof KEPALA, RegExp][]) {
      if (idx[nama] === undefined && re.test(k)) idx[nama] = i;
    }
  });
  if (idx.tanggal === undefined || idx.kotor === undefined) {
    return { baris: [], dilewati: [{ baris: 0, alasan: "kolom tanggal dan kotor wajib ada" }] };
  }
  const hasil: HasilImporOjol = { baris: [], dilewati: [] };
  for (let i = 1; i < barisTeks.length; i++) {
    const sel = pecahBaris(barisTeks[i], pemisah);
    const tanggal = tanggalIso(sel[idx.tanggal] ?? "");
    const kotor = angkaRupiah(sel[idx.kotor] ?? "");
    if (!tanggal || kotor === null || kotor < 0) {
      hasil.dilewati.push({ baris: i, alasan: !tanggal ? "tanggal tidak dikenal" : "kotor bukan angka" });
      continue;
    }
    const potongan = idx.potongan !== undefined ? angkaRupiah(sel[idx.potongan] ?? "") ?? 0 : 0;
    const bersihKolom = idx.bersih !== undefined ? angkaRupiah(sel[idx.bersih] ?? "") : null;
    hasil.baris.push({
      tanggal,
      platform: normalisasiPlatform(idx.platform !== undefined ? sel[idx.platform] : null) ?? "lainnya",
      kotor,
      potongan: Math.max(0, potongan),
      bersih: bersihKolom ?? Math.max(0, kotor - Math.max(0, potongan)),
      baris: i,
    });
  }
  return hasil;
}
