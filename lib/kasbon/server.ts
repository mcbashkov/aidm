/**
 * Helper server kasbon (Batch 2, migrasi 0031). Pola otorisasinya sama
 * dengan lib/catat/server.ts: klien service-role + filter `user_id` di
 * SETIAP query, karena RLS tabel ini menolak anon/authenticated sepenuhnya.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { wibDayStartIso } from "@/lib/wib";
import type { ItemBarang, Transaction } from "@/lib/transactions";
import type { KasbonItem, KasbonRingkas, KasbonTipe } from "@/lib/kasbon/tipe";

export interface KasbonRow {
  id: string;
  tipe: KasbonTipe;
  pihak: string | null;
  amount: number | null;
  kategori_id: string | null;
  items: ItemBarang[] | null;
  catatan: string | null;
  occurred_at: string;
  source: "chat" | "voice" | "manual";
  parsed_by: Transaction["parsedBy"];
  status: "draft" | "aktif" | "lunas" | "dihapus";
}

export const KASBON_COLUMNS =
  "id, tipe, pihak, amount, kategori_id, items, catatan, occurred_at, source, parsed_by, status";

/** UUID v4-ish. Id yang bukan UUID langsung 404 — tanpa ini Postgres
 *  melempar 22P02 dan pengguna melihat 500 untuk tautan yang sekadar salah. */
export function idSah(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export const jenisDariTipe = (tipe: KasbonTipe): Transaction["jenis"] =>
  tipe === "piutang" ? "masuk" : "keluar";

/**
 * Baris kasbon → bentuk kartu entri Catat. Sengaja memakai bentuk
 * `Transaction` supaya thread tetap satu jenis kartu, plus penanda `kasbon`
 * yang membuat kartunya berkata jujur: "belum masuk laporan".
 */
export function kasbonKeEntri(
  row: KasbonRow,
  byId: Map<string, string>,
): Transaction & { kasbon: KasbonRingkas } {
  return {
    id: row.id,
    jenis: jenisDariTipe(row.tipe),
    amount: row.amount ?? 0,
    kategori: (row.kategori_id && byId.get(row.kategori_id)) || "lainnya",
    subKategori: null,
    paymentMethod: "tunai",
    catatan: row.catatan,
    occurredAt: row.occurred_at,
    source: row.source,
    parsedBy: row.parsed_by,
    status: row.status === "draft" ? "draft" : "confirmed",
    kasbon: { tipe: row.tipe, pihak: row.pihak, lunas: row.status === "lunas" },
  };
}

export function kasbonKeItem(
  row: KasbonRow,
  byId: Map<string, string>,
): KasbonItem {
  return {
    id: row.id,
    tipe: row.tipe,
    pihak: row.pihak,
    amount: row.amount ?? 0,
    kategori: (row.kategori_id && byId.get(row.kategori_id)) || "lainnya",
    catatan: row.catatan,
    occurredAt: row.occurred_at,
    items: row.items,
  };
}

/** Kasbon yang DIBUAT hari ini (WIB), termasuk draft & terhapus — ikut batas
 *  200 entri/hari (§7.2), karena kasbon juga entri yang lahir dari Catat. */
export async function kasbonDibuatHariIni(
  supa: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count } = await supa
    .from("kasbon")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", wibDayStartIso());
  return count ?? 0;
}
