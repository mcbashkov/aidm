/**
 * Validasi server-side keluaran parser (§7.2 alur #4 / §9.2): "bukan hanya
 * percaya LLM". Semua entri — dari LLM maupun fallback — melewati saringan
 * ini sebelum menyentuh database.
 *
 * Sikap dasar: koreksi yang bisa dikoreksi (kategori asing → `lainnya`,
 * tanggal masa depan → hari ini), buang yang tidak bisa (jenis bukan
 * masuk/keluar), dan JANGAN PERNAH mengarang nominal (angka rusak → null →
 * draft + pertanyaan).
 */

import {
  KATEGORI_MASUK,
  KATEGORI_KELUAR,
  type Jenis,
  type PaymentMethod,
} from "@/lib/transactions";
import { todayWib } from "@/lib/wib";

export interface ValidatedEntry {
  jenis: Jenis;
  amount: number | null; // null = draft menunggu nominal
  kategori: string; // slug taksonomi yang SUDAH dijamin sah
  subKategori: string | null;
  paymentMethod: PaymentMethod;
  occurredAt: string; // YYYY-MM-DD, dijamin ≤ hari ini WIB
  catatan: string;
  confidence: number;
  status: "confirmed" | "draft";
}

export interface ValidatedResult {
  entries: ValidatedEntry[];
  pertanyaan: string | null;
  tidakDikenali: string | null;
}

/** Batas kewarasan nominal — di atas ini hampir pasti halusinasi parser. */
const AMOUNT_MAX = 10_000_000_000; // Rp10 miliar
/** Batas entri per kalimat — anti-abuse & anti-halusinasi array panjang. */
const MAX_ENTRIES = 10;

const SLUG_MASUK = new Set(KATEGORI_MASUK.map((k) => k.slug));
const SLUG_KELUAR = new Set(KATEGORI_KELUAR.map((k) => k.slug));

function validAmount(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n <= 0 || n > AMOUNT_MAX) return null;
  return n;
}

function validKategori(v: unknown, jenis: Jenis): string {
  const slug = typeof v === "string" ? v.trim().toLowerCase() : "";
  const sah = jenis === "masuk" ? SLUG_MASUK : SLUG_KELUAR;
  return sah.has(slug) ? slug : "lainnya";
}

function validMetode(v: unknown): PaymentMethod {
  return v === "qris" || v === "transfer" || v === "ewallet" ? v : "tunai";
}

function validTanggal(v: unknown, today: string): string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return today;
  const t = Date.parse(`${v}T00:00:00Z`);
  if (!Number.isFinite(t)) return today;
  // occurred_at tidak boleh melebihi hari ini (§17.1) — masa depan di-clamp.
  return v > today ? today : v;
}

/** Bentuk longgar yang mungkin dikirim parser (LLM bisa saja menyimpang). */
export interface RawEntry {
  jenis?: unknown;
  amount?: unknown;
  kategori?: unknown;
  sub_kategori?: unknown;
  payment_method?: unknown;
  paymentMethod?: unknown;
  occurred_at?: unknown;
  occurredAt?: unknown;
  catatan?: unknown;
  confidence?: unknown;
}

export function validateEntries(
  raw: RawEntry[],
  today: string,
): ValidatedEntry[] {
  const out: ValidatedEntry[] = [];
  for (const e of raw.slice(0, MAX_ENTRIES)) {
    // Jenis tidak bisa dikoreksi tanpa menebak arah uang — entri dibuang.
    if (e.jenis !== "masuk" && e.jenis !== "keluar") continue;
    const jenis = e.jenis as Jenis;

    const amount = validAmount(e.amount);
    out.push({
      jenis,
      amount,
      kategori: validKategori(e.kategori, jenis),
      subKategori:
        typeof e.sub_kategori === "string" && e.sub_kategori.trim()
          ? e.sub_kategori.trim().slice(0, 80)
          : null,
      paymentMethod: validMetode(e.payment_method ?? e.paymentMethod),
      occurredAt: validTanggal(e.occurred_at ?? e.occurredAt, today),
      catatan:
        typeof e.catatan === "string" ? e.catatan.trim().slice(0, 200) : "",
      confidence:
        typeof e.confidence === "number" &&
        e.confidence >= 0 &&
        e.confidence <= 1
          ? e.confidence
          : 0.5,
      status: amount === null ? "draft" : "confirmed",
    });
  }
  return out;
}
