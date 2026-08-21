/**
 * Kompilasi + deploy SwapInitiator.sol ke opBNB (§10 langkah 5).
 *
 *   pnpm deploy:swap-opbnb             # opBNB testnet 5611
 *   pnpm deploy:swap-opbnb --mainnet   # opBNB mainnet 204
 *   pnpm deploy:swap-opbnb --dry-run   # kompilasi saja, tanpa kirim
 *
 * Butuh di .env.local:
 *   DEPLOYER_PRIVATE_KEY       — deployer biasa (sama dengan deploy:rewards).
 *   NEXT_PUBLIC_IDMX_ADDRESS   — hasil pnpm deploy:rewards.
 *
 * Parameter breaker TESTNET sengaja kecil supaya jalur breaker & plafon bisa
 * benar-benar diuji tanpa membakar ratusan ribu IDMX. Untuk MAINNET skrip
 * MENOLAK angka default — ambang & plafon wajib dihitung dulu:
 *   plafonKumulatif = sisa kolam IDM di SwapClaim × rate saat itu
 *   ambangGlobal    = 3× proyeksi permintaan mingguan normal
 * lalu diisi via env SWAP_GLOBAL_THRESHOLD_IDMX / SWAP_LIFETIME_CAP_IDMX
 * (satuan: IDMX utuh, tanpa e18).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));

const env = { ...process.env };
try {
  for (const l of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    if (/^[A-Z_][A-Z0-9_]*=/.test(l)) {
      const i = l.indexOf("=");
      const nilai = l
        .slice(i + 1)
        .replace(/\s+#.*$/, "")
        .trim()
        .replace(/^["']|["']$/g, "");
      env[l.slice(0, i)] ??= nilai;
    }
  }
} catch {
  /* tanpa .env.local — env shell saja */
}

const keMainnet = process.argv.includes("--mainnet");
const dryRun = process.argv.includes("--dry-run");

const WEI = 10n ** 18n;
// §0: cap tukar 2.000 IDMX / minggu WIB / dompet — testnet dan mainnet sama.
const WEEKLY_CAP = 2_000n * WEI;

let globalThreshold;
let lifetimeCap;
if (keMainnet) {
  const t = env.SWAP_GLOBAL_THRESHOLD_IDMX;
  const p = env.SWAP_LIFETIME_CAP_IDMX;
  if (!/^\d+$/.test(t ?? "") || !/^\d+$/.test(p ?? "")) {
    console.error("✗ Mainnet butuh SWAP_GLOBAL_THRESHOLD_IDMX dan");
    console.error("  SWAP_LIFETIME_CAP_IDMX di env (IDMX utuh, tanpa e18).");
    console.error("  Hitung dulu lewat runbook ratchet — jangan pakai default testnet.");
    process.exit(1);
  }
  globalThreshold = BigInt(t) * WEI;
  lifetimeCap = BigInt(p) * WEI;
} else {
  // §10 langkah 5: kecil supaya breaker (100k) dan plafon (200k) teruji.
  globalThreshold = 100_000n * WEI;
  lifetimeCap = 200_000n * WEI;
}

/* ── 1. Kompilasi ────────────────────────────────────────────────────────── */

const solc = require("solc");
const keluaran = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: {
        "SwapInitiator.sol": {
          content: readFileSync(join(root, "contracts/SwapInitiator.sol"), "utf8"),
        },
      },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
      },
    }),
  ),
);

const galat = (keluaran.errors ?? []).filter((e) => e.severity === "error");
if (galat.length) {
  for (const e of galat) console.error(e.formattedMessage);
  process.exit(1);
}

const initiator = keluaran.contracts["SwapInitiator.sol"].SwapInitiator;
console.log(`✓ Kompilasi solc ${solc.version()}`);
console.log(`  SwapInitiator — ${initiator.evm.bytecode.object.length / 2} byte`);

mkdirSync(join(root, "contracts/artifacts"), { recursive: true });
writeFileSync(
  join(root, "contracts/artifacts/SwapInitiator.json"),
  JSON.stringify(
    {
      abi: initiator.abi,
      bytecode: `0x${initiator.evm.bytecode.object}`,
      compiler: solc.version(),
      optimizer: { enabled: true, runs: 200 },
    },
    null,
    2,
  ),
);
console.log("✓ Artefak → contracts/artifacts/SwapInitiator.json");

if (dryRun) {
  console.log("Dry run selesai — tidak ada transaksi dikirim.");
  process.exit(0);
}

/* ── 2. Deploy ───────────────────────────────────────────────────────────── */

const { createWalletClient, createPublicClient, http, isAddress, getAddress } =
  await import("viem");
const { privateKeyToAccount } = await import("viem/accounts");
// opBNB TIDAK ada di viem/chains bawaan (beda dengan bsc/bscTestnet) — pakai
// definisi chain kustom repo yang sama dipakai deploy-rewards.mjs, sudah
// membaca NEXT_PUBLIC_OPBNB(_TESTNET)_RPC_URL dari .env.local dengan fallback.
const { opbnb, opbnbTestnet } = await import(
  new URL(join(root, "lib/chains/opbnb.ts"), "file://").href
);

const chain = keMainnet ? opbnb : opbnbTestnet;

const pk = env.DEPLOYER_PRIVATE_KEY;
if (!pk) {
  console.error("✗ DEPLOYER_PRIVATE_KEY belum diisi di .env.local");
  process.exit(1);
}
const idmxMentah = env.NEXT_PUBLIC_IDMX_ADDRESS;
if (!idmxMentah || !isAddress(idmxMentah)) {
  console.error("✗ NEXT_PUBLIC_IDMX_ADDRESS belum diisi / bukan alamat sah.");
  console.error("  Jalankan dulu: pnpm deploy:rewards");
  process.exit(1);
}
const idmx = getAddress(idmxMentah);

const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const wallet = createWalletClient({ account, chain, transport: http() });
const publik = createPublicClient({ chain, transport: http() });

if ((await publik.getCode({ address: idmx })) === undefined) {
  console.error(`✗ Tidak ada kontrak di ${idmx} pada ${chain.name}.`);
  process.exit(1);
}

console.log(`→ Deploy ke ${chain.name} (chainId ${chain.id})`);
console.log(`  deployer        : ${account.address}`);
console.log(`  IDMX            : ${idmx}`);
console.log(`  weeklyCap       : ${WEEKLY_CAP / WEI} IDMX`);
console.log(`  globalThreshold : ${globalThreshold / WEI} IDMX`);
console.log(`  lifetimeCap     : ${lifetimeCap / WEI} IDMX`);

if ((await publik.getBalance({ address: account.address })) === 0n) {
  console.error(
    `✗ Saldo deployer 0. Isi dulu ${keMainnet ? "BNB" : "tBNB (faucet BNB Chain, pilih opBNB Testnet)"}.`,
  );
  process.exit(1);
}

const hash = await wallet.deployContract({
  abi: initiator.abi,
  bytecode: `0x${initiator.evm.bytecode.object}`,
  args: [idmx, WEEKLY_CAP, globalThreshold, lifetimeCap],
});
console.log(`  SwapInitiator tx: ${hash} — menunggu receipt…`);
const receipt = await publik.waitForTransactionReceipt({ hash, timeout: 120_000 });
if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("✗ Deploy SwapInitiator gagal:", receipt.status);
  process.exit(1);
}
console.log(`  ✓ SwapInitiator: ${receipt.contractAddress}\n`);

const explorer = chain.blockExplorers?.default.url ?? "";
console.log(`explorer SwapInitiator: ${explorer}/address/${receipt.contractAddress}\n`);
console.log("Salin ke .env.local & environment Vercel:");
console.log(`  NEXT_PUBLIC_SWAP_INITIATOR_ADDRESS=${receipt.contractAddress}`);
console.log("\nBerikutnya: relayer swap (§10 langkah 6) + set cursor blok awal.");
