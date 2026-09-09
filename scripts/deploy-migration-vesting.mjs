/**
 * Deploy MigrationVesting.sol ke BSC (§0.1 pos Migrasi Holder v1).
 *
 *   pnpm deploy:migrasi --demo       # testnet, pohon DEMO berlabel
 *   pnpm deploy:migrasi              # butuh MIGRATION_MERKLE_ROOT + MIGRATION_TOTAL_IDM
 *   pnpm deploy:migrasi --mainnet    # setelah audit + daftar final
 *
 * `merkleRoot` IMMUTABLE — daftar alokasi final WAJIB ada sebelum deploy.
 * Tidak ada jalan menukarnya belakangan, dan itu memang gunanya: alokasi yang
 * bisa diganti owner bukan kewajiban, melainkan janji.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createWalletClient, createPublicClient, http, parseEther, formatEther,
         keccak256, encodeAbiParameters, concat } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc, bscTestnet } from "viem/chains";

const require = createRequire(import.meta.url);
const solc = require("solc");
const env = {};
for (const l of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(l);
  if (m) env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
}
const mainnet = process.argv.includes("--mainnet");
const demo = process.argv.includes("--demo");
if (mainnet && demo) { console.error("✗ --demo dilarang di mainnet."); process.exit(1); }

const daun = (a, t, g) => keccak256(concat([keccak256(
  encodeAbiParameters([{type:"address"},{type:"uint256"},{type:"uint256"}], [a, t, g]))]));
const pasang = (a, b) => BigInt(a) <= BigInt(b)
  ? keccak256(encodeAbiParameters([{type:"bytes32"},{type:"bytes32"}], [a, b]))
  : keccak256(encodeAbiParameters([{type:"bytes32"},{type:"bytes32"}], [b, a]));
function akar(list) {
  let l = [...list];
  while (l.length > 1) {
    const n = [];
    for (let i = 0; i < l.length; i += 2) n.push(i + 1 < l.length ? pasang(l[i], l[i+1]) : l[i]);
    l = n;
  }
  return l[0];
}

let root, total, catatan;
if (demo) {
  // Pohon DEMO — bukan data migrasi nyata. Bentuknya meniru dua kohort §0.1
  // (di bawah & di atas ambang 250.000) supaya perilaku kontrak teruji di
  // rantai sungguhan, dengan nominal kecil agar tidak mengunci treasury.
  const AMBANG = parseEther("250000");
  const isi = [
    { akun: "0x1842498B06c146B5360D4b8d863a04A7c33fB2f3", total: parseEther("100") },
    { akun: "0xF573081596d39d45e20e570e9a23e17A709b70A6", total: parseEther("400000") },
  ];
  for (const a of isi) a.tge = a.total < AMBANG ? a.total : a.total / 5n;
  root = akar(isi.map((a) => daun(a.akun, a.total, a.tge)));
  total = isi.reduce((s, a) => s + a.total, 0n);
  catatan = "POHON DEMO (bukan data migrasi nyata)";
} else {
  root = env.MIGRATION_MERKLE_ROOT;
  const t = env.MIGRATION_TOTAL_IDM;
  if (!root || !/^0x[0-9a-fA-F]{64}$/.test(root)) {
    console.error("✗ MIGRATION_MERKLE_ROOT belum diisi (atau bukan bytes32).");
    console.error("  Susun dari daftar 487 alamat terverifikasi — ambang 250.000");
    console.error("  dievaluasi SAAT MENYUSUN, hasilnya jadi `bagianTge` di daun.");
    process.exit(1);
  }
  if (!t) { console.error("✗ MIGRATION_TOTAL_IDM belum diisi."); process.exit(1); }
  total = parseEther(t); catatan = "daftar terverifikasi";
}

const src = { "MigrationVesting.sol": { content: readFileSync("contracts/MigrationVesting.sol", "utf8") } };
const out = JSON.parse(solc.compile(JSON.stringify({ language: "Solidity", sources: src,
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi","evm.bytecode.object"] } } } })));
const errs = (out.errors ?? []).filter((e) => e.severity === "error");
if (errs.length) { errs.forEach((e) => console.error(e.formattedMessage)); process.exit(1); }
const art = out.contracts["MigrationVesting.sol"].MigrationVesting;
if (process.argv.includes("--dry-run")) {
  console.log(`✓ kompilasi OK · root ${root} · total ${formatEther(total)} IDM · ${catatan}`);
  process.exit(0);
}

const chain = mainnet ? bsc : bscTestnet;
const pk = env.DEPLOYER_PRIVATE_KEY;
const acct = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const wallet = createWalletClient({ account: acct, chain, transport: http() });
const pub = createPublicClient({ chain, transport: http() });
const idm = env.NEXT_PUBLIC_IDM_REBORN_ADDRESS;
if (!idm) { console.error("✗ NEXT_PUBLIC_IDM_REBORN_ADDRESS belum diisi."); process.exit(1); }

console.log(`→ Deploy ke ${chain.name} (chainId ${chain.id})`);
console.log(`  deployer : ${acct.address}`);
console.log(`  token    : ${idm}`);
console.log(`  root     : ${root}   (${catatan})`);
console.log(`  total    : ${formatEther(total)} IDM`);

const h = await wallet.deployContract({ abi: art.abi, bytecode: `0x${art.evm.bytecode.object}`,
  args: [idm, root, total] });
const r = await pub.waitForTransactionReceipt({ hash: h, timeout: 180_000 });
if (r.status !== "success") { console.error("✗ deploy gagal"); process.exit(1); }
console.log(`  ✓ MigrationVesting: ${r.contractAddress}`);
console.log(`  explorer: ${chain.blockExplorers?.default.url}/address/${r.contractAddress}`);
console.log("\nLangkah berikutnya (MANUAL, sadar):");
console.log("  1. Transfer alokasi dari treasury ke kontrak");
console.log("  2. setT0(<timestamp TGE>) — SEKALI SAJA, tidak bisa diubah");
