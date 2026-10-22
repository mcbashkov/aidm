/**
 * Sub-kategori untuk peran ojol (PERINTAH-AGEN-PREMIUM §Batch 10) — murni,
 * tanpa impor runtime, dipakai parser fallback dan validator hasil LLM.
 *
 *   · Pemasukan `kategori = ojek` → platform ternormalisasi:
 *     gojek | grab | maxim | indrive | shopeefood | lainnya; kalimat tanpa
 *     platform → null (BUKAN "lainnya": null berarti tidak disebut).
 *   · Pengeluaran kendaraan (kategori transportasi/operasional/peralatan yang
 *     ada) → bbm | servis | cicilan | sewa | kuota | parkir; selain itu null.
 *
 * TANPA kolom baru: `transactions.sub_kategori` sudah ada.
 */

export const PLATFORM_OJOL = ["gojek", "grab", "maxim", "indrive", "shopeefood", "lainnya"] as const;
export type PlatformOjol = (typeof PLATFORM_OJOL)[number];

export const SUB_KENDARAAN = ["bbm", "servis", "cicilan", "sewa", "kuota", "parkir"] as const;
export type SubKendaraan = (typeof SUB_KENDARAAN)[number];

export const LABEL_PLATFORM: Record<PlatformOjol, string> = {
  gojek: "Gojek",
  grab: "Grab",
  maxim: "Maxim",
  indrive: "inDrive",
  shopeefood: "ShopeeFood",
  lainnya: "Lainnya",
};

export const LABEL_SUB_KENDARAAN: Record<SubKendaraan, string> = {
  bbm: "BBM",
  servis: "Servis & suku cadang",
  cicilan: "Cicilan kendaraan",
  sewa: "Sewa kendaraan",
  kuota: "Kuota data",
  parkir: "Parkir",
};

// Urutan penting: "gofood"/"gocar"/"goride" adalah layanan Gojek; "grabfood"/
// "grabbike"/"grabcar" layanan Grab; "shopeefood" berdiri sendiri.
const RE_PLATFORM: [RegExp, PlatformOjol][] = [
  [/\b(gojek|go-?jek|gofood|go-?food|gocar|go-?car|goride|go-?ride|gosend|go-?send)\b/, "gojek"],
  [/\b(grab|grabfood|grab-?food|grabbike|grab-?bike|grabcar|grab-?car|grabexpress)\b/, "grab"],
  [/\bmaxim\b/, "maxim"],
  [/\b(indrive|in-?drive|indriver)\b/, "indrive"],
  [/\b(shopeefood|shopee\s?food|spx)\b/, "shopeefood"],
];

/** Platform dari teks bebas; null bila tidak disebut. */
export function tebakPlatform(teks: string): PlatformOjol | null {
  const t = teks.toLowerCase();
  for (const [re, p] of RE_PLATFORM) if (re.test(t)) return p;
  return null;
}

/** Normalisasi nilai `sub_kategori` yang dikirim LLM untuk kategori ojek. */
export function normalisasiPlatform(nilai: unknown): PlatformOjol | null {
  if (typeof nilai !== "string") return null;
  const v = nilai.trim().toLowerCase().replace(/[\s_-]/g, "");
  if (!v) return null;
  if (/^(gojek|gofood|gocar|goride|gosend)$/.test(v)) return "gojek";
  if (/^(grab|grabfood|grabbike|grabcar|grabexpress)$/.test(v)) return "grab";
  if (v === "maxim") return "maxim";
  if (/^(indrive|indriver)$/.test(v)) return "indrive";
  if (/^(shopeefood|spx)$/.test(v)) return "shopeefood";
  // LLM menyebut platform lain yang tidak kita kenal → "lainnya"; tetapi
  // kalau isinya jelas bukan nama platform, kembalikan lewat tebakan teks.
  return tebakPlatform(v) ?? "lainnya";
}

const RE_KENDARAAN: [RegExp, SubKendaraan][] = [
  [/\b(bensin|bbm|pertalite|pertamax|solar|dexlite|isi\s?full|full\s?tank)\b/, "bbm"],
  [/\b(servis|service|bengkel|oli|ban\b|tambal|kampas|cvt|aki\b|busi|rantai|gir|spion|lampu|rem\b|tune\s?up)/, "servis"],
  [/\b(cicilan|angsuran|kredit\s+(motor|mobil|kendaraan)|leasing)\b/, "cicilan"],
  [/\bsewa\s+(motor|mobil|kendaraan|unit)\b|\brental\b/, "sewa"],
  [/\b(kuota|paket\s?data|internet|pulsa\s?data)\b/, "kuota"],
  [/\bparkir\b/, "parkir"],
];

/** Sub-kategori pengeluaran kendaraan dari teks bebas; null bila bukan. */
export function tebakSubKendaraan(teks: string): SubKendaraan | null {
  const t = teks.toLowerCase();
  for (const [re, s] of RE_KENDARAAN) if (re.test(t)) return s;
  return null;
}

export function normalisasiSubKendaraan(nilai: unknown): SubKendaraan | null {
  if (typeof nilai !== "string") return null;
  const v = nilai.trim().toLowerCase();
  if ((SUB_KENDARAAN as readonly string[]).includes(v)) return v as SubKendaraan;
  return tebakSubKendaraan(v);
}

/* ── Jasa/freelance (Batch 11): uang muka ──────────────────────────────── */

/** "dp", "uang muka", "deposit", "down payment", "panjar", "termin 1" →
 *  sub_kategori `uang_muka` pada pemasukan kategori `jasa`. */
const RE_UANG_MUKA = /\b(dp|uang\s?muka|deposit|down\s?payment|panjar|termin\s?(1|pertama|awal))\b/;

export function tebakSubJasa(teks: string): "uang_muka" | null {
  return RE_UANG_MUKA.test(teks.toLowerCase()) ? "uang_muka" : null;
}

export function normalisasiSubJasa(nilai: unknown): string | null {
  if (typeof nilai !== "string") return null;
  const v = nilai.trim();
  if (!v) return null;
  const k = v.toLowerCase().replace(/[\s-]/g, "_");
  if (k === "uang_muka" || k === "dp" || k === "deposit" || k === "down_payment" || k === "panjar") return "uang_muka";
  return tebakSubJasa(v) ?? v.slice(0, 80);
}
