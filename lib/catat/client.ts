/**
 * Pembungkus klien untuk API pencatatan (§11). Bentuk hasil & semantik
 * demo/offline-nya bersama seluruh API lain — lihat `lib/api/panggil`.
 */

import type { Transaction } from "@/lib/transactions";
import type { KodeTidakDikenali, Pertanyaan } from "@/lib/catat/pesan";
import { panggil, type ApiHasil } from "@/lib/api/panggil";
import { bulanWib } from "@/lib/wib";

export type { ApiHasil };

/**
 * Respons `/api/catat`. Tidak ada satu pun string bebas: `pertanyaan` dan
 * `tidak_dikenali` adalah BENTUK BERTIPE, dan kalimatnya disusun layar dari
 * `lib/catat/pesan.ts`. Dengan begitu tidak ada jalur di mana teks karangan
 * model bisa sampai ke gelembung percakapan.
 */
export interface CatatResponse {
  entries: Transaction[];
  pertanyaan: Pertanyaan | null;
  tidak_dikenali: KodeTidakDikenali | null;
  /** Berapa kali offtopic hari ini — menentukan panjang-pendek kalimatnya. */
  offtopic_hari_ini?: number;
  parsed_by: "llm" | "fallback";
}

export interface RingkasHariIni {
  masuk: number;
  keluar: number;
  sisa: number;
  jml_transaksi: number;
  masuk_terverifikasi: number;
}

export interface TransaksiListResponse {
  items: Transaction[];
  page: number;
  page_size: number;
  total: number;
  ringkas_hari_ini?: RingkasHariIni;
}

export function kirimCatat(
  text: string,
  source: "chat" | "voice",
): Promise<ApiHasil<CatatResponse>> {
  return panggil("/api/catat", {
    method: "POST",
    body: JSON.stringify({ text, source }),
  });
}

export function konfirmasiDraft(
  draftId: string,
  jawaban: string,
): Promise<ApiHasil<{ ok: boolean; entry?: Transaction; pertanyaan?: Pertanyaan }>> {
  return panggil("/api/catat/konfirmasi", {
    method: "POST",
    body: JSON.stringify({ draft_id: draftId, jawaban }),
  });
}

export function daftarTransaksi(params: {
  period?: string;
  jenis?: string;
  kategori?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  ringkas?: boolean;
}): Promise<ApiHasil<TransaksiListResponse>> {
  const sp = new URLSearchParams();
  if (params.period && params.period !== "semua") sp.set("period", params.period);
  if (params.jenis && params.jenis !== "semua") sp.set("jenis", params.jenis);
  if (params.kategori && params.kategori !== "semua")
    sp.set("kategori", params.kategori);
  if (params.q) sp.set("q", params.q);
  if (params.page) sp.set("page", String(params.page));
  if (params.pageSize) sp.set("page_size", String(params.pageSize));
  if (params.ringkas) sp.set("ringkas", "1");
  return panggil(`/api/transaksi?${sp.toString()}`);
}

export function ubahTransaksi(
  id: string,
  patch: {
    jenis?: string;
    amount?: number;
    kategori?: string;
    payment_method?: string;
    occurred_at?: string;
    catatan?: string | null;
  },
): Promise<ApiHasil<{ entry: Transaction }>> {
  return panggil(`/api/transaksi/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function hapusTransaksi(id: string): Promise<ApiHasil<{ ok: boolean }>> {
  return panggil(`/api/transaksi/${id}`, { method: "DELETE" });
}

/**
 * Satu baris thread Catat: transaksi + kalimat asli yang melahirkannya.
 * `rawInput` HANYA terisi lewat hidrasi ini — tidak ada layar lain yang
 * membacanya, jadi ia tidak ikut ke tipe `Transaction`.
 */
export type BarisCatat = Transaction & { rawInput?: string | null };

/**
 * Thread Catat hari ini dari server (§7.2). Batas harinya `created_at` WIB —
 * ini percakapan, isinya apa yang pengguna KATAKAN hari ini. Draft ikut,
 * karena pertanyaan nominal yang belum dijawab adalah bagian percakapan yang
 * belum selesai.
 */
export function hidrasiCatat(): Promise<ApiHasil<{ items: BarisCatat[] }>> {
  return panggil("/api/transaksi?untuk=catat");
}

/* ── Opsi periode untuk data NYATA (mock punya anchor tetap sendiri) ─────── */

export function periodeSekarang(): { value: string; label: string }[] {
  const bulanIni = bulanWib();
  const [y, m] = bulanIni.split("-").map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const bulanLalu = `${prevY}-${String(prevM).padStart(2, "0")}`;
  return [
    { value: bulanIni, label: "Bulan ini" },
    { value: bulanLalu, label: "Bulan lalu" },
    { value: "30d", label: "30 hari" },
  ];
}
