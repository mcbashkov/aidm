/**
 * Pembungkus klien untuk API pencatatan (§11). Satu bentuk hasil untuk semua
 * panggilan: `ok` membedakan sukses/gagal, `demo` menandai server belum
 * dikonfigurasi (401 tanpa sesi / 501 tanpa Supabase) — pemanggil lalu jatuh
 * ke jalur demo lokal supaya UI tetap bisa dicoba tanpa backend.
 */

import type { Transaction } from "@/lib/transactions";

export interface CatatResponse {
  entries: Transaction[];
  pertanyaan: string | null;
  tidak_dikenali: string | null;
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

export type ApiHasil<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; demo: boolean; offline: boolean };

async function panggil<T>(
  input: string,
  init?: RequestInit,
): Promise<ApiHasil<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const body = (await res.json().catch(() => ({}))) as T & {
      error?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: body.error ?? `HTTP ${res.status}`,
        demo: res.status === 401 || res.status === 501,
        offline: false,
      };
    }
    return { ok: true, data: body };
  } catch {
    // Jaringan putus di tengah jalan — pemanggil mengantrekan ulang.
    return { ok: false, status: 0, error: "offline", demo: false, offline: true };
  }
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
): Promise<ApiHasil<{ ok: boolean; entry?: Transaction; pertanyaan?: string }>> {
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

/* ── Opsi periode untuk data NYATA (mock punya anchor tetap sendiri) ─────── */

export function periodeSekarang(): { value: string; label: string }[] {
  const now = new Date(Date.now() + 7 * 3600_000); // WIB
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const bulanIni = `${y}-${String(m).padStart(2, "0")}`;
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const bulanLalu = `${prevY}-${String(prevM).padStart(2, "0")}`;
  return [
    { value: bulanIni, label: "Bulan ini" },
    { value: bulanLalu, label: "Bulan lalu" },
    { value: "30d", label: "30 hari" },
  ];
}
