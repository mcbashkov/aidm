/**
 * Kompilasi + deploy IDMX.sol & MissionRewards.sol ke opBNB (§7.6 / §8.1).
 *
 *   pnpm deploy:rewards                # testnet (default M4)
 *   pnpm deploy:rewards --mainnet      # mainnet (setelah audit ringan!)
 *   pnpm deploy:rewards --dry-run      # kompilasi saja, tanpa kirim
 *
 * Butuh di .env.local:
 *   DEPLOYER_PRIVATE_KEY          — deployer (pegang tBNB/BNB untuk gas).
 *   MISSION_VOUCHER_ADDRESS       — opsional; alamat penandatangan voucher.
 *                                   Default = alamat deployer.
 *
 * Urutan yang dilakukan skrip:
 *   1. Deploy IDMX — SELURUH pasokan dicetak ke deployer (treasury).
 *   2. Deploy MissionRewards — menunjuk IDMX + penandatangan + kedua cap.
 *   3. Transfer dana awal IDMX ke MissionRewards supaya klaim pertama bisa
 *      langsung dibayar. Tanpa langkah ini kontrak berdiri tapi setiap klaim
 *      revert karena saldonya nol — kegagalan yang membingungkan di produksi.
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
      env[l.slice(0, i)] ??= l.slice(i + 1).replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* tanpa .env.local — env shell saja */
}

const keMainnet = process.argv.includes("--mainnet");
const dryRun = process.argv.includes("--dry-run");

/* ── Parameter ekonomi (§8.1 / §7.6) ─────────────────────────────────────── */
const PASOKAN_IDMX = 10_000_000_000_000n; // 10 triliun (§8.1)
const DANA_AWAL_IDMX = 100_000_000n; // 100 juta IDMX untuk kontrak reward
const CAP_HARIAN = 250n; // §7.6
const CAP_BULANAN = 150n; // §7.6 (cap tersendiri)
const WEI = 10n ** 18n;

/* ── 1. Kompilasi ────────────────────────────────────────────────────────── */

const solc = require("solc");
const sumber = {
  "IDMX.sol": { content: readFileSync(join(root, "contracts/IDMX.sol"), "utf8") },
  "MissionRewards.sol": {
    content: readFileSync(join(root, "contracts/MissionRewards.sol"), "utf8"),
  },
};

const keluaran = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: sumber,
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

const idmx = keluaran.contracts["IDMX.sol"].IDMX;
const rewards = keluaran.contracts["MissionRewards.sol"].MissionRewards;
console.log(`✓ Kompilasi solc ${solc.version()}`);
console.log(`  IDMX           — ${idmx.evm.bytecode.object.length / 2} byte`);
console.log(`  MissionRewards — ${rewards.evm.bytecode.object.length / 2} byte`);

mkdirSync(join(root, "contracts/artifacts"), { recursive: true });
for (const [nama, c] of [
  ["IDMX", idmx],
  ["MissionRewards", rewards],
]) {
  writeFileSync(
    join(root, `contracts/artifacts/${nama}.json`),
    JSON.stringify(
      {
        abi: c.abi,
        bytecode: `0x${c.evm.bytecode.object}`,
        compiler: solc.version(),
        optimizer: { enabled: true, runs: 200 },
      },
      null,
      2,
    ),
  );
}
console.log("✓ Artefak → contracts/artifacts/");

if (dryRun) {
  console.log("Dry run selesai — tidak ada transaksi dikirim.");
  process.exit(0);
}

/* ── 2. Deploy ───────────────────────────────────────────────────────────── */

const { createWalletClient, createPublicClient, http } = await import("viem");
const { privateKeyToAccount } = await import("viem/accounts");
const { opbnb, opbnbTestnet } = await import(
  new URL(join(root, "lib/chains/opbnb.ts"), "file://").href
);

const chain = keMainnet ? opbnb : opbnbTestnet;
if (keMainnet) {
  console.warn(
    "⚠ MAINNET: pastikan audit ringan §9.4 selesai & owner dipindah ke multisig.",
  );
}

const pk = env.DEPLOYER_PRIVATE_KEY;
if (!pk) {
  console.error("✗ DEPLOYER_PRIVATE_KEY belum diisi di .env.local");
  process.exit(1);
}
const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const signer = env.MISSION_VOUCHER_ADDRESS || account.address;

const wallet = createWalletClient({ account, chain, transport: http() });
const publik = createPublicClient({ chain, transport: http() });

console.log(`→ Deploy ke ${chain.name} (chainId ${chain.id})`);
console.log(`  deployer/treasury : ${account.address}`);
console.log(`  penandatangan     : ${signer}`);

if ((await publik.getBalance({ address: account.address })) === 0n) {
  console.error(
    `✗ Saldo deployer 0. Isi dulu ${keMainnet ? "BNB" : "tBNB (faucet BNB Chain, pilih opBNB Testnet)"}.`,
  );
  process.exit(1);
}

async function deploy(nama, c, args) {
  const hash = await wallet.deployContract({
    abi: c.abi,
    bytecode: `0x${c.evm.bytecode.object}`,
    args,
  });
  console.log(`  ${nama} tx: ${hash} — menunggu receipt…`);
  const receipt = await publik.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    console.error(`✗ Deploy ${nama} gagal:`, receipt.status);
    process.exit(1);
  }
  console.log(`  ✓ ${nama}: ${receipt.contractAddress}`);
  return receipt.contractAddress;
}

const alamatIdmx = await deploy("IDMX", idmx, [
  account.address,
  PASOKAN_IDMX * WEI,
]);
const alamatRewards = await deploy("MissionRewards", rewards, [
  alamatIdmx,
  signer,
  CAP_HARIAN * WEI,
  CAP_BULANAN * WEI,
]);

/* ── 3. Danai kontrak reward ─────────────────────────────────────────────── */

console.log(`→ Mendanai MissionRewards dengan ${DANA_AWAL_IDMX} IDMX…`);
const txDana = await wallet.writeContract({
  address: alamatIdmx,
  abi: idmx.abi,
  functionName: "transfer",
  args: [alamatRewards, DANA_AWAL_IDMX * WEI],
});
const receiptDana = await publik.waitForTransactionReceipt({
  hash: txDana,
  timeout: 120_000,
});
if (receiptDana.status !== "success") {
  console.error("✗ Pendanaan gagal — kontrak berdiri tapi klaim akan revert.");
  process.exit(1);
}
console.log("  ✓ Dana masuk\n");

const explorer = chain.blockExplorers?.default.url ?? "";
console.log(`explorer IDMX   : ${explorer}/address/${alamatIdmx}`);
console.log(`explorer Rewards: ${explorer}/address/${alamatRewards}\n`);
console.log("Salin ke .env.local & environment Vercel:");
console.log(`  NEXT_PUBLIC_IDMX_ADDRESS=${alamatIdmx}`);
console.log(`  NEXT_PUBLIC_MISSION_REWARDS_ADDRESS=${alamatRewards}`);
console.log(`  AIDM_REWARD_CHAIN=${keMainnet ? "opbnb" : "opbnb-testnet"}`);
console.log(
  "  MISSION_VOUCHER_PRIVATE_KEY=<kunci penandatangan — sama dengan deployer bila MISSION_VOUCHER_ADDRESS tidak diganti>",
);
console.log(
  "  MISSION_RELAYER_PRIVATE_KEY=<opsional; bila kosong memakai SEAL_RELAYER_PRIVATE_KEY>",
);
