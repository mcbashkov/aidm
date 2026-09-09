/**
 * Uji MigrationVesting di anvil lokal — jadwal §0.1 pos Migrasi Holder v1.
 *
 *   pnpm test:migrasi          # butuh `anvil` (foundry) di PATH
 *
 * Port 8549 (test:swap 8547, test:misi 8548) supaya ketiganya bisa berdampingan.
 *
 * Pohon merkle dibangun DI SINI, terpisah dari kontrak, dan sengaja begitu:
 * kalau kedua sisi memakai kode yang sama, uji ini hanya membuktikan kode itu
 * konsisten dengan dirinya sendiri. Yang ingin dibuktikan adalah dua
 * implementasi independen setuju — persis situasi produksi, di mana pohon
 * disusun skrip dan diverifikasi kontrak.
 */
import { spawn, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  createWalletClient, createPublicClient, createTestClient, http,
  parseEther, keccak256, encodeAbiParameters, concat,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

try { execSync("anvil --version", { stdio: "ignore" }); }
catch { console.error("✗ anvil tidak ditemukan — uji dilewati."); process.exit(1); }

const require = createRequire(import.meta.url);
const solc = require("solc");
const sources = {};
for (const f of ["IDMReborn.sol", "MigrationVesting.sol"])
  sources[f] = { content: readFileSync(`contracts/${f}`, "utf8") };
const out = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity", sources,
  settings: { optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
})));
const errs = (out.errors ?? []).filter((e) => e.severity === "error");
if (errs.length) { errs.forEach((e) => console.error(e.formattedMessage)); process.exit(1); }
const C = (f, n) => out.contracts[f][n];

const PORT = 8549;
const anvil = spawn("anvil", ["--silent", "--port", String(PORT)], { stdio: "ignore" });
process.on("exit", () => anvil.kill());
await new Promise((r) => setTimeout(r, 2000));

const deployer = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const kecil    = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const besar    = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
const besar2   = privateKeyToAccount("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
const asing    = privateKeyToAccount("0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a");

const transport = http(`http://127.0.0.1:${PORT}`);
const pub = createPublicClient({ chain: foundry, transport });
const test = createTestClient({ chain: foundry, transport, mode: "anvil" });
const W = (a) => createWalletClient({ account: a, chain: foundry, transport });

let lulus = 0, gagal = 0;
const ok = (c, l) => { c ? (lulus++, console.log("  ✓ " + l)) : (gagal++, console.log("  ✗ GAGAL: " + l)); };
const reverts = async (fn, nama, label) => {
  try { await fn(); ok(false, `${label} (tidak revert!)`); }
  catch (e) { const s = String(e); ok(s.includes(nama), `${label}${s.includes(nama) ? "" : ` — revert lain: ${s.slice(0,120)}`}`); }
};

/* ── Pohon merkle (implementasi mandiri) ─────────────────────────────────── */
const daun = (akun, total, tge) => keccak256(concat([keccak256(
  encodeAbiParameters([{type:"address"},{type:"uint256"},{type:"uint256"}], [akun, total, tge]))]));
const pasang = (a, b) => (BigInt(a) <= BigInt(b))
  ? keccak256(encodeAbiParameters([{type:"bytes32"},{type:"bytes32"}], [a, b]))
  : keccak256(encodeAbiParameters([{type:"bytes32"},{type:"bytes32"}], [b, a]));
function pohon(daunList) {
  let lapis = [...daunList], semua = [lapis];
  while (lapis.length > 1) {
    const next = [];
    for (let i = 0; i < lapis.length; i += 2)
      next.push(i + 1 < lapis.length ? pasang(lapis[i], lapis[i + 1]) : lapis[i]);
    lapis = next; semua.push(lapis);
  }
  return { root: lapis[0], semua };
}
function bukti(t, idx) {
  const p = []; let i = idx;
  for (let l = 0; l < t.semua.length - 1; l++) {
    const lapis = t.semua[l], pasangan = i ^ 1;
    if (pasangan < lapis.length) p.push(lapis[pasangan]);
    i = Math.floor(i / 2);
  }
  return p;
}

/* ── Alokasi uji: mencerminkan bentuk data nyata ─────────────────────────── */
const AMBANG = parseEther("250000");
const alokasi = [
  { akun: kecil.address,  total: parseEther("100000") },   // < ambang
  { akun: besar.address,  total: parseEther("1000000") },  // >= ambang
  { akun: besar2.address, total: parseEther("400000") },   // >= ambang
];
// Ambang dievaluasi DI SINI — saat menyusun daftar, bukan saat klaim.
for (const a of alokasi) a.tge = a.total < AMBANG ? a.total : a.total / 5n;
const daunList = alokasi.map((a) => daun(a.akun, a.total, a.tge));
const t = pohon(daunList);
const TOTAL = alokasi.reduce((s, a) => s + a.total, 0n);

/* ── Deploy ──────────────────────────────────────────────────────────────── */
const idmArt = C("IDMReborn.sol", "IDMReborn");
const mvArt = C("MigrationVesting.sol", "MigrationVesting");
const dep = async (art, args) => {
  const h = await W(deployer).deployContract({ abi: art.abi, bytecode: `0x${art.evm.bytecode.object}`, args });
  return (await pub.waitForTransactionReceipt({ hash: h })).contractAddress;
};
const idm = await dep(idmArt, [deployer.address]);
const mv = await dep(mvArt, [idm, t.root, TOTAL]);
const tulis = async (акк, addr, abi, fn, args) => {
  const h = await W(акк).writeContract({ address: addr, abi, functionName: fn, args });
  return pub.waitForTransactionReceipt({ hash: h });
};
await tulis(deployer, idm, idmArt.abi, "transfer", [mv, TOTAL]);
const baca = (fn, args = []) => pub.readContract({ address: mv, abi: mvArt.abi, functionName: fn, args });
const saldo = (a) => pub.readContract({ address: idm, abi: idmArt.abi, functionName: "balanceOf", args: [a] });
const klaim = (акк, i) => tulis(акк, mv, mvArt.abi, "klaim",
  [alokasi[i].total, alokasi[i].tge, bukti(t, i)]);
const majuHari = async (n) => { await test.increaseTime({ seconds: n * 86400 }); await test.mine({ blocks: 1 }); };

/* ── Sebelum TGE ─────────────────────────────────────────────────────────── */
console.log("\nSebelum TGE — tidak ada yang matang");
ok((await baca("t0")) === 0n, "t0 belum disetel");
ok((await baca("bisaDiklaim", [kecil.address, alokasi[0].total, alokasi[0].tge])) === 0n,
   "saldo kecil pun 0 sebelum TGE");
await reverts(() => klaim(kecil, 0), "T0BelumDisetel", "klaim sebelum TGE ditolak");

/* ── t0 sekali saja ──────────────────────────────────────────────────────── */
console.log("\nt0 — disetel sekali, tidak bisa digeser");
const now = BigInt((await pub.getBlock()).timestamp);
await tulis(deployer, mv, mvArt.abi, "setT0", [now]);
ok((await baca("t0")) === now, "t0 tersetel");
await reverts(() => tulis(deployer, mv, mvArt.abi, "setT0", [now + 100n]),
  "T0SudahDisetel", "setT0 kedua DITOLAK — jadwal tidak bisa digeser owner");
await reverts(() => tulis(asing, mv, mvArt.abi, "setT0", [now]), "NotOwner", "setT0 bukan owner ditolak");

/* ── Saldo kecil: penuh di TGE ───────────────────────────────────────────── */
console.log("\nSaldo < 250.000 — 100% di TGE");
await klaim(kecil, 0);
ok((await saldo(kecil.address)) === alokasi[0].total, "menerima seluruh alokasi seketika");
await reverts(() => klaim(kecil, 0), "TidakAdaYangMatang", "klaim kedua tidak menghasilkan apa-apa");

/* ── Saldo besar: 20% di TGE, linear 6 bulan ─────────────────────────────── */
console.log("\nSaldo ≥ 250.000 — 20% di TGE, sisa linear 6 bulan");
await klaim(besar, 1);
ok((await saldo(besar.address)) === alokasi[1].tge, "di TGE menerima tepat 20%");
ok((await saldo(besar.address)) === parseEther("200000"), "  = 200.000 dari 1.000.000");

await majuHari(90);   // separuh dari 180 hari
const setengah = alokasi[1].tge + (alokasi[1].total - alokasi[1].tge) / 2n;
const m90 = await baca("matang", [alokasi[1].total, alokasi[1].tge, BigInt((await pub.getBlock()).timestamp)]);
ok(m90 === setengah, `hari ke-90 matang tepat setengah linear (${m90 / 10n**18n})`);
await klaim(besar, 1);
ok((await saldo(besar.address)) === setengah, "klaim di tengah jalan hanya memberi yang matang");

await majuHari(89);
ok((await baca("bisaDiklaim", [besar.address, alokasi[1].total, alokasi[1].tge])) > 0n, "hari ke-179 masih ada sisa");
ok((await baca("matang", [alokasi[1].total, alokasi[1].tge, BigInt((await pub.getBlock()).timestamp)])) < alokasi[1].total,
   "hari ke-179 BELUM penuh");
await majuHari(2);
await klaim(besar, 1);
ok((await saldo(besar.address)) === alokasi[1].total, "sesudah 180 hari menerima seluruhnya");

/* ── Klaim terlambat tidak merugikan ─────────────────────────────────────── */
console.log("\nKlaim terlambat TIDAK merugikan (t0 dari TGE, bukan tanggal klaim)");
ok((await saldo(besar2.address)) === 0n, "besar2 belum pernah klaim");
await klaim(besar2, 2);
ok((await saldo(besar2.address)) === alokasi[2].total,
   "sekali klaim di akhir langsung menerima 100% — tidak ada yang hangus");

/* ── Bukti palsu ─────────────────────────────────────────────────────────── */
console.log("\nBukti merkle");
await reverts(() => tulis(asing, mv, mvArt.abi, "klaim",
  [alokasi[0].total, alokasi[0].tge, bukti(t, 0)]), "BuktiTidakSah",
  "alamat asing memakai bukti orang lain DITOLAK");
await reverts(() => tulis(besar2, mv, mvArt.abi, "klaim",
  [alokasi[2].total * 2n, alokasi[2].tge, bukti(t, 2)]), "BuktiTidakSah",
  "menaikkan sendiri jumlah alokasi DITOLAK");

/* ── Sweep tidak bisa menyentuh kewajiban ────────────────────────────────── */
console.log("\nsweep — tidak bisa menyentuh alokasi yang belum diklaim");
const mv2 = await dep(mvArt, [idm, t.root, TOTAL]);
await tulis(deployer, idm, idmArt.abi, "transfer", [mv2, TOTAL + parseEther("500")]);
await reverts(() => tulis(deployer, mv2, mvArt.abi, "sweep", [deployer.address, parseEther("501")]),
  "MelanggarKewajiban", "menarik melebihi kelebihan DITOLAK");
await tulis(deployer, mv2, mvArt.abi, "sweep", [deployer.address, parseEther("500")]);
ok((await pub.readContract({ address: idm, abi: idmArt.abi, functionName: "balanceOf", args: [mv2] })) === TOTAL,
   "hanya KELEBIHAN yang bisa keluar; kewajiban utuh");
await reverts(() => tulis(asing, mv2, mvArt.abi, "sweep", [asing.address, 1n]), "NotOwner", "sweep bukan owner ditolak");

/* ── Tidak ada pause ─────────────────────────────────────────────────────── */
const punyaPause = mvArt.abi.some((x) => x.type === "function" && /pause/i.test(x.name ?? ""));
ok(!punyaPause, "kontrak TIDAK punya fungsi pause sama sekali");
const bisaTurunkan = mvArt.abi.some((x) => x.type === "function" &&
  /setAlloc|setMerkle|setRoot|setTotal/i.test(x.name ?? ""));
ok(!bisaTurunkan, "tidak ada fungsi yang bisa mengubah alokasi");

console.log(`\n${gagal === 0 ? "✓" : "✗"} ${lulus} lulus, ${gagal} gagal`);
process.exit(gagal === 0 ? 0 : 1);
