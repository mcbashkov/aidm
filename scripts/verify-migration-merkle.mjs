/**
 * Memeriksa ulang artefak merkle terhadap CSV sumbernya.
 *
 *   pnpm merkle:verify
 *
 * Ia TIDAK memercayai artefak. Pohon dibangun ulang dari nol di sini, lalu
 * root, jumlah daun, dan total dibandingkan dengan yang tersimpan — sekaligus
 * dengan angka yang dinyatakan PO. Skrip yang hanya membaca kembali berkas
 * yang ditulisnya sendiri membuktikan berkas itu bisa dibaca, bukan bahwa ia
 * benar.
 *
 * Setiap bukti per alamat juga ditelusuri sampai root, satu per satu. Bukti
 * yang salah pada satu alamat berarti satu orang tidak bisa mengklaim haknya,
 * dan itu tidak akan ketahuan sampai orang tersebut mencoba.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { keccak256, encodeAbiParameters, concat, getAddress, formatEther } from "viem";

const TOTAL_DINYATAKAN = "146082699.41";   // §0.1 / perintah PO
const JUMLAH_DINYATAKAN = 490;
const AMBANG = 250_000n * 10n ** 18n;

let lulus = 0, gagal = 0;
const ok = (c, l) => { c ? (lulus++, console.log("  ✓ " + l)) : (gagal++, console.log("  ✗ GAGAL: " + l)); };

const CSV = "data/migration-allocations.csv";
const isi = readFileSync(CSV, "utf8");
const sha = createHash("sha256").update(isi).digest("hex");
const baris = isi.trim().split("\n");
const kolom = baris[0].split(",").map((s) => s.trim());
const iAddr = kolom.indexOf("address"), iWei = kolom.indexOf("amount_wei"), iIdm = kolom.indexOf("amount_idm");

const entri = baris.slice(1).map((l) => {
  const c = l.split(",");
  return { alamat: getAddress(c[iAddr].trim()), wei: BigInt(c[iWei].trim()), idm: c[iIdm].trim() };
});

console.log("CSV");
ok(entri.length === JUMLAH_DINYATAKAN, `jumlah baris ${entri.length} == ${JUMLAH_DINYATAKAN}`);
ok(new Set(entri.map((e) => e.alamat)).size === entri.length, "tidak ada alamat duplikat");
ok(entri.every((e) => e.wei > 0n), "tidak ada jumlah nol atau negatif");
// amount_wei harus turunan tepat dari amount_idm — kalau tidak, ada dua kebenaran
const weiDariIdm = (s) => { const [a, b = ""] = s.split("."); return BigInt(a + b.padEnd(18, "0").slice(0, 18)); };
ok(entri.every((e) => e.wei === weiDariIdm(e.idm)), "amount_wei == amount_idm × 1e18 di SETIAP baris");

const totalWei = entri.reduce((s, e) => s + e.wei, 0n);
const totalIdm = formatEther(totalWei);
ok(totalIdm.startsWith(TOTAL_DINYATAKAN), `total ${totalIdm} sesuai ${TOTAL_DINYATAKAN}`);

console.log("\nPohon dibangun ULANG dari CSV");
const daunDari = (a, w) => keccak256(concat([keccak256(
  encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [a, w]))]));
const pasang = (a, b) => BigInt(a) <= BigInt(b)
  ? keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [a, b]))
  : keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "bytes32" }], [b, a]));

const urut = [...entri].sort((a, b) => (BigInt(a.alamat) < BigInt(b.alamat) ? -1 : 1));
const daun = urut.map((e) => daunDari(e.alamat, e.wei));
const lapisan = [daun];
while (lapisan[lapisan.length - 1].length > 1) {
  const b = lapisan[lapisan.length - 1], a = [];
  for (let i = 0; i < b.length; i += 2) a.push(i + 1 < b.length ? pasang(b[i], b[i + 1]) : b[i]);
  lapisan.push(a);
}
const root = lapisan[lapisan.length - 1][0];

const tree = JSON.parse(readFileSync("data/migration-merkle-tree.json", "utf8"));
const proofs = JSON.parse(readFileSync("data/migration-merkle-proofs.json", "utf8"));

ok(tree.root === root, `root artefak == root hasil bangun ulang (${root.slice(0, 18)}…)`);
ok(proofs.root === root, "root di berkas bukti sama");
ok(tree.jumlahDaun === entri.length, `jumlahDaun artefak ${tree.jumlahDaun} == CSV ${entri.length}`);
ok(BigInt(tree.totalWei) === totalWei, "totalWei artefak == total CSV");
ok(tree.sumberSha256 === sha, "sha256 CSV cocok — artefak dibangun dari berkas INI");
ok(Object.keys(proofs.bukti).length === entri.length, "jumlah bukti == jumlah alamat");

console.log("\nSetiap bukti ditelusuri ke root");
let buktiSalah = 0, jumlahSalah = 0;
for (const e of urut) {
  const b = proofs.bukti[e.alamat];
  if (!b) { buktiSalah++; continue; }
  if (BigInt(b.amountWei) !== e.wei) jumlahSalah++;
  let h = daunDari(e.alamat, e.wei);
  for (const p of b.proof) h = pasang(h, p);
  if (h !== root) buktiSalah++;
}
ok(jumlahSalah === 0, `jumlah di berkas bukti cocok CSV untuk ${entri.length} alamat`);
ok(buktiSalah === 0, `${entri.length} bukti terverifikasi sampai root, 0 gagal`);

console.log("\nTier dihitung dari jumlah (bukan dari kolom CSV)");
const kecil = entri.filter((e) => e.wei < AMBANG).length;
ok(tree.dibawahAmbang === kecil && tree.diAtasAmbang === entri.length - kecil,
   `${kecil} di bawah ambang · ${entri.length - kecil} di atas — konsisten dengan artefak`);
const iTier = kolom.indexOf("tier");
if (iTier >= 0) {
  const bedaTier = baris.slice(1).filter((l) => {
    const c = l.split(","); const w = BigInt(c[iWei].trim());
    return (w < AMBANG) !== (c[iTier].trim() === "tge_full");
  }).length;
  ok(bedaTier === 0, "kolom `tier` CSV cocok 490/490 dengan ambang on-chain");
}

console.log("\nPeringatan mainnet");
ok(/TESTNET SAJA/.test(tree.PERINGATAN ?? ""), "artefak pohon memuat peringatan testnet-saja");
ok(/TESTNET SAJA/.test(proofs.PERINGATAN ?? ""), "artefak bukti memuat peringatan testnet-saja");

console.log(`\n${gagal === 0 ? "✓" : "✗"} ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal === 0 ? 0 : 1);
