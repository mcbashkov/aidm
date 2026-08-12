/**
 * Data mock pencatatan keuangan untuk frontend v3.0.
 *
 * SEMENTARA: dipakai sampai parser (§7.2) dan agregasi server (§9.3) jadi.
 * Setiap fungsi di sini punya padanan endpoint nyata nanti — bentuk datanya
 * sengaja dibuat sama seperti kontrak API §11 supaya penggantinya tinggal
 * menukar sumber, bukan menulis ulang komponen.
 *
 * Tanggal berpatokan pada ANCHOR TETAP, bukan `new Date()`. Alasannya:
 * halaman ini dirender di server lalu dihidrasi di klien — bila keduanya
 * memanggil `new Date()` di sisi tengah malam, markup bisa berbeda dan React
 * melempar hydration mismatch. Anchor tetap juga membuat angka demo stabil
 * setiap kali dibuka.
 */

import {
  isTerverifikasi,
  kategoriLabel,
  type Jenis,
  type PaymentMethod,
  type Transaction,
} from "@/lib/transactions";

/** Hari "ini" untuk seluruh data mock. */
export const MOCK_ANCHOR = "2026-08-12";

const ANCHOR_MS = new Date(`${MOCK_ANCHOR}T00:00:00+07:00`).getTime();
const HARI_MS = 86_400_000;

/** PRNG deterministik (mulberry32) — angka terlihat organik tapi selalu sama. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

/** Bulatkan ke ribuan terdekat — nominal warung jarang berujung ratusan. */
function ribuan(n: number): number {
  return Math.max(1000, Math.round(n / 1000) * 1000);
}

function isoAt(dayOffset: number, jam: number, menit: number): string {
  const ms = ANCHOR_MS - dayOffset * HARI_MS + jam * 3_600_000 + menit * 60_000;
  return new Date(ms).toISOString();
}

/* ── Generator dataset ───────────────────────────────────────────────────── */

const CATATAN_MASUK = [
  "penjualan pagi",
  "jual nasi goreng 3 porsi",
  "penjualan siang",
  "pesanan katering kantor",
  "penjualan sore",
  "jual es teh + gorengan",
];

const CATATAN_KELUAR: Record<string, string[]> = {
  bahan_baku: ["belanja beras & telur", "stok ayam", "belanja sayur di pasar", "gas elpiji"],
  operasional: ["bayar listrik", "beli pulsa", "token listrik", "air galon"],
  transportasi: ["bensin motor", "ongkir belanja", "parkir pasar"],
  peralatan: ["beli wajan baru", "ganti kompor"],
  pemasaran: ["cetak spanduk", "iklan Instagram"],
  pribadi: ["uang jajan anak", "keperluan rumah"],
  gaji: ["gaji karyawan mingguan"],
  lainnya: ["pengeluaran lain"],
};

const METODE_MASUK: PaymentMethod[] = [
  "tunai", "tunai", "tunai", "qris", "qris", "transfer", "ewallet",
];
const METODE_KELUAR: PaymentMethod[] = ["tunai", "tunai", "qris", "transfer"];

function buatDataset(): Transaction[] {
  const out: Transaction[] = [];
  const r = rng(20260812);
  let seq = 0;

  // 75 hari ke belakang supaya "bulan lalu" punya data pembanding penuh.
  for (let day = 0; day < 75; day++) {
    // Satu hari libur tiap ~9 hari — hari aktif tidak boleh 100%, kalau tidak
    // metrik "hari aktif tercatat" di laporan jadi tidak masuk akal.
    if (day % 9 === 4) continue;

    const jmlMasuk = 1 + Math.floor(r() * 3);
    for (let i = 0; i < jmlMasuk; i++) {
      const kategori = r() < 0.85 ? "penjualan" : "jasa";
      out.push({
        id: `mock-tx-${++seq}`,
        jenis: "masuk",
        amount: ribuan(90_000 + r() * 260_000),
        kategori,
        paymentMethod: pick(r, METODE_MASUK),
        catatan: pick(r, CATATAN_MASUK),
        occurredAt: isoAt(day, 8 + i * 4, Math.floor(r() * 60)),
        source: r() < 0.25 ? "voice" : "chat",
        parsedBy: r() < 0.06 ? "fallback" : "llm",
        status: "confirmed",
      });
    }

    const jmlKeluar = Math.floor(r() * 3);
    for (let i = 0; i < jmlKeluar; i++) {
      const kategori = pick(r, [
        "bahan_baku", "bahan_baku", "bahan_baku",
        "operasional", "operasional",
        "transportasi", "pemasaran", "pribadi", "peralatan",
      ]);
      out.push({
        id: `mock-tx-${++seq}`,
        jenis: "keluar",
        amount: ribuan(15_000 + r() * 160_000),
        kategori,
        paymentMethod: pick(r, METODE_KELUAR),
        catatan: pick(r, CATATAN_KELUAR[kategori] ?? ["pengeluaran"]),
        occurredAt: isoAt(day, 7 + i * 5, Math.floor(r() * 60)),
        source: r() < 0.2 ? "voice" : "chat",
        parsedBy: "llm",
        status: "confirmed",
      });
    }

    // Gaji mingguan
    if (day % 7 === 2) {
      out.push({
        id: `mock-tx-${++seq}`,
        jenis: "keluar",
        amount: 350_000,
        kategori: "gaji",
        paymentMethod: "tunai",
        catatan: "gaji karyawan mingguan",
        occurredAt: isoAt(day, 17, 0),
        source: "chat",
        parsedBy: "llm",
        status: "confirmed",
      });
    }
  }

  return out.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

let cache: Transaction[] | null = null;

/** Seluruh transaksi mock, terbaru dulu. */
export function getTransactions(): Transaction[] {
  if (!cache) cache = buatDataset();
  return cache;
}

/* ── Periode (§7.3 pemilih periode) ──────────────────────────────────────── */

export interface PeriodOption {
  value: string;
  label: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "2026-08", label: "Bulan ini" },
  { value: "2026-07", label: "Bulan lalu" },
  { value: "30d", label: "30 hari" },
];

export function periodLabel(value: string): string {
  return PERIOD_OPTIONS.find((p) => p.value === value)?.label ?? value;
}

/** Periode pembanding untuk panah naik/turun di kartu ringkasan. */
export function periodeSebelumnya(period: string): string | null {
  if (period === "2026-08") return "2026-07";
  if (period === "2026-07") return "2026-06";
  return null;
}

function dalamPeriode(tx: Transaction, period: string): boolean {
  const t = new Date(tx.occurredAt).getTime();
  if (period === "30d") return t >= ANCHOR_MS - 30 * HARI_MS;
  const d = new Date(tx.occurredAt);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return key === period;
}

export function transaksiPeriode(period: string): Transaction[] {
  return getTransactions().filter(
    (t) => t.status !== "deleted" && dalamPeriode(t, period),
  );
}

/* ── Agregasi (padanan GET /api/laporan) ─────────────────────────────────── */

export interface Ringkasan {
  masuk: number;
  keluar: number;
  sisa: number;
  jmlTransaksi: number;
  hariAktif: number;
  masukTerverifikasi: number;
  rasioTerverifikasi: number; // 0..1 dari nilai pemasukan
}

export function ringkas(txs: Transaction[]): Ringkasan {
  let masuk = 0;
  let keluar = 0;
  let masukTerverifikasi = 0;
  const hari = new Set<string>();

  for (const t of txs) {
    hari.add(t.occurredAt.slice(0, 10));
    if (t.jenis === "masuk") {
      masuk += t.amount;
      if (isTerverifikasi(t.paymentMethod)) masukTerverifikasi += t.amount;
    } else {
      keluar += t.amount;
    }
  }

  return {
    masuk,
    keluar,
    sisa: masuk - keluar,
    jmlTransaksi: txs.length,
    hariAktif: hari.size,
    masukTerverifikasi,
    rasioTerverifikasi: masuk > 0 ? masukTerverifikasi / masuk : 0,
  };
}

/** Ringkasan hari terakhir (kartu "hari ini" di Beranda, §13 layar 2). */
export function ringkasHariIni(): Ringkasan {
  const txs = getTransactions().filter(
    (t) => t.status !== "deleted" && t.occurredAt.slice(0, 10) === MOCK_ANCHOR,
  );
  return ringkas(txs);
}

export interface TitikHarian {
  tanggal: string; // ISO date
  masuk: number;
  keluar: number;
}

/** Deret harian untuk grafik arus kas (§7.3 #3). */
export function seriesHarian(period: string): TitikHarian[] {
  const txs = transaksiPeriode(period);
  const byDay = new Map<string, TitikHarian>();

  for (const t of txs) {
    const key = t.occurredAt.slice(0, 10);
    const cur = byDay.get(key) ?? { tanggal: key, masuk: 0, keluar: 0 };
    if (t.jenis === "masuk") cur.masuk += t.amount;
    else cur.keluar += t.amount;
    byDay.set(key, cur);
  }

  return [...byDay.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

export interface BarisKategori {
  slug: string;
  nama: string;
  total: number;
  persen: number; // 0..1
}

/** Rincian kategori 5 teratas per jenis (§7.3 #4). */
export function breakdownKategori(
  period: string,
  jenis: Jenis,
  limit = 5,
): BarisKategori[] {
  const txs = transaksiPeriode(period).filter((t) => t.jenis === jenis);
  const total = txs.reduce((s, t) => s + t.amount, 0);
  const byKat = new Map<string, number>();

  for (const t of txs) {
    byKat.set(t.kategori, (byKat.get(t.kategori) ?? 0) + t.amount);
  }

  return [...byKat.entries()]
    .map(([slug, nilai]) => ({
      slug,
      nama: kategoriLabel(jenis, slug),
      total: nilai,
      persen: total > 0 ? nilai / total : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Transaksi terbaru (Beranda menampilkan 3 — §13 layar 2). */
export function transaksiTerakhir(n = 3): Transaction[] {
  return getTransactions()
    .filter((t) => t.status !== "deleted")
    .slice(0, n);
}

/* ── Segel laporan (§7.5) — semua periode belum tersegel di mock ─────────── */

export interface SealState {
  status: "belum" | "pending" | "tersegel";
  hash?: string;
  txHash?: string;
  sealedAt?: string;
}

export function statusSegel(period: string): SealState {
  // Bulan berjalan tidak boleh disegel (§7.5 ketentuan) — periode lampau di
  // mock pun sengaja "belum" supaya alur segel diuji dari nol saat backend siap.
  void period;
  return { status: "belum" };
}

/** Bulan berjalan tidak bisa disegel (§7.5 ketentuan). */
export function bolehSegel(period: string): boolean {
  return period !== "2026-08" && period !== "30d";
}

/* ── Progres valuasi usaha (§7.9 kartu terkunci) ─────────────────────────── */

export const VALUASI_BUTUH_BULAN = 6;

export function bulanTercatat(): number {
  const txs = getTransactions().filter((t) => t.status !== "deleted");
  const bulan = new Set(txs.map((t) => t.occurredAt.slice(0, 7)));
  return bulan.size;
}
