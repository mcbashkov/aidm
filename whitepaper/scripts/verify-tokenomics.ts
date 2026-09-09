/**
 * Menggagalkan build kalau angka alokasi tidak menjumlah.
 *
 * Angka yang tidak menjumlah tidak boleh pernah terbit. Whitepaper dibaca
 * investor dan bursa; tabel yang jumlahnya meleset adalah hal pertama yang
 * ditemukan pembaca teliti, dan sekali terbit ia tidak bisa ditarik kembali.
 */
import { readFileSync } from "node:fs";

type Komponen = { label: Record<string, string>; tokens: number };
type Alokasi = {
  id: string; pct: number; tokens: number; components?: Komponen[];
  circulatingAtTge?: number;
};
type Tokenomics = {
  totalSupply: number; launchPrice: number;
  allocations: Alokasi[];
  tge: { circulating: number; circulatingPct: number; marketCapUsd: number };
};

const t: Tokenomics = JSON.parse(readFileSync("data/tokenomics.json", "utf8"));
const galat: string[] = [];
const rp = (n: number) => n.toLocaleString("id-ID");
// Toleransi satu sen token: angka migrasi punya delapan desimal, dan
// penjumlahan floating point tidak wajib menutup tepat di digit terakhir.
const dekat = (a: number, b: number) => Math.abs(a - b) < 0.01;

const jumlahPct = t.allocations.reduce((s, a) => s + a.pct, 0);
if (jumlahPct !== 100) galat.push(`jumlah pct = ${jumlahPct}, harus 100`);

const jumlahToken = t.allocations.reduce((s, a) => s + a.tokens, 0);
if (jumlahToken !== t.totalSupply)
  galat.push(`jumlah tokens = ${rp(jumlahToken)}, harus ${rp(t.totalSupply)}`);

for (const a of t.allocations) {
  if (!a.components) continue;
  const jk = a.components.reduce((s, c) => s + c.tokens, 0);
  if (!dekat(jk, a.tokens))
    galat.push(`komponen "${a.id}" berjumlah ${rp(jk)}, induknya ${rp(a.tokens)}`);
}

/**
 * Pos migrasi WAJIB menjumlah TEPAT ke alokasinya.
 *
 * Diperiksa terpisah dari pemeriksaan komponen umum karena taruhannya berbeda:
 * ketiga bagiannya adalah kewajiban kepada orang sungguhan, dan salah satunya
 * — 586.060,85 yang disisihkan — ada justru karena pemiliknya belum
 * teridentifikasi. Selisih sepeser pun di sini berarti ada token yang tidak
 * punya rumah, dan token tanpa rumah adalah token yang diam-diam hilang.
 */
const migrasi = t.allocations.find((a) => a.id === "migration");
if (migrasi?.components) {
  const j = migrasi.components.reduce((s, c) => s + c.tokens, 0);
  if (j !== migrasi.tokens)
    galat.push(`pos migrasi berjumlah ${rp(j)}, harus TEPAT ${rp(migrasi.tokens)} (selisih ${rp(j - migrasi.tokens)})`);
}

// Sirkulasi TGE bukan angka bebas: ia jumlah dari pos-posnya sendiri.
const jumlahSirkulasi = t.allocations.reduce((s, a) => s + (a.circulatingAtTge ?? 0), 0);
if (!dekat(jumlahSirkulasi, t.tge.circulating))
  galat.push(`circulatingAtTge berjumlah ${rp(jumlahSirkulasi)}, tge.circulating ${rp(t.tge.circulating)}`);

const mc = t.tge.circulating * t.launchPrice;
if (Math.abs(mc - t.tge.marketCapUsd) > 1)
  galat.push(`market cap ${rp(Math.round(mc))} ≠ ${rp(t.tge.marketCapUsd)}`);

const pct = (t.tge.circulating / t.totalSupply) * 100;
if (Math.abs(pct - t.tge.circulatingPct) > 0.005)
  galat.push(`circulatingPct ${pct.toFixed(4)} ≠ ${t.tge.circulatingPct}`);

if (galat.length) {
  console.error("✗ verify-tokenomics GAGAL:");
  galat.forEach((g) => console.error("  · " + g));
  process.exit(1);
}
console.log(`✓ tokenomics: ${jumlahPct}% · ${rp(jumlahToken)} token · sirkulasi TGE ${rp(t.tge.circulating)} (${pct.toFixed(2)}%) · MC $${rp(t.tge.marketCapUsd)}`);
