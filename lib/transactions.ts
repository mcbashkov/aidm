/**
 * Domain pencatatan keuangan v3.0 (§7.2 / §10).
 *
 * Semua nominal adalah **integer rupiah**. Tidak ada float di mana pun untuk
 * uang (§12 integritas angka) — pembulatan float merusak total laporan yang
 * nantinya dibawa ke bank.
 */

export type Jenis = "masuk" | "keluar";
export type PaymentMethod = "tunai" | "qris" | "transfer" | "ewallet";
export type TxSource = "chat" | "voice" | "manual" | "import" | "ocr";
export type ParsedBy = "llm" | "fallback" | "manual";
export type TxStatus = "confirmed" | "draft" | "deleted";

export interface Transaction {
  id: string;
  jenis: Jenis;
  amount: number; // rupiah, integer
  kategori: string; // slug taksonomi (§10)
  subKategori?: string | null;
  paymentMethod: PaymentMethod;
  catatan?: string | null;
  occurredAt: string; // ISO
  source: TxSource;
  parsedBy: ParsedBy;
  status: TxStatus;
}

/* ── Taksonomi kategori (§10) ────────────────────────────────────────────── */
// Pemasukan & pengeluaran dipisah oleh kolom `jenis`, bukan tabel berbeda —
// karena itu slug `lainnya` sah muncul di kedua daftar.

export interface KategoriDef {
  slug: string;
  nama: string;
}

export const KATEGORI_MASUK: KategoriDef[] = [
  { slug: "penjualan", nama: "Penjualan" },
  { slug: "jasa", nama: "Jasa" },
  { slug: "ojek", nama: "Ojek" },
  { slug: "komisi", nama: "Komisi" },
  { slug: "lainnya", nama: "Lainnya" },
];

export const KATEGORI_KELUAR: KategoriDef[] = [
  { slug: "bahan_baku", nama: "Bahan baku" },
  { slug: "operasional", nama: "Operasional" },
  { slug: "gaji", nama: "Gaji" },
  { slug: "transportasi", nama: "Transportasi" },
  { slug: "peralatan", nama: "Peralatan" },
  { slug: "pemasaran", nama: "Pemasaran" },
  { slug: "pribadi", nama: "Pribadi" },
  { slug: "lainnya", nama: "Lainnya" },
];

export function kategoriList(jenis: Jenis): KategoriDef[] {
  return jenis === "masuk" ? KATEGORI_MASUK : KATEGORI_KELUAR;
}

export function kategoriLabel(jenis: Jenis, slug: string): string {
  return kategoriList(jenis).find((k) => k.slug === slug)?.nama ?? "Lainnya";
}

/* ── Metode bayar ────────────────────────────────────────────────────────── */

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "tunai", label: "Tunai" },
  { value: "qris", label: "QRIS" },
  { value: "transfer", label: "Transfer" },
  { value: "ewallet", label: "E-wallet" },
];

export function paymentLabel(m: PaymentMethod): string {
  return PAYMENT_METHODS.find((p) => p.value === m)?.label ?? "Tunai";
}

/**
 * Transaksi non-tunai = "terverifikasi" di laporan (§7.3 porsi terverifikasi).
 * Ini soal jejak pihak ketiga, bukan soal kebenaran angka — pembedaan yang
 * wajib dijaga di seluruh bahasa UI (§7.5 kejujuran teknis).
 */
export function isTerverifikasi(m: PaymentMethod): boolean {
  return m !== "tunai";
}

/* ── Format angka & tanggal (§7.3 ketentuan) ─────────────────────────────── */

/** Rupiah gaya Indonesia tanpa desimal: 180000 → "Rp180.000". */
export function formatRupiah(amount: number): string {
  return `Rp${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount))}`;
}

/** Rupiah bertanda untuk daftar transaksi: +Rp180.000 / −Rp25.000. */
export function formatRupiahSigned(amount: number, jenis: Jenis): string {
  return `${jenis === "masuk" ? "+" : "−"}${formatRupiah(amount)}`;
}

/** Ringkas untuk angka besar di kartu: 1250000 → "Rp1,25 jt". */
export function formatRupiahCompact(amount: number): string {
  if (Math.abs(amount) < 1_000_000) return formatRupiah(amount);
  return `Rp${new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "12 Agustus 2026" */
export function formatTanggalID(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Rabu, 12 Agustus" */
export function formatTanggalPanjangID(iso: string): string {
  const d = new Date(iso);
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`;
}

/** "12 Agu" — untuk baris daftar yang padat. */
export function formatTanggalPendekID(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)}`;
}

/** "Agustus 2026" dari period key "2026-08". */
export function formatPeriodeID(periodKey: string): string {
  const [y, m] = periodKey.split("-").map(Number);
  return `${BULAN[(m ?? 1) - 1]} ${y}`;
}

/** "08.30" — jam WIB dari ISO. */
export function formatJamID(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}.${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

/** Persentase bulat untuk perbandingan periode: 0.1234 → "12%". */
export function formatPersen(rasio: number): string {
  return `${Math.round(rasio * 100)}%`;
}
