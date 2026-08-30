/**
 * Helper server bersama untuk API pencatatan (§11). Semua route transaksi
 * memakai identitas dari cookie sesi + klien service-role; otorisasi
 * per-baris ditegakkan dengan filter `user_id` di SETIAP query (pola RLS
 * proyek ini — lihat 0011: "otorisasi identitas Privy di lapisan API").
 */

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readSessionValue } from "@/lib/auth/session-cookie";
import { wibDayStartIso } from "@/lib/wib";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import type { Transaction } from "@/lib/transactions";

export function currentUserId(): string | null {
  return currentSession()?.uid ?? null;
}

/**
 * Sesi lengkap — `uid` untuk otorisasi baris, `did` untuk bertanya ke Privy.
 * Dipakai jalur yang perlu mengisi alamat dompet susulan (lib/wallet/server.ts);
 * `currentUserId()` tetap ada karena mayoritas route hanya butuh uid.
 */
export function currentSession(): { uid: string; did: string } | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const sesi = readSessionValue(raw);
  return sesi?.uid ? { uid: sesi.uid, did: sesi.did } : null;
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

/**
 * Batas percakapan masuk per hari. Ada DI ATAS batas entri karena keduanya
 * menjaga hal berbeda: batas entri menjaga isi buku (§7.2), batas request
 * menjaga biaya parser LLM — kalimat yang tidak menghasilkan entri (sapaan,
 * teks acak) tidak menambah baris `transactions` sama sekali, jadi tanpa
 * penghitung ini ia bisa memanggil model berbayar tanpa pernah mentok.
 * Angkanya longgar: pengguna nyata tidak mengetik 400 kalimat sehari.
 */
export const CATAT_REQUEST_LIMIT = 400;

/**
 * Naikkan penghitung percakapan hari ini (WIB) secara ATOMIK dan kembalikan
 * nilai barunya. Atomik = bebas race check-then-act: dua request paralel
 * mustahil sama-sama membaca angka di bawah batas lalu lolos berdua.
 * Mengembalikan null bila RPC tidak tersedia — pemanggil memilih untuk tetap
 * melayani (batas entri masih berlaku), bukan memblokir pencatatan.
 */
/**
 * Batas laju per menit (§7.2 anti-abuse, migrasi 0028).
 *
 * Sepuluh dipilih dari data, bukan dari perasaan: produksi mencatat rata-rata
 * 2,82 permintaan per pengguna-HARI dan tertinggi 7. Sepuluh per MENIT berada
 * jauh di atas langit-langit manusia dan jauh di bawah kecepatan skrip — yang
 * terhalang hanya yang kedua.
 */
export const CATAT_RATE_PER_MENIT = 10;
export const CATAT_RATE_JENDELA_DETIK = 60;

/**
 * Naikkan penghitung jendela-menit. Mengembalikan jumlah permintaan dalam
 * jendela berjalan, atau `null` bila RPC belum ada — dan `null` sengaja
 * diperlakukan pemanggil sebagai "lewatkan", bukan "tolak": batas laju tidak
 * boleh menjadi alasan pencatatan berhenti total ketika ada yang salah dengan
 * penghitungnya sendiri.
 */
export async function naikkanRateMenit(
  supa: SupabaseClient,
  userId: string,
  tanggalWib: string,
): Promise<number | null> {
  const { data, error } = await supa.rpc("catat_rate_inc", {
    p_user: userId,
    p_tanggal: tanggalWib,
    p_jendela_detik: CATAT_RATE_JENDELA_DETIK,
  });
  if (error || typeof data !== "number") return null;
  return data;
}

/**
 * Naikkan hitungan offtopic hari ini dan kembalikan nilainya. Dipakai HANYA
 * untuk memilih panjang-pendek kalimat penolakan (lib/catat/pesan.ts) — bukan
 * untuk membatasi apa pun. `null` = tidak terhitung, dan pemanggil
 * memperlakukannya sebagai 0, yaitu versi kalimat yang paling ramah.
 */
export async function naikkanOfftopic(
  supa: SupabaseClient,
  userId: string,
  tanggalWib: string,
): Promise<number | null> {
  const { data, error } = await supa.rpc("catat_offtopic_inc", {
    p_user: userId,
    p_tanggal: tanggalWib,
  });
  if (error || typeof data !== "number") return null;
  return data;
}

export async function naikkanKuotaRequest(
  supa: SupabaseClient,
  userId: string,
  tanggalWib: string,
): Promise<number | null> {
  const { data, error } = await supa.rpc("catat_kuota_inc", {
    p_user: userId,
    p_tanggal: tanggalWib,
  });
  if (error || typeof data !== "number") return null;
  return data;
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
