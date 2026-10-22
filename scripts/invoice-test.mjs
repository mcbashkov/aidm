/**
 * Uji unit terbilang kuitansi (lib/invoice/terbilang.ts) — murni.
 * Jalankan: `pnpm test:invoice` (Node ≥22.18, type stripping).
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { terbilang, terbilangRupiah } = await import(new URL(join(root, "lib/invoice/terbilang.ts"), "file://").href);

let lulus = 0;
const gagal = [];
function cek(nama, kondisi, detail = "") {
  if (kondisi) { lulus++; console.log(`  ✓ ${nama}`); }
  else { gagal.push(nama); console.log(`  ✗ ${nama}${detail ? ` — ${detail}` : ""}`); }
}
const kasus = [
  [0, "nol"], [7, "tujuh"], [11, "sebelas"], [15, "lima belas"], [21, "dua puluh satu"],
  [100, "seratus"], [250, "dua ratus lima puluh"], [1000, "seribu"], [1500, "seribu lima ratus"],
  [12000, "dua belas ribu"], [45000, "empat puluh lima ribu"], [100000, "seratus ribu"],
  [2500000, "dua juta lima ratus ribu"], [1000000000, "satu miliar"], [1234567, "satu juta dua ratus tiga puluh empat ribu lima ratus enam puluh tujuh"],
];
for (const [n, h] of kasus) cek(`${n} → "${h}"`, terbilang(n) === h, terbilang(n));
cek("terbilangRupiah kapital + 'rupiah'", terbilangRupiah(2500000) === "Dua juta lima ratus ribu rupiah", terbilangRupiah(2500000));
console.log(`\n━━ ${lulus} lulus, ${gagal.length} gagal ━━`);
if (gagal.length) process.exit(1);
