/**
 * Kompilasi + deploy SwapClaim.sol ke BNB Smart Chain (§10 langkah 3 — BSC B).
 *
 *   pnpm deploy:swap-bsc               # BSC testnet 97
 *   pnpm deploy:swap-bsc --mainnet     # BSC mainnet 56
 *   pnpm deploy:swap-bsc --dry-run     # kompilasi saja, tanpa kirim
 *
 * Butuh di .env.local:
 *   DEPLOYER_PRIVATE_KEY            — deployer biasa (BUKAN wallet lama, BUKAN
 *                                     treasury; pegang tBNB/BNB untuk gas).
 *   NEXT_PUBLIC_IDM_REBORN_ADDRESS  — hasil pnpm deploy:idm-bsc.
 *   SWAP_SIGNER_PRIVATE_KEY         — kunci penandatangan voucher swap; skrip
 *                                     hanya MENURUNKAN alamat publiknya untuk
 *                                     constructor. WAJIB BERBEDA dari
 *                                     MISSION_VOUCHER_PRIVATE_KEY.
 *
 * Satu transaksi: constructor sudah menerima signer + maxIdmxPerVoucher
 * (2.000e18, cermin cap mingguan SwapInitiator), jadi tidak ada tx setter
 * susulan yang bisa terlupa. Setelah ini: pnpm fund:swap-pool (kunci treasury)
 * mengisi kolam 150 juta IDM.
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

// Cermin cap mingguan SwapInitiator (§0) — naikkan hanya bila cap itu naik.
const MAX_IDMX_PER_VOUCHER = 2_000n * 10n ** 18n;

/* ── 1. Kompilasi ────────────────────────────────────────────────────────── */

const solc = require("solc");
const keluaran = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: {
        "SwapClaim.sol": {
          content: readFileSync(join(root, "contracts/SwapClaim.sol"), "utf8"),
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

const swapClaim = keluaran.contracts["SwapClaim.sol"].SwapClaim;
console.log(`✓ Kompilasi solc ${solc.version()}`);
console.log(`  SwapClaim — ${swapClaim.evm.bytecode.object.length / 2} byte`);

mkdirSync(join(root, "contracts/artifacts"), { recursive: true });
writeFileSync(
  join(root, "contracts/artifacts/SwapClaim.json"),
  JSON.stringify(
    {
      abi: swapClaim.abi,
      bytecode: `0x${swapClaim.evm.bytecode.object}`,
      compiler: solc.version(),
      optimizer: { enabled: true, runs: 200 },
    },
    null,
    2,
  ),
);
console.log("✓ Artefak → contracts/artifacts/SwapClaim.json");

if (dryRun) {
  console.log("Dry run selesai — tidak ada transaksi dikirim.");
  process.exit(0);
}

/* ── 2. Deploy ───────────────────────────────────────────────────────────── */

const { createWalletClient, createPublicClient, http, isAddress, getAddress } =
  await import("viem");
const { privateKeyToAccount } = await import("viem/accounts");
const { bsc, bscTestnet } = await import("viem/chains");

const chain = keMainnet ? bsc : bscTestnet;

const pk = env.DEPLOYER_PRIVATE_KEY;
if (!pk) {
  console.error("✗ DEPLOYER_PRIVATE_KEY belum diisi di .env.local");
  process.exit(1);
}
const idmMentah = env.NEXT_PUBLIC_IDM_REBORN_ADDRESS;
if (!idmMentah || !isAddress(idmMentah)) {
  console.error(
    "✗ NEXT_PUBLIC_IDM_REBORN_ADDRESS belum diisi / bukan alamat sah.",
  );
  console.error("  Jalankan dulu: pnpm deploy:idm-bsc");
  process.exit(1);
}
const idm = getAddress(idmMentah);

const signerPk = env.SWAP_SIGNER_PRIVATE_KEY;
if (!signerPk) {
  console.error("✗ SWAP_SIGNER_PRIVATE_KEY belum diisi di .env.local");
  console.error("  Buat kunci BARU (jangan pakai MISSION_VOUCHER_PRIVATE_KEY):");
  console.error("  openssl rand -hex 32");
  process.exit(1);
}
const swapSigner = privateKeyToAccount(
  signerPk.startsWith("0x") ? signerPk : `0x${signerPk}`,
).address;
// Bandingkan ALAMAT turunan, bukan string kunci — kunci yang sama bisa ditulis
// dengan/tanpa 0x atau beda kapitalisasi hex dan lolos perbandingan string.
const misiPk = env.MISSION_VOUCHER_PRIVATE_KEY;
if (
  misiPk &&
  privateKeyToAccount(misiPk.startsWith("0x") ? misiPk : `0x${misiPk}`)
    .address === swapSigner
) {
  console.error(
    "✗ SWAP_SIGNER_PRIVATE_KEY sama dengan MISSION_VOUCHER_PRIVATE_KEY —",
  );
  console.error(
    "  dilarang: satu kunci bocor tidak boleh membuka dua pintu sekaligus.",
  );
  process.exit(1);
}

const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const wallet = createWalletClient({ account, chain, transport: http() });
const publik = createPublicClient({ chain, transport: http() });

// SwapClaim menunjuk IDM lewat interface — pastikan alamatnya benar-benar
// kontrak di chain ini, bukan salah tempel dari chain lain.
if ((await publik.getCode({ address: idm })) === undefined) {
  console.error(`✗ Tidak ada kontrak di ${idm} pada ${chain.name}.`);
  process.exit(1);
}

console.log(`→ Deploy ke ${chain.name} (chainId ${chain.id})`);
console.log(`  deployer            : ${account.address}`);
console.log(`  IDM Reborn          : ${idm}`);
console.log(`  swapSigner          : ${swapSigner}`);
console.log(`  maxIdmxPerVoucher   : ${MAX_IDMX_PER_VOUCHER / 10n ** 18n} IDMX`);

if ((await publik.getBalance({ address: account.address })) === 0n) {
  console.error(
    `✗ Saldo deployer 0. Isi dulu ${keMainnet ? "BNB" : "tBNB (faucet BNB Chain, pilih BSC Testnet)"}.`,
  );
  process.exit(1);
}

const hash = await wallet.deployContract({
  abi: swapClaim.abi,
  bytecode: `0x${swapClaim.evm.bytecode.object}`,
  args: [idm, swapSigner, MAX_IDMX_PER_VOUCHER],
});
console.log(`  SwapClaim tx: ${hash} — menunggu receipt…`);
const receipt = await publik.waitForTransactionReceipt({ hash, timeout: 120_000 });
if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("✗ Deploy SwapClaim gagal:", receipt.status);
  process.exit(1);
}
console.log(`  ✓ SwapClaim: ${receipt.contractAddress}\n`);

const explorer = chain.blockExplorers?.default.url ?? "";
console.log(`explorer SwapClaim: ${explorer}/address/${receipt.contractAddress}\n`);
console.log("Salin ke .env.local & environment Vercel:");
console.log(`  NEXT_PUBLIC_SWAP_CLAIM_ADDRESS=${receipt.contractAddress}`);
console.log("\nLangkah berikutnya: pnpm fund:swap-pool (kunci treasury, 150 juta IDM).");
