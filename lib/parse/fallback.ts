/**
 * Parser cadangan berbasis aturan (§7.2: "kalau LLM gagal/timeout → fallback
 * ke parser regex sederhana sehingga entri tetap bisa tersimpan").
 *
 * Prinsip yang sama dengan parser LLM (§17.1):
 * - JUJUR soal nominal — kalau angka uang tidak ditemukan, bertanya, tidak
 *   pernah menebak (§7.2 "dilarang mengarang nominal").
 * - NOMINAL ≠ KUANTITAS. "jual 3 nasi goreng 45rb" → Rp45.000, bukan Rp3.
 *   Nominal adalah angka yang bersatu dengan penanda uang (rb/ribu/k/jt/juta/
 *   Rp), angka berformat ribuan (45.000), atau bilangan besar (≥1000). Angka
 *   telanjang kecil adalah kuantitas.
 * - Kalimat yang tidak menyebut uang sama sekali → `tidakDikenali`, bukan
 *   entri hantu atau pertanyaan nominal.
 *
 * Diuji oleh tests/parser-cases.json (200 kalimat, `pnpm test:parser`).
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

/* ── Normalisasi ringan: typo umum & singkatan chat ──────────────────────── */
// Diterapkan per KATA (bukan substring) supaya "seblak" tidak berubah jadi
// "sebli" dan sejenisnya. Daftar kecil dan konservatif — typo di luar daftar
// biar ditangani parser LLM.
const TYPO: Record<string, string> = {
  bli: "beli",
  bly: "beli",
  byr: "bayar",
  byar: "bayar",
  bayr: "bayar",
  blanja: "belanja",
  blnja: "belanja",
  bnsin: "bensin",
  bensn: "bensin",
  trima: "terima",
  trma: "terima",
  dpt: "dapat",
  dpet: "dapet",
  jualn: "jualan",
  pnjualan: "penjualan",
  penjualn: "penjualan",
  lstrik: "listrik",
  listrk: "listrik",
  tranfer: "transfer",
  trasfer: "transfer",
  trf: "tf",
  kris: "qris",
  malem: "malam",
  semalem: "semalam",
};

function normalisasi(teks: string): string {
  return teks
    .toLowerCase()
    .split(/\s+/)
    .map((w) => TYPO[w] ?? w)
    .join(" ");
}

/* ── Angka: kandidat nominal vs kuantitas ────────────────────────────────── */

interface KandidatAngka {
  nilai: number;
  /** 3 = pasti uang (rb/jt/Rp/format ribuan) · 2 = mungkin (bilangan ≥1000)
   *  · 1 = ambigu (100–999) · 0 = kuantitas (<100). */
  kekuatan: 0 | 1 | 2 | 3;
  index: number;
  raw: string;
}

// (?![a-z0-9%]) menutup tiga lubang: "2 kg" tidak boleh terbaca "2k + g"
// (unit harus berhenti di batas kata), "50%" bukan uang, dan "45rban" tidak
// setengah tertelan. `jam 8` / `nomor 45` disaring lewat konteks kiri.
const ANGKA_G =
  /(rp\.?\s*)?(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[,.]\d+)?)\s*(jt|juta|rb|ribu|k)?(?![a-z0-9%])/gi;

/** Konteks kiri yang menandakan angka BUKAN uang: jam, nomor, urutan. */
const BUKAN_UANG_KIRI =
  /(?:jam|jm|pukul|nomor|nomer|no\.?|resi|urutan|antrian|meja|ke)\s*$/;

/** Angka kata: "seratus ribu", "dua juta", "setengah juta", "sejuta". */
const SKALA: Record<string, number> = { ribu: 1_000, rb: 1_000, juta: 1_000_000, jt: 1_000_000 };
const DIGIT: Record<string, number> = {
  satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7,
  delapan: 8, sembilan: 9, sepuluh: 10, sebelas: 11, setengah: 0.5,
};

function angkaKata(teks: string): KandidatAngka | null {
  const t = teks
    .replace(/\bseratus\b/g, "satu ratus")
    .replace(/\bseribu\b/g, "satu ribu")
    .replace(/\bsejuta\b/g, "satu juta")
    .replace(/\bsetengah juta\b/g, "lima ratus ribu");
  const re =
    /\b((?:(?:satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus)\s*)+)(ribu|juta)\b/;
  const m = re.exec(t);
  if (!m) return null;

  const kata = m[1].trim().split(/\s+/);
  let total = 0;
  let cur = 0;
  for (const k of kata) {
    if (k === "puluh") cur = (cur || 1) * 10;
    else if (k === "belas") cur = (cur || 1) + 10;
    else if (k === "ratus") { total += (cur || 1) * 100; cur = 0; }
    else if (DIGIT[k] !== undefined) cur = DIGIT[k];
  }
  const dasar = total + cur;
  const nilai = Math.round((dasar || 1) * SKALA[m[2]]);
  return nilai > 0
    ? { nilai, kekuatan: 3, index: m.index, raw: m[0] }
    : null;
}

function kandidatAngka(teks: string): KandidatAngka[] {
  const out: KandidatAngka[] = [];
  ANGKA_G.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ANGKA_G.exec(teks)) !== null) {
    const [raw, rp, angkaRaw, satuan] = m;
    // "jam 8", "nomor 45", "pesanan no. 12" — angka administratif, bukan uang.
    if (!rp && !satuan && BUKAN_UANG_KIRI.test(teks.slice(0, m.index))) continue;

    const punyaPemisahRibuan = /[.\s]\d{3}/.test(angkaRaw);
    let n: number;
    if (punyaPemisahRibuan) {
      n = Number(angkaRaw.replace(/[.\s]/g, "")); // 45.000 → 45000
    } else {
      n = Number(angkaRaw.replace(",", ".")); // 1,5 → 1.5
    }
    if (!Number.isFinite(n)) continue;

    const s = satuan?.toLowerCase();
    if (s === "jt" || s === "juta") n *= 1_000_000;
    else if (s === "rb" || s === "ribu" || s === "k") n *= 1_000;

    const nilai = Math.round(n);
    if (nilai <= 0) continue;

    let kekuatan: KandidatAngka["kekuatan"];
    if (s || rp || punyaPemisahRibuan) kekuatan = 3;
    else if (nilai >= 1000) kekuatan = 2;
    else if (nilai >= 100) kekuatan = 1;
    else kekuatan = 0;

    out.push({ nilai, kekuatan, index: m.index, raw });
  }
  const kata = angkaKata(teks);
  if (kata) out.push(kata);
  return out;
}

/** Kandidat uang (kekuatan ≥2) sebuah klausa, urut posisi. */
function kandidatUang(teks: string): KandidatAngka[] {
  return kandidatAngka(teks)
    .filter((k) => k.kekuatan >= 2)
    .sort((a, b) => a.index - b.index);
}

/**
 * Nominal sebuah klausa = kandidat TERKUAT pertama, dan hanya bila kekuatan
 * ≥ 2. Angka telanjang <1000 dibiarkan jadi kuantitas — lebih baik bertanya
 * daripada mencatat Rp3 untuk "3 nasi goreng" (§7.2).
 */
export function bacaNominal(teks: string): number | null {
  const kandidat = kandidatAngka(teks);
  if (kandidat.length === 0) return null;
  const maxKekuatan = Math.max(...kandidat.map((k) => k.kekuatan));
  if (maxKekuatan < 2) return null;
  const menang = kandidat.find((k) => k.kekuatan === maxKekuatan);
  return menang ? menang.nilai : null;
}

/**
 * Untuk jawaban klarifikasi nominal (§7.2 alur #6): konteksnya SUDAH pasti
 * uang ("Berapa nominalnya?" → "500"), jadi angka telanjang kecil pun
 * diterima apa adanya.
 */
export function bacaNominalJawaban(teks: string): number | null {
  const norm = normalisasi(teks);
  const biasa = bacaNominal(norm);
  if (biasa !== null) return biasa;
  const kandidat = kandidatAngka(norm);
  return kandidat.length > 0 ? kandidat[0].nilai : null;
}

/* ── Arah uang: kata kunci KUAT (sinyal transaksi) & LEMAH (arah saja) ───── */
// Kata KUAT menandakan "ini peristiwa uang" meski nominal absen → draft +
// tanya. Kata LEMAH hanya ikut memberi arah bila nominal ADA — "udah makan
// belum?" tidak boleh melahirkan draft hanya karena kata "makan".

const KUAT_KELUAR = [
  "beli", "beliin", "belikan", "bayar", "belanja", "bensin", "servis", "stok",
  "nyetok", "kulakan", "restock", "modal", "ongkir", "iklan", "sewa",
  "cicilan", "utang", "tuku", "meser", "mayar", "langganan", "pajak", "iuran",
  "tagihan", "kasbon", "tambal", "perpanjang", "tebus", "ganti",
];
const KUAT_MASUK = [
  "jual", "jualan", "kejual", "dodolan", "dapet", "dapat", "terima",
  "penjualan", "omzet", "narik", "dibayar", "laku", "payu", "pemasukan",
  "orderan", "cair", "komisi", "gajian", "untung", "penghasilan", "borong",
];
const LEMAH_KELUAR = [
  "keluar", "biaya", "jajan", "parkir", "makan", "pulsa", "token", "listrik",
  "gaji", "upah", "kasih", "ngasih", "setor", "isi", "ongkos", "kuota",
  "galon", "kopi", "rokok", "bayarin", "wifi", "internet", "oli", "kampas",
  "admin", "potong", "dipotong", "abis", "habis", "endorse", "naik",
];
const LEMAH_MASUK = [
  "masuk", "order", "penumpang", "setoran", "bonus", "insentif", "fee",
  "proyek", "termin", "invoice", "dp", "pelunasan", "hasil", "klien",
  "pembeli", "pelanggan", "argo",
];

/** Subjek pihak lain: "penumpang bayar", "ada yg beli" = uang MASUK. */
const SUBJEK_PIHAK_LAIN =
  /(?:penumpang|pelanggan|pembeli|customer|klien|temen|teman|tetangga|kakak|adik|saudara|sodara|orang|ada\s+(?:yg|yang))\s+(?:\w+\s+){0,4}(?:bayar|beli|borong|transfer|tf|checkout|order|dp)/;

/** "isi bensin/pulsa/kuota" = pengeluaran KUAT meski "isi" sendiri lemah. */
const ISI_COMPOUND = /\bisi\s+(bensin|pulsa|kuota|token|saldo|angin|solar)\b/;
/** Pesan makanan via aplikasi = jelas pengeluaran. */
const PESAN_MAKAN = /\b(gofood|grabfood|shopeefood)\b/;
/** "naik gojek/angkot" = ongkos transport (pengeluaran KUAT). */
const NAIK_COMPOUND = /\bnaik\s+(gojek|grab|ojek|ojol|angkot|taksi|bus|kereta|krl|mrt|busway)\b/;
/** "gajian si mbak / gajian admin" = MEMBAYAR gaji (keluar), bukan terima gajian. */
const GAJIAN_KELUAR =
  /\bgajian?\s+(?:harian\s+)?(?:admin|karyawan|pegawai|packer|kurir|si\b|mbak|mas|bu\b|pak\b)/;

// Klitika "-nya" umum menempel di kata kerja/benda ("modalnya", "bayarnya").
function indexKata(teks: string, daftar: string[]): number[] {
  const out: number[] = [];
  for (const kw of daftar) {
    const re = new RegExp(`\\b${kw}(?:nya)?\\b`);
    const m = re.exec(teks);
    if (m) out.push(m.index);
  }
  return out;
}

interface JenisTebakan {
  /** null = tidak ada bukti arah sama sekali (biar pemanggil mewarisi). */
  jenis: Jenis | null;
  sinyalKuat: boolean;
}

function tebakJenis(teks: string, earner?: EarnerType): JenisTebakan {
  const pihakLain = SUBJEK_PIHAK_LAIN.test(teks);
  const gajianKeluar = GAJIAN_KELUAR.test(teks);

  const kuatKeluarIdx = pihakLain ? [] : indexKata(teks, KUAT_KELUAR);
  const kuatMasukIdx = indexKata(teks, KUAT_MASUK);
  const lemahKeluar = pihakLain ? 0 : indexKata(teks, LEMAH_KELUAR).length;
  const lemahMasuk = indexKata(teks, LEMAH_MASUK).length;

  let skorKeluar = kuatKeluarIdx.length * 2 + lemahKeluar;
  let skorMasuk = kuatMasukIdx.length * 2 + lemahMasuk;

  if (pihakLain) skorMasuk += 2; // pihak lain membayar KITA
  if (ISI_COMPOUND.test(teks)) skorKeluar += 2;
  if (NAIK_COMPOUND.test(teks)) skorKeluar += 2;
  if (PESAN_MAKAN.test(teks)) skorKeluar += 2;

  // "setoran hari ini" bagi ojol = uang MASUK (§7.2 contoh chip); bagi peran
  // lain "setor" lebih sering berarti menyetor keluar.
  if (/\bsetor(an)?\b/.test(teks)) {
    if (earner === "ojol") skorMasuk += 2;
    else skorKeluar += 1;
  }
  // "gajian" = terima gaji (masuk) — KECUALI "gajian si mbak" (membayar).
  if (/\bgajian\b/.test(teks)) {
    if (gajianKeluar) {
      skorKeluar += 3; // netralkan suara masuk dari kata "gajian"
    } else {
      skorKeluar = Math.max(0, skorKeluar - 1);
    }
  }

  const sinyalKuat =
    kuatKeluarIdx.length > 0 ||
    kuatMasukIdx.length > 0 ||
    pihakLain ||
    gajianKeluar ||
    ISI_COMPOUND.test(teks) ||
    NAIK_COMPOUND.test(teks) ||
    PESAN_MAKAN.test(teks) ||
    (earner === "ojol" && /\bsetoran\b/.test(teks));

  if (skorKeluar === 0 && skorMasuk === 0) {
    return { jenis: null, sinyalKuat: false };
  }

  let jenis: Jenis;
  if (skorKeluar === skorMasuk) {
    // Seri skor → kata kerja KUAT yang muncul PALING AWAL menentukan arah
    // ("beli hp buat narik" → beli menang). Tanpa kata kuat sama sekali →
    // pemasukan (pelaku mikro lebih sering mencatat penjualan).
    const minKeluar = kuatKeluarIdx.length ? Math.min(...kuatKeluarIdx) : Infinity;
    const minMasuk = kuatMasukIdx.length ? Math.min(...kuatMasukIdx) : Infinity;
    jenis = minKeluar < minMasuk ? "keluar" : "masuk";
  } else {
    jenis = skorKeluar > skorMasuk ? "keluar" : "masuk";
  }
  return { jenis, sinyalKuat };
}

/* ── Metode bayar (§17.1) ────────────────────────────────────────────────── */

function tebakMetode(teks: string): PaymentMethod {
  const t = teks;
  if (/\bqris\b|\bscan\b|\bqr\b|\bbarcode\b/.test(t)) return "qris";
  if (/\btransfer(an)?\b|\btf\b|\brekening\b|\bva\b|\bm-?banking\b|\b(bca|bri|bni|mandiri|seabank)\b/.test(t))
    return "transfer";
  // "dana" juga berarti "uang" ("dana usaha") — hanya dihitung e-wallet bila
  // konteksnya alat bayar.
  if (/\bovo\b|\bgopay\b|\bshopeepay\b|\bspay\b|\blinkaja\b|\be-?wallet\b/.test(t))
    return "ewallet";
  if (/(?:pakai|pake|via|lewat|bayar(?:nya)?|dibayar|ke)\s+dana\b/.test(t)) return "ewallet";
  return "tunai";
}

/** Klausa yang HANYA menyebut alat bayar ("bayarnya pake qris", "dua duanya
 *  pake qris") — modifier untuk entri sebelumnya, bukan peristiwa baru. */
const KLAUSA_METODE_RE =
  /^(?:(dua[- ]?duanya|semua(?:nya)?|keduanya)\s+)?(?:bayar(?:nya)?|dibayar|pakai|pake|via|lewat|masuk|ke)?\s*(?:pakai|pake)?\s*(qris|qr|scan|transfer|tf|rekening|ovo|gopay|dana|shopeepay|spay|tunai|cash|kes)\s*(?:semua(?:nya)?|aja|saja|ya)?$/;

/* ── Kategori (§10; ragu → lainnya, dilarang mengarang) ──────────────────── */
// Urutan penting: konteks pribadi/keluarga dicek lebih dulu ("ngasih ibu buat
// belanja dapur" = pribadi walau ada kata "belanja").

const KATEGORI_KELUAR_RULES: [RegExp, string][] = [
  // "istri" WAJIB \b — tanpa itu ia cocok di dalam kata "l-istri-k".
  // "rumah" hanya sebagai TUJUAN ("buat rumah"), bukan lokasi ("dket rumah").
  [/keluarga|\banak\b|\bibu\b|\bbapak\b|ortu|\bistri\b|suami|sekolah|jajan|pribadi|(?:buat|untuk|utk|keperluan)\s+rumah\b|makan siang|makan malam/, "pribadi"],
  [/beras|\bbeas\b|telur|ayam|sayur|daging|bahan|stok|nyetok|belanja|kulakan|restock|tepung|minyak goreng|bumbu|cabe|\bgula\b|tahu|tempe|krat|sembako|benang|\baset\b|bubble wrap|lakban|kardus|tali rami|plastik|\bmodal(?:nya)?\b/, "bahan_baku"],
  [/gaji|karyawan|upah|pegawai|packer/, "gaji"],
  [/bensin|solar|pertalite|pertamax|bbm/, "operasional"],
  [/listrik|token|\bair\b|pulsa|kuota|paket data|wifi|internet|sewa|\bgas\b|elpiji|galon|langganan|admin|iuran|tagihan|packing|canva|adobe|figma|photoshop|domain|hosting|gofood|grabfood|\bjasa\b/, "operasional"],
  [/servis|bengkel|\boli\b|\bban\b|kampas|\bcvt\b|\baki\b|stnk|pajak|tambal|benerin|perbaikan|renovasi|tukang/, "operasional"],
  [/ongkir|ongkos|angkot|parkir|\btol\b|transport|busway|kereta|\bbus\b|kurir|pickup|ekspedisi|\bjne\b|\bjnt\b|j&t|sicepat|anteraja|naik gojek|naik grab|naik ojek|naik taksi/, "transportasi"],
  [/iklan|promo|spanduk|banner|\bads\b|endorse|pemasaran|foto produk|konten/, "pemasaran"],
  [/\balat\b|mesin|kompor|wajan|etalase|peralatan|\bhp\b|laptop|\bram\b|lisensi|software|printer|rice cooker|kulkas|freezer|blender|gerobak|helm|jas hujan|sarung tangan|kabel|hdmi|\busb\b|hanger|display/, "peralatan"],
  // Belanjaan kecil pribadi DI BAWAH bahan_baku: "stok sabun sachet" utk
  // dijual = bahan_baku (tertangkap "stok" di atas), "beli sabun buat rumah"
  // = pribadi (tertangkap "rumah" di atas atau jatuh ke sini).
  [/\bkopi\b|gorengan|jajanan|\bobat\b|apotek|sabun|sampo|rokok/, "pribadi"],
];

const KATEGORI_MASUK_RULES: [RegExp, string][] = [
  [/narik|ojek|penumpang|ngojek|argo|\bgrab\b|\bgojek\b|maxim|setoran|nganter/, "ojek"],
  [/komisi|bonus|insentif|referral/, "komisi"],
  [/cashback/, "lainnya"],
  [/\bjasa\b|desain|\bles\b|ngajar|servisan|jahit|\bupah\b|honor|\bfee\b|klien|proyek|termin|invoice|bantu/, "jasa"],
  [/jual|penjualan|laku|payu|dodolan|omzet|dagang|toko|warung|shopee|tokopedia|tiktok|lazada|katering|catering|pesanan|pesenan|pelanggan|pembeli|borong|\bporsi\b|\bkue\b|preloved|gorengan|jajanan/, "penjualan"],
];

function tebakKategori(teks: string, jenis: Jenis, earner?: EarnerType): string {
  const rules = jenis === "masuk" ? KATEGORI_MASUK_RULES : KATEGORI_KELUAR_RULES;
  for (const [re, slug] of rules) {
    if (re.test(teks)) return slug;
  }
  if (jenis === "masuk") {
    if (earner === "ojol") return "ojek";
    if (earner === "freelance") return "jasa";
    if (earner === "dagang" || earner === "online") return "penjualan";
    if (/orderan/.test(teks)) return "penjualan";
    return "lainnya";
  }
  return "lainnya";
}

/* ── Waktu relatif (§7.2 / §17.1) ────────────────────────────────────────── */

function geserHari(isoDate: string, hari: number): string {
  const d = new Date(`${isoDate}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() - hari);
  return d.toISOString().slice(0, 10);
}

/** Hari-dalam-minggu WIB (0=Minggu..6=Sabtu) untuk tanggal ISO. */
function hariMinggu(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00+07:00`).getUTCDay();
}

const NAMA_HARI: Record<string, number> = {
  minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6,
};

/** Penanda waktu eksplisit → tanggal; null bila klausa tidak menyebut waktu
 *  (pemanggil lalu mewarisi penanda global kalimat). */
function tebakTanggalMarker(teks: string, today: string): string | null {
  const t = teks;
  if (/kemarin lusa|2 hari (yang )?lalu|dua hari (yang )?lalu/.test(t))
    return geserHari(today, 2);
  if (/kemarin|semalam|tadi malam/.test(t)) return geserHari(today, 1);

  // "senin lalu" / "hari senin" → hari bernama terdekat SEBELUM hari ini.
  const hariM =
    /\b(senin|selasa|rabu|kamis|jumat|sabtu)\b( lalu| kemarin)?|\bhari minggu\b( lalu| kemarin)?/.exec(t);
  if (hariM) {
    const nama = hariM[0].includes("minggu") ? "minggu" : hariM[1];
    const target = NAMA_HARI[nama];
    const kini = hariMinggu(today);
    let mundur = (kini - target + 7) % 7;
    if (mundur === 0) mundur = 7; // "senin lalu" diucap hari senin = pekan lalu
    return geserHari(today, mundur);
  }

  if (/minggu (yang )?lalu|pekan lalu|seminggu (yang )?lalu/.test(t))
    return geserHari(today, 7);
  const nHari = /(\d+)\s*hari (yang )?lalu/.exec(t);
  if (nHari) return geserHari(today, Math.min(365, Number(nHari[1])));

  // "tanggal 5" → tanggal 5 bulan ini (atau bulan lalu bila belum lewat).
  const tglM = /\btanggal (\d{1,2})\b/.exec(t);
  if (tglM) {
    const hariKe = Number(tglM[1]);
    const [y, mo, d] = today.split("-").map(Number);
    if (hariKe >= 1 && hariKe <= 31) {
      if (hariKe <= d) {
        return `${y}-${String(mo).padStart(2, "0")}-${String(hariKe).padStart(2, "0")}`;
      }
      const prev = new Date(Date.UTC(y, mo - 2, Math.min(hariKe, 28)));
      return prev.toISOString().slice(0, 10);
    }
  }

  if (/tadi pagi|tadi siang|tadi sore|barusan|baru saja|hari ini|td pagi/.test(t))
    return today;

  return null;
}

/* ── Bukan transaksi: sapaan/curhat/pertanyaan tanpa uang ────────────────── */

const SAPAAN_RE =
  /^(halo|hai|hi|hei|hey|p\b|ping|tes\b|test\b|assalamu|selamat (pagi|siang|sore|malam)|apa kabar|gimana|bagaimana|terima kasih|makasih|oke?\b|ya\b|siap\b|min\b|kak\b|bang\b|eh\b)/;

/** Penyemangat/komentar/pertanyaan cara-pakai — bukan pencatatan. */
const BUKAN_TX_RE =
  /\b(semangat|semoga|salam|sukses|mantap|keren|hebat|amin|aamiin|insyaallah|doain|capek|cuaca|panas banget|hujan deras|gimana|bagaimana|caranya|nanya|tanya|bisa ga|bisa gak|ga sih|gak sih|ga ya|gak ya)\b/;

/* ── Pemisahan klausa: satu kalimat → banyak entri (§7.2 prinsip #1) ─────── */

// "lalu" TIDAK memisah bila bagian dari frasa waktu ("sabtu lalu", "minggu
// lalu", "2 hari lalu"); koma TIDAK memisah desimal ("1,5jt").
const PEMISAH_RE =
  /\s*(?:,(?!\d)|;|\bdan\b|(?<!senin\s)(?<!selasa\s)(?<!rabu\s)(?<!kamis\s)(?<!jumat\s)(?<!sabtu\s)(?<!minggu\s)(?<!hari\s)(?<!pekan\s)\blalu\b|\bterus\b|\btrus\b|\bkemudian\b|\btapi\b|\bsama\b|\babis itu\b|\bhabis itu\b|\bsetelah itu\b|\blangsung\b|\+)\s*/i;

function pecahKlausa(teks: string): string[] {
  const kasar = teks
    .split(PEMISAH_RE)
    .map((s) => s.trim())
    .filter(Boolean);

  // Klausa dengan ≥2 kandidat uang ("bensin 30rb makan siang 20rb" tanpa
  // pemisah) dipecah lagi tepat setelah tiap kandidat — satu entri per
  // peristiwa uang (§7.2 prinsip #1).
  const halus: string[] = [];
  for (const k of kasar) {
    const uang = kandidatUang(k);
    if (uang.length < 2) {
      halus.push(k);
      continue;
    }
    let mulai = 0;
    for (let i = 0; i < uang.length; i++) {
      const akhir =
        i === uang.length - 1 ? k.length : uang[i].index + uang[i].raw.length;
      const bagian = k.slice(mulai, akhir).trim();
      if (bagian) halus.push(bagian);
      mulai = akhir;
    }
  }
  return halus;
}

/** Sisa kata bermakna sebuah klausa setelah angka & kata arah dibuang —
 *  dipakai menilai apakah klausa cuma "dpt 175rb" (lanjutan klausa sebelum). */
function residuKlausa(teks: string): number {
  const tanpaAngka = teks.replace(ANGKA_G, " ");
  const tokens = tanpaAngka.split(/[^a-z0-9]+/).filter(Boolean);
  const arah = new Set([
    ...KUAT_MASUK, ...KUAT_KELUAR,
    "total", "totalnya", "semuanya", "abis", "habis", "kena", "sekitar",
  ]);
  return tokens.filter((t) => !arah.has(t)).length;
}

function bersihkanCatatan(klausaAsli: string): string {
  const s = klausaAsli
    .replace(ANGKA_G, (m) => (/(jt|juta|rb|ribu|k|rp|[.\s]\d{3})/i.test(m) ? "" : m))
    .replace(/\b(bayar(nya)?|pakai|pake|via|lewat)?\s*(qris|transfer|tf|ovo|gopay|dana|shopeepay|spay)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return (s || klausaAsli).slice(0, 80);
}

/* ── Entri utama ─────────────────────────────────────────────────────────── */

export function parseFallback(
  text: string,
  opts: { today: string; earner?: EarnerType },
): ParseResult {
  const asli = text.trim();
  if (!asli) return { entries: [], pertanyaan: null, tidakDikenali: null };

  const bersih = normalisasi(asli);
  const tanggalGlobal = tebakTanggalMarker(bersih, opts.today) ?? opts.today;

  // Pecah klausa, lalu GABUNGKAN klausa yang bukan peristiwa berdiri sendiri:
  // - "jual es teh + gorengan 20rb"      → SATU entri Rp20.000
  // - "trima dp orderan kue + dpt 175rb" → SATU entri (klausa kedua cuma angka)
  // - "beli telur + 2 kilo gula + abis 61rb" → SATU entri (rantai belanjaan)
  // - "beli beras + bayar listrik 100rb" → DUA peristiwa (draft + entri)
  const mentah = pecahKlausa(bersih);
  const klausa: string[] = [];
  for (let i = 0; i < mentah.length; i++) {
    let acc = mentah[i];
    while (
      i + 1 < mentah.length &&
      bacaNominal(acc) === null &&
      !KLAUSA_METODE_RE.test(acc) &&
      !KLAUSA_METODE_RE.test(mentah[i + 1]) &&
      // Klausa berikut bukan peristiwa baru bila: tidak membawa kata kerja
      // uang kuatnya sendiri, ATAU isinya nyaris cuma angka ("dpt 175rb").
      (!tebakJenis(mentah[i + 1], opts.earner).sinyalKuat ||
        (bacaNominal(mentah[i + 1]) !== null && residuKlausa(mentah[i + 1]) <= 1))
    ) {
      acc = `${acc} ${mentah[i + 1]}`;
      i++;
      if (bacaNominal(acc) !== null) break;
    }
    klausa.push(acc);
  }

  const entries: ParsedEntry[] = [];
  for (const k of klausa) {
    // Klausa yang hanya menyebut alat bayar → modifier entri sebelumnya;
    // "dua duanya/semuanya pake qris" → berlaku untuk SEMUA entri.
    const modMetode = KLAUSA_METODE_RE.exec(k);
    if (modMetode && entries.length > 0) {
      const distributif = Boolean(modMetode[1]);
      const kata = modMetode[2];
      const metode: PaymentMethod =
        kata === "tunai" || kata === "cash" || kata === "kes"
          ? "tunai"
          : tebakMetode(kata);
      if (distributif) {
        for (const e of entries) e.paymentMethod = metode;
      } else {
        entries[entries.length - 1].paymentMethod = metode;
      }
      continue;
    }

    // Anak kalimat tujuan ("biar bisa terima orderan", "buat kulakan") bukan
    // peristiwa uang — buang dari penilaian arah & kategori. Kalau kategori
    // dari inti berujung `lainnya`, coba lagi dengan klausa penuh: kadang
    // justru anak kalimatnya yang membawa konteks ("abis 150rb buat iklan").
    const inti =
      k.split(/\b(?:biar|supaya|agar|buat|untuk|utk)\b/)[0].trim() || k;

    const amount = bacaNominal(k);
    let tebakan = tebakJenis(inti, opts.earner);
    if (tebakan.jenis === null && !tebakan.sinyalKuat) {
      tebakan = tebakJenis(k, opts.earner);
    }

    // Entri lahir hanya dari sinyal uang: nominal ATAU kata kerja uang kuat.
    if (amount === null && !tebakan.sinyalKuat) continue;
    // Sapaan/penyemangat/pertanyaan tanpa nominal tidak pernah jadi entri.
    if (amount === null && (SAPAAN_RE.test(k) || BUKAN_TX_RE.test(k))) continue;

    // Arah: bukti di klausa → objek belanjaan yang dikenal → warisan klausa
    // sebelumnya → pemasukan (default paling umum bagi pelaku mikro).
    let jenis: Jenis;
    if (tebakan.jenis !== null) {
      jenis = tebakan.jenis;
    } else if (KATEGORI_KELUAR_RULES.some(([re]) => re.test(inti))) {
      jenis = "keluar";
    } else if (entries.length > 0) {
      jenis = entries[entries.length - 1].jenis;
    } else {
      jenis = "masuk";
    }

    let kategori = tebakKategori(inti, jenis, opts.earner);
    if (kategori === "lainnya") kategori = tebakKategori(k, jenis, opts.earner);

    entries.push({
      jenis,
      amount,
      kategori,
      // Metode bayar milik klausanya sendiri; klausa lain dalam kalimat yang
      // sama tetap tunai kecuali menyebut alat bayarnya sendiri (§17.1).
      paymentMethod: tebakMetode(k),
      occurredAt: tebakTanggalMarker(k, opts.today) ?? tanggalGlobal,
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
