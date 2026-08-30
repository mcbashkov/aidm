/**
 * Verifikasi source keenam kontrak ke explorer, lewat API terpadu Etherscan V2
 * (satu API key untuk opBNB Testnet 5611 dan BSC Testnet 97).
 *
 * Memakai standard-json-input, BUKAN single-file: setelan kompilasi ikut
 * terkirim apa adanya, jadi tidak ada peluang salah pilih optimizer/evmVersion
 * di form UI. Input JSON-nya disusun persis seperti yang dipakai skrip deploy
 * (optimizer enabled/200, evmVersion dibiarkan default) sehingga bytecode-nya
 * dijamin sama.
 *
 * Argumen konstruktor tidak diketik manual: skrip mengambil tx pembuatan
 * kontrak dari explorer, lalu memotong bytecode creation dari input tx —
 * sisanya adalah argumen konstruktor ter-ABI-encode.
 *
 * Pakai:
 *   ETHERSCAN_API_KEY=xxx node scripts/verify-contracts.mjs
 *   ETHERSCAN_API_KEY=xxx node scripts/verify-contracts.mjs SwapClaim
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const solc = require("solc");

/* ── env ──────────────────────────────────────────────────────────────────── */
const env = { ...process.env };
try {
  for (const l of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    if (!l.trim() || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i > 0) env[l.slice(0, i)] ??= l.slice(i + 1).replace(/^["']|["']$/g, "");
  }
} catch {
  /* tanpa .env.local — env shell saja */
}

const API_KEY = env.ETHERSCAN_API_KEY;
if (!API_KEY) {
  console.error("✗ ETHERSCAN_API_KEY belum diisi.");
  console.error("  Ambil gratis di https://etherscan.io/myapikey — satu key");
  console.error("  berlaku untuk semua chain lewat API V2.");
  process.exit(1);
}

/* ── target ───────────────────────────────────────────────────────────────── */
// Alamat diambil dari .env.local supaya tidak ada nilai yang di-hardcode ganda.
const A = (k) => (env[k] || "").trim();
const TARGET = [
  { nama: "IDMX", berkas: "IDMX.sol", chainId: 5611, alamat: A("NEXT_PUBLIC_IDMX_ADDRESS") },
  { nama: "MissionRewards", berkas: "MissionRewards.sol", chainId: 5611, alamat: A("NEXT_PUBLIC_MISSION_REWARDS_ADDRESS") },
  { nama: "ReportAttestation", berkas: "ReportAttestation.sol", chainId: 5611, alamat: A("NEXT_PUBLIC_REPORT_ATTESTATION_ADDRESS") },
  { nama: "SwapInitiator", berkas: "SwapInitiator.sol", chainId: 5611, alamat: A("NEXT_PUBLIC_SWAP_INITIATOR_ADDRESS") },
  { nama: "IDMReborn", berkas: "IDMReborn.sol", chainId: 97, alamat: A("NEXT_PUBLIC_IDM_REBORN_ADDRESS") },
  { nama: "SwapClaim", berkas: "SwapClaim.sol", chainId: 97, alamat: A("NEXT_PUBLIC_SWAP_CLAIM_ADDRESS") },
];

const hanya = process.argv[2];
const daftar = hanya ? TARGET.filter((t) => t.nama === hanya) : TARGET;
if (!daftar.length) {
  console.error(`✗ Kontrak "${hanya}" tidak dikenal. Pilihan: ${TARGET.map((t) => t.nama).join(", ")}`);
  process.exit(1);
}

const api = (chainId) => `https://api.etherscan.io/v2/api?chainid=${chainId}`;
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Standard JSON input yang IDENTIK dengan yang dipakai skrip deploy.
 * evmVersion sengaja tidak diisi: solc 0.8.26 memakai default (cancun), dan
 * itulah yang menghasilkan bytecode yang sekarang ada on-chain. Mengisinya
 * secara eksplisit berisiko meleset dari perilaku deploy.
 */
function standardJson(berkas) {
  return {
    language: "Solidity",
    sources: { [berkas]: { content: readFileSync(join(root, "contracts", berkas), "utf8") } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
}

/** Bytecode creation hasil kompilasi lokal — dipakai memotong argumen konstruktor. */
function bytecodeCreation(berkas, nama) {
  const out = JSON.parse(solc.compile(JSON.stringify(standardJson(berkas))));
  const galat = (out.errors ?? []).filter((e) => e.severity === "error");
  if (galat.length) throw new Error(galat.map((e) => e.formattedMessage).join("\n"));
  return out.contracts[berkas][nama].evm.bytecode.object.toLowerCase();
}

/** Argumen konstruktor = input tx pembuatan − bytecode creation. */
async function argumenKonstruktor(t, creation) {
  const r = await fetch(
    `${api(t.chainId)}&module=contract&action=getcontractcreation&contractaddresses=${t.alamat}&apikey=${API_KEY}`,
  );
  const j = await r.json();
  const txHash = j?.result?.[0]?.txHash;
  if (!txHash) {
    console.log("   ⚠ tx pembuatan tidak ditemukan — argumen konstruktor dikosongkan");
    console.log("     (explorer biasanya masih bisa mendeteksinya sendiri)");
    return "";
  }
  const rpcUrl = t.chainId === 5611
    ? env.NEXT_PUBLIC_OPBNB_TESTNET_RPC_URL || "https://opbnb-testnet-rpc.bnbchain.org"
    : env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
  const rr = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionByHash", params: [txHash] }),
  });
  const input = ((await rr.json())?.result?.input || "").replace(/^0x/, "").toLowerCase();
  if (!input.startsWith(creation)) {
    console.log("   ⚠ bytecode creation tidak cocok dengan input tx — argumen dikosongkan");
    return "";
  }
  return input.slice(creation.length);
}

/* ── verifikasi ───────────────────────────────────────────────────────────── */
let sukses = 0;
let gagal = 0;

for (const t of daftar) {
  const chain = t.chainId === 5611 ? "opBNB-testnet" : "BSC-testnet";
  console.log(`\n━━ ${t.nama}  [${chain}]  ${t.alamat}`);

  if (!t.alamat) {
    console.log("   ⏭ alamat kosong di .env.local — dilewati");
    continue;
  }

  // Sudah terverifikasi? Jangan buang kuota API.
  const cek = await (
    await fetch(`${api(t.chainId)}&module=contract&action=getabi&address=${t.alamat}&apikey=${API_KEY}`)
  ).json();
  if (cek.status === "1") {
    console.log("   ✅ sudah terverifikasi — dilewati");
    sukses++;
    continue;
  }

  const creation = bytecodeCreation(t.berkas, t.nama);
  const args = await argumenKonstruktor(t, creation);
  console.log(`   argumen konstruktor: ${args ? `${args.length / 2} byte` : "(kosong)"}`);

  const body = new URLSearchParams({
    apikey: API_KEY,
    module: "contract",
    action: "verifysourcecode",
    codeformat: "solidity-standard-json-input",
    contractaddress: t.alamat,
    sourceCode: JSON.stringify(standardJson(t.berkas)),
    contractname: `${t.berkas}:${t.nama}`,
    compilerversion: "v0.8.26+commit.8a97fa7a",
    constructorArguements: args, // ejaan Etherscan, memang begitu
    licenseType: "3", // 3 = MIT
  });

  const kirim = await (await fetch(api(t.chainId), { method: "POST", body })).json();
  if (kirim.status !== "1") {
    console.log(`   ❌ pengiriman ditolak: ${kirim.result}`);
    gagal++;
    continue;
  }

  const guid = kirim.result;
  console.log(`   → dikirim, guid ${guid} — menunggu hasil`);

  let hasil = null;
  for (let i = 0; i < 20; i++) {
    await tidur(5000);
    const s = await (
      await fetch(`${api(t.chainId)}&module=contract&action=checkverifystatus&guid=${guid}&apikey=${API_KEY}`)
    ).json();
    if (String(s.result).includes("Pending")) continue;
    hasil = s;
    break;
  }

  if (!hasil) {
    console.log("   ⚠ masih Pending setelah 100 detik — cek manual di explorer");
  } else if (hasil.status === "1") {
    console.log(`   ✅ ${hasil.result}`);
    sukses++;
  } else {
    console.log(`   ❌ ${hasil.result}`);
    gagal++;
  }
}

console.log(`\n═══ ${sukses} terverifikasi · ${gagal} gagal ═══`);
if (gagal) process.exit(1);
