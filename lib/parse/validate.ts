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
  type ItemBarang,
  type Jenis,
  type PaymentMethod,
  type StatusBayar,
} from "@/lib/transactions";
import { todayWib } from "@/lib/wib";
import { normalisasiPlatform, normalisasiSubKendaraan } from "@/lib/parse/platform";

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
  /** Nama lawan transaksi. Hanya DISIMPAN untuk kasbon — transaksi biasa
   *  tidak menyimpan nama orang ketiga sama sekali (migrasi 0031). */
  pihak: string | null;
  /** "belum" → tabel `kasbon`, tidak masuk laporan sampai lunas. */
  statusBayar: StatusBayar;
  items: ItemBarang[] | null;
}

import type { KodeTidakDikenali, Pertanyaan } from "@/lib/catat/pesan";

export interface ValidatedResult {
  entries: ValidatedEntry[];
  pertanyaan: Pertanyaan | null;
  tidakDikenali: KodeTidakDikenali | null;
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

/** Batas nama lawan transaksi — sama dengan constraint `kasbon.pihak`. */
const PIHAK_MAKS = 60;
/** Batas barang per entri dan panjang namanya. */
const ITEMS_MAKS = 10;
const NAMA_ITEM_MAKS = 60;

function validPihak(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  // Nama orang tidak memuat angka — "45rb" atau "Rp45.000" di field pihak
  // adalah nominal yang salah tempat, bukan nama.
  if (!t || /\d/.test(t)) return null;
  return t.slice(0, PIHAK_MAKS);
}

function validStatusBayar(v: unknown): StatusBayar {
  // Di luar enum → "lunas": perilaku sebelum kasbon ada. Salah ke arah ini
  // hanya berarti satu entri perlu dihapus; salah ke arah "belum" berarti
  // uang nyata hilang dari laporan.
  return v === "belum" ? "belum" : "lunas";
}

function validItems(v: unknown): ItemBarang[] | null {
  if (!Array.isArray(v)) return null;
  const out: ItemBarang[] = [];
  for (const it of v.slice(0, ITEMS_MAKS)) {
    if (!it || typeof it !== "object") continue;
    const o = it as { nama?: unknown; jumlah?: unknown };
    const nama =
      typeof o.nama === "string" ? o.nama.replace(/\s+/g, " ").trim() : "";
    if (!nama) continue;
    const jumlah =
      typeof o.jumlah === "number" &&
      Number.isFinite(o.jumlah) &&
      o.jumlah > 0 &&
      o.jumlah <= 1_000_000
        ? Math.round(o.jumlah * 1000) / 1000
        : null;
    out.push({ nama: nama.slice(0, NAMA_ITEM_MAKS), jumlah });
  }
  return out.length > 0 ? out : null;
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
  pihak?: unknown;
  status_bayar?: unknown;
  statusBayar?: unknown;
  items?: unknown;
}

/**
 * sub_kategori (Batch 10): untuk pemasukan `ojek` WAJIB salah satu platform
 * ternormalisasi atau null; untuk pengeluaran kendaraan dinormalkan ke
 * bbm|servis|cicilan|sewa|kuota|parkir bila cocok, selain itu teks bebas
 * (≤80) seperti sebelumnya — model boleh memberi sub lain yang berguna.
 */
function validSubKategori(v: unknown, jenis: Jenis, kategori: string): string | null {
  if (jenis === "masuk" && kategori === "ojek") return normalisasiPlatform(v);
  const teks = typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : null;
  if (!teks) return null;
  if (jenis === "keluar" && (kategori === "transportasi" || kategori === "operasional" || kategori === "peralatan")) {
    return normalisasiSubKendaraan(teks) ?? teks;
  }
  return teks;
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
      subKategori: validSubKategori(e.sub_kategori, jenis, validKategori(e.kategori, jenis)),
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
      pihak: validPihak(e.pihak),
      statusBayar: validStatusBayar(e.status_bayar ?? e.statusBayar),
      items: validItems(e.items),
    });
  }
  return out;
}
