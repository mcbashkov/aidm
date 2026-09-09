/**
 * Membangun merkle tree alokasi migrasi holder v1 dari
 * `data/migration-allocations.csv`.
 *
 *   pnpm merkle:build
 *
 * DETERMINISTIK. Daun diurutkan menaik berdasarkan alamat sebelum pohon
 * disusun, jadi CSV yang sama selalu menghasilkan root yang sama — urutan baris
 * di CSV tidak memengaruhi apa pun. Tanpa pengurutan, satu baris yang tertukar
 * posisinya menghasilkan root berbeda untuk alokasi yang persis sama, dan
 * perbedaan itu mustahil dijelaskan kepada siapa pun yang memeriksa.
 *
 * DAUN HANYA BERISI ALAMAT + JUMLAH (wei). Tier TIDAK disimpan di daun; ia
 * dihitung kontrak dari jumlahnya sendiri terhadap ambang 250.000 IDM.
 * Konsekuensinya penting dan disengaja: penyusun pohon TIDAK BISA salah
 * mengklasifikasikan siapa pun, bahkan bila skrip ini keliru atau jahat.
 * Aturan tier menjadi hal yang bisa dibaca publik di kontrak, bukan hal yang
 * harus dipercaya dari berkas.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { keccak256, encodeAbiParameters, concat, getAddress, formatEther } from "viem";

const CSV = "data/migration-allocations.csv";
const isi = readFileSync(CSV, "utf8");
const sha = createHash("sha256").update(isi).digest("hex");

const baris = isi.trim().split("\n");
const kolom = baris[0].split(",").map((s) => s.trim());
const iAddr = kolom.indexOf("address");
const iWei = kolom.indexOf("amount_wei");
if (iAddr < 0 || iWei < 0) { console.error("✗ kolom address/amount_wei tidak ada"); process.exit(1); }

const entri = baris.slice(1).map((l, n) => {
  const c = l.split(",");
  const alamat = getAddress(c[iAddr].trim());          // checksum EIP-55
  const wei = BigInt(c[iWei].trim());
  if (wei <= 0n) { console.error(`✗ baris ${n + 2}: jumlah nol/negatif`); process.exit(1); }
  return { alamat, wei };
});

const unik = new Set(entri.map((e) => e.alamat));
if (unik.size !== entri.length) { console.error("✗ ada alamat duplikat"); process.exit(1); }

// Urut menaik berdasarkan alamat — inilah yang membuat root reproducible.
entri.sort((a, b) => (BigInt(a.alamat) < BigInt(b.alamat) ? -1 : 1));

const daunDari = (alamat, wei) => keccak256(concat([keccak256(
  encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [alamat, wei]))]));
const pasang = (a, b) => BigInt(a) <= BigInt(b)
  ? keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [a, b]))
  : keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [b, a]));

const daun = entri.map((e) => daunDari(e.alamat, e.wei));
const lapisan = [daun];
while (lapisan[lapisan.length - 1].length > 1) {
  const bawah = lapisan[lapisan.length - 1];
  const atas = [];
  for (let i = 0; i < bawah.length; i += 2)
    atas.push(i + 1 < bawah.length ? pasang(bawah[i], bawah[i + 1]) : bawah[i]);
  lapisan.push(atas);
}
const root = lapisan[lapisan.length - 1][0];

function buktiUntuk(idx) {
  const p = []; let i = idx;
  for (let l = 0; l < lapisan.length - 1; l++) {
    const pasanganIdx = i ^ 1;
    if (pasanganIdx < lapisan[l].length) p.push(lapisan[l][pasanganIdx]);
    i = Math.floor(i / 2);
  }
  return p;
}

const totalWei = entri.reduce((s, e) => s + e.wei, 0n);
const AMBANG = 250_000n * 10n ** 18n;
const kecil = entri.filter((e) => e.wei < AMBANG).length;

const PERINGATAN =
  "ROOT INI UNTUK TESTNET SAJA. Satu alokasi senilai 586.060,85 IDM belum " +
  "punya alamat penerima dan karena itu TIDAK ADA di pohon ini. Root final " +
  "untuk mainnet baru bisa disusun setelah alamat tersebut diketahui. " +
  "`merkleRoot` immutable di kontrak — memakai root ini di mainnet berarti " +
  "mengunci kelalaian itu secara permanen.";

mkdirSync("data", { recursive: true });
writeFileSync("data/migration-merkle-tree.json", JSON.stringify({
  PERINGATAN,
  dibangun: new Date().toISOString(),
  sumber: CSV,
  sumberSha256: sha,
  root,
  jumlahDaun: entri.length,
  totalWei: totalWei.toString(),
  totalIdm: formatEther(totalWei),
  ambangTierWei: AMBANG.toString(),
  dibawahAmbang: kecil,
  diAtasAmbang: entri.length - kecil,
  catatanDaun: "keccak256(bytes.concat(keccak256(abi.encode(address,uint256)))) — tier TIDAK ada di daun",
  lapisan,
}, null, 2) + "\n");

writeFileSync("data/migration-merkle-proofs.json", JSON.stringify({
  PERINGATAN, root, sumberSha256: sha,
  bukti: Object.fromEntries(entri.map((e, i) => [e.alamat, {
    amountWei: e.wei.toString(), amountIdm: formatEther(e.wei), proof: buktiUntuk(i),
  }])),
}, null, 2) + "\n");

console.log(`✓ ${entri.length} daun · total ${formatEther(totalWei)} IDM`);
console.log(`  root        ${root}`);
console.log(`  sumber sha  ${sha}`);
console.log(`  tier        ${kecil} di bawah ambang · ${entri.length - kecil} di atas`);
console.log(`  artefak     data/migration-merkle-tree.json + data/migration-merkle-proofs.json`);
console.log(`\n⚠ ${PERINGATAN}`);
