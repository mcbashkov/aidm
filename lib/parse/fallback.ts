/**
 * Parser cadangan berbasis aturan (§7.2 ketentuan: "kalau LLM gagal/timeout →
 * fallback ke parser regex sederhana sehingga entri tetap bisa tersimpan").
 *
 * Sementara ini juga menyalakan UI tab Catat sebelum parser LLM (§9.2) jadi.
 * Kemampuannya sengaja terbatas dan JUJUR: kalau nominal tidak ditemukan, ia
 * bertanya — tidak pernah menebak angka (§7.2 "dilarang mengarang nominal").
 */

import type { EarnerType } from "@/lib/earner";
import type { Jenis, PaymentMethod } from "@/lib/transactions";

export interface ParsedEntry {
  jenis: Jenis;
  amount: number | null;
  kategori: string;
  paymentMethod: PaymentMethod;
  occurredAt: string; // YYYY-MM-DD
  catatan: string;
  confidence: number;
}

export interface ParseResult {
  entries: ParsedEntry[];
  pertanyaan: string | null;
  tidakDikenali: string | null;
}

/* ── Angka gaya Indonesia (§7.2: 45rb · 45.000 · 45k · Rp45.000 · 1,5jt) ─── */

const ANGKA_RE =
  /(?:rp\s?)?(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[,.]\d+)?)\s*(jt|juta|rb|ribu|k)?/i;

function bacaNominal(teks: string): number | null {
  const m = ANGKA_RE.exec(teks);
  if (!m) return null;

  const [, angkaRaw, satuan] = m;
  const punyaPemisahRibuan = /[.\s]\d{3}/.test(angkaRaw);

  let n: number;
  if (punyaPemisahRibuan) {
    // "45.000" → titik = pemisah ribuan, bukan desimal.
    n = Number(angkaRaw.replace(/[.\s]/g, ""));
  } else {
    // "1,5" dan "1.5" sama-sama desimal di sini karena tidak diikuti 3 digit.
    n = Number(angkaRaw.replace(",", "."));
  }
  if (!Number.isFinite(n)) return null;

  const s = satuan?.toLowerCase();
  if (s === "jt" || s === "juta") n *= 1_000_000;
  else if (s === "rb" || s === "ribu" || s === "k") n *= 1_000;

  const bulat = Math.round(n);
  return bulat > 0 ? bulat : null;
}

/* ── Arah uang ───────────────────────────────────────────────────────────── */

const KATA_KELUAR = [
  "beli", "bayar", "belanja", "bensin", "servis", "stok", "modal", "ongkir",
  "iklan", "gaji", "sewa", "pulsa", "token", "keluar", "isi ", "biaya",
  "cicilan", "setor", "jajan", "parkir", "makan",
];
const KATA_MASUK = [
  "jual", "dapet", "dapat", "terima", "masuk", "penjualan", "omzet", "narik",
  "dibayar", "laku", "pemasukan", "orderan", "order", "cair", "komisi", "gajian",
];

function tebakJenis(teks: string): Jenis {
  const t = teks.toLowerCase();
  const skorKeluar = KATA_KELUAR.filter((k) => t.includes(k)).length;
  const skorMasuk = KATA_MASUK.filter((k) => t.includes(k)).length;
  // Seri → anggap pemasukan: pelaku mikro lebih sering mencatat penjualan,
  // dan salah-tebak ke arah pemasukan lebih mudah dikenali saat ditinjau.
  return skorKeluar > skorMasuk ? "keluar" : "masuk";
}

/* ── Metode bayar (§17.1 aturan parser) ──────────────────────────────────── */

function tebakMetode(teks: string): PaymentMethod {
  const t = teks.toLowerCase();
  if (/\bqris\b|\bscan\b|\bqr\b/.test(t)) return "qris";
  if (/\btransfer\b|\btf\b|\brekening\b|\bbank\b/.test(t)) return "transfer";
  if (/\bovo\b|\bgopay\b|\bdana\b|\bshopeepay\b|\be-?wallet\b|\blinkaja\b/.test(t))
    return "ewallet";
  return "tunai";
}

/* ── Kategori (§10 taksonomi; ragu → lainnya, dilarang mengarang) ────────── */

const KATEGORI_KELUAR_RULES: [RegExp, string][] = [
  [/bensin|solar|pertalite|pertamax|bbm/, "operasional"],
  [/listrik|token|air|pulsa|wifi|internet|sewa|gas|elpiji/, "operasional"],
  [/servis|bengkel|oli|ban/, "operasional"],
  [/beras|telur|ayam|sayur|daging|bahan|stok|belanja|kulakan|restock/, "bahan_baku"],
  [/gaji|karyawan|upah|pegawai/, "gaji"],
  [/ongkir|ongkos|grab|gojek|angkot|parkir|tol|transport/, "transportasi"],
  [/iklan|promo|spanduk|banner|ads|endorse|pemasaran/, "pemasaran"],
  [/alat|mesin|kompor|wajan|etalase|peralatan|hp |laptop|lisensi|software/, "peralatan"],
  [/jajan|pribadi|keluarga|anak|rumah|sekolah/, "pribadi"],
];

const KATEGORI_MASUK_RULES: [RegExp, string][] = [
  [/narik|ojek|orderan|order|penumpang|setoran/, "ojek"],
  [/komisi|bonus|insentif|referral/, "komisi"],
  [/jasa|servis|desain|les|ngajar|perbaikan|klien|proyek|termin/, "jasa"],
  [/jual|penjualan|laku|omzet|dagang|toko|warung|shopee|tokopedia|tiktok/, "penjualan"],
];

function tebakKategori(
  teks: string,
  jenis: Jenis,
  earner?: EarnerType,
): string {
  const t = teks.toLowerCase();
  const rules = jenis === "masuk" ? KATEGORI_MASUK_RULES : KATEGORI_KELUAR_RULES;
  for (const [re, slug] of rules) {
    if (re.test(t)) return slug;
  }
  // Tidak ada kata kunci yang cocok → pakai kebiasaan peran, baru menyerah ke
  // `lainnya`. Ini menebak KATEGORI (bisa dikoreksi sekali ketuk), bukan
  // nominal — yang terakhir itu tidak pernah boleh ditebak.
  if (jenis === "masuk") {
    if (earner === "ojol") return "ojek";
    if (earner === "freelance") return "jasa";
    if (earner === "dagang" || earner === "online") return "penjualan";
    return "lainnya";
  }
  return "lainnya";
}

/* ── Waktu relatif (§7.2 ketentuan) ──────────────────────────────────────── */

function geserHari(isoDate: string, hari: number): string {
  const d = new Date(`${isoDate}T00:00:00+07:00`);
  d.setDate(d.getDate() - hari);
  return d.toISOString().slice(0, 10);
}

function tebakTanggal(teks: string, today: string): string {
  const t = teks.toLowerCase();
  if (/kemarin lusa|2 hari (yang )?lalu/.test(t)) return geserHari(today, 2);
  if (/kemarin/.test(t)) return geserHari(today, 1);
  if (/minggu (yang )?lalu|pekan lalu/.test(t)) return geserHari(today, 7);
  const nHari = /(\d+)\s*hari (yang )?lalu/.exec(t);
  if (nHari) return geserHari(today, Math.min(365, Number(nHari[1])));
  return today; // termasuk "tadi pagi", "tadi siang", "hari ini"
}

/* ── Pemisahan klausa: satu kalimat → banyak entri (§7.2 prinsip #1) ─────── */

function pecahKlausa(teks: string): string[] {
  return teks
    .split(/\s*(?:,|;|\bdan\b|\blalu\b|\bterus\b|\bkemudian\b|\+)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function bersihkanCatatan(klausa: string): string {
  const s = klausa
    .replace(ANGKA_RE, "")
    .replace(/\b(bayar|pakai|pake|via)?\s*(qris|transfer|tf|ovo|gopay|dana|shopeepay)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return (s || klausa).slice(0, 80);
}

/* ── Entri utama ─────────────────────────────────────────────────────────── */

export function parseFallback(
  text: string,
  opts: { today: string; earner?: EarnerType },
): ParseResult {
  const bersih = text.trim();
  if (!bersih) {
    return { entries: [], pertanyaan: null, tidakDikenali: null };
  }

  const klausa = pecahKlausa(bersih);
  const metodeGlobal = tebakMetode(bersih);
  const tanggalGlobal = tebakTanggal(bersih, opts.today);
  const entries: ParsedEntry[] = [];

  for (const k of klausa) {
    const amount = bacaNominal(k);
    // Klausa tanpa angka biasanya keterangan ("bayar QRIS"), bukan peristiwa
    // uang tersendiri — lewati agar tidak lahir entri hantu.
    if (amount === null && klausa.length > 1) continue;

    const jenis = tebakJenis(k);
    entries.push({
      jenis,
      amount,
      kategori: tebakKategori(k, jenis, opts.earner),
      paymentMethod: tebakMetode(k) === "tunai" ? metodeGlobal : tebakMetode(k),
      occurredAt: tebakTanggal(k, opts.today) || tanggalGlobal,
      catatan: bersihkanCatatan(k),
      confidence: amount === null ? 0.4 : 0.7, // fallback selalu di bawah LLM
    });
  }

  if (entries.length === 0) {
    return {
      entries: [],
      pertanyaan: null,
      tidakDikenali:
        "Aku belum menangkap transaksi dari kalimat itu. Coba sebutkan nominalnya, misal “jual 3 nasi goreng 45rb”.",
    };
  }

  // Kalau ragu, tanya SATU hal saja (§7.2 prinsip #3).
  const tanpaNominal = entries.find((e) => e.amount === null);
  return {
    entries,
    pertanyaan: tanpaNominal
      ? `Berapa nominal untuk “${tanpaNominal.catatan}”?`
      : null,
    tidakDikenali: null,
  };
}
