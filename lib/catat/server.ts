/**
 * Helper server bersama untuk API pencatatan (§11). Semua route transaksi
 * memakai identitas dari cookie sesi + klien service-role; otorisasi
 * per-baris ditegakkan dengan filter `user_id` di SETIAP query (pola RLS
 * proyek ini — lihat 0011: "otorisasi identitas Privy di lapisan API").
 */

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import type { Transaction } from "@/lib/transactions";

export function currentUserId(): string | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  return readSessionValue(raw)?.uid ?? null;
}

/* ── Peta kategori slug ↔ id ─────────────────────────────────────────────── */
// Taksonomi transaksi hidup di tabel `categories` (0012). Isinya nyaris tak
// pernah berubah → cache per proses 5 menit, hemat satu query per request.

export interface KategoriMaps {
  bySlug: Map<string, string>;
  byId: Map<string, string>;
}

let kategoriCache: { maps: KategoriMaps; at: number } | null = null;
const KATEGORI_TTL_MS = 5 * 60_000;

export async function getKategoriMaps(
  supa: SupabaseClient,
): Promise<KategoriMaps> {
  if (kategoriCache && Date.now() - kategoriCache.at < KATEGORI_TTL_MS) {
    return kategoriCache.maps;
  }
  const { data } = await supa.from("categories").select("id, slug");
  const bySlug = new Map<string, string>();
  const byId = new Map<string, string>();
  for (const row of data ?? []) {
    bySlug.set(row.slug as string, row.id as string);
    byId.set(row.id as string, row.slug as string);
  }
  const maps = { bySlug, byId };
  if (bySlug.size > 0) kategoriCache = { maps, at: Date.now() };
  return maps;
}

/* ── Baris DB → bentuk Transaction yang dipakai UI ───────────────────────── */

export interface TxRow {
  id: string;
  jenis: "masuk" | "keluar";
  amount: number | null;
  kategori_id: string | null;
  sub_kategori: string | null;
  payment_method: Transaction["paymentMethod"];
  catatan: string | null;
  occurred_at: string;
  source: Transaction["source"];
  parsed_by: Transaction["parsedBy"];
  status: Transaction["status"];
}

export const TX_COLUMNS =
  "id, jenis, amount, kategori_id, sub_kategori, payment_method, catatan, occurred_at, source, parsed_by, status";

export function rowToTx(row: TxRow, byId: Map<string, string>): Transaction {
  return {
    id: row.id,
    jenis: row.jenis,
    // Draft tanpa nominal → 0 di UI (kartu menampilkan pertanyaan, bukan Rp0
    // sebagai fakta) — konsisten dengan tipe Transaction yang non-null.
    amount: row.amount ?? 0,
    kategori: (row.kategori_id && byId.get(row.kategori_id)) || "lainnya",
    subKategori: row.sub_kategori,
    paymentMethod: row.payment_method,
    catatan: row.catatan,
    occurredAt: row.occurred_at,
    source: row.source,
    parsedBy: row.parsed_by,
    status: row.status,
  };
}

/* ── Batas & waktu WIB ───────────────────────────────────────────────────── */

/** Batas anti-abuse §7.2: maks 200 entri/user/hari (dihitung dari created_at). */
export const CATAT_DAILY_LIMIT = 200;

/** Awal hari WIB berjalan sebagai ISO — batas hitung kuota harian. */
export function wibDayStartIso(now = new Date()): string {
  const wib = new Date(now.getTime() + 7 * 3600_000);
  const startUtcMs =
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) -
    7 * 3600_000;
  return new Date(startUtcMs).toISOString();
}

/** Jumlah entri yang DIBUAT user hari ini (WIB) — termasuk draft & terhapus:
 *  kuota mengukur pembuatan, bukan sisa, supaya hapus-tulis tidak menembus batas. */
export async function entriDibuatHariIni(
  supa: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supa
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", wibDayStartIso());
  return count ?? 0;
}
