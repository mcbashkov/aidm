/**
 * Kompilasi + deploy ReportAttestation.sol ke opBNB (§9.4).
 *
 *   pnpm deploy:attestation                 # testnet (default M4)
 *   pnpm deploy:attestation --mainnet       # mainnet (setelah audit ringan!)
 *   pnpm deploy:attestation --dry-run       # kompilasi saja, tanpa kirim
 *
 * Butuh di .env.local:
 *   DEPLOYER_PRIVATE_KEY   — kunci deployer (pegang tBNB/BNB untuk gas).
 *   SEAL_RELAYER_ADDRESS   — alamat relayer treasury (opsional; default =
 *                            alamat deployer, bisa diganti setRelayer nanti).
 *
 * Setelah sukses, skrip mencetak dua baris env yang tinggal disalin:
 *   NEXT_PUBLIC_REPORT_ATTESTATION_ADDRESS=0x…
 *   AIDM_SEAL_CHAIN=opbnb-testnet
 *
 * Kompiler DIPIN solc@0.8.26 (package.json) sama persis dengan pragma —
 * supaya bytecode bisa direproduksi & diverifikasi di explorer.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));

// .env.local dimuat manual (skrip node polos, bukan Next).
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

/* ── 1. Kompilasi ────────────────────────────────────────────────────────── */

const solc = require("solc");
const sumber = readFileSync(join(root, "contracts/ReportAttestation.sol"), "utf8");
const keluaran = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: { "ReportAttestation.sol": { content: sumber } },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: {
          "*": { "*": ["abi", "evm.bytecode.object", "metadata"] },
        },
      },
    }),
  ),
);

const galat = (keluaran.errors ?? []).filter((e) => e.severity === "error");
if (galat.length) {
  for (const e of galat) console.error(e.formattedMessage);
  process.exit(1);
}
const kontrak = keluaran.contracts["ReportAttestation.sol"].ReportAttestation;
const abi = kontrak.abi;
const bytecode = `0x${kontrak.evm.bytecode.object}`;
console.log(`✓ Kompilasi solc ${solc.version()} — bytecode ${(bytecode.length - 2) / 2} byte`);

// Artefak disimpan untuk verifikasi explorer & audit.
mkdirSync(join(root, "contracts/artifacts"), { recursive: true });
writeFileSync(
  join(root, "contracts/artifacts/ReportAttestation.json"),
  JSON.stringify(
    { abi, bytecode, compiler: solc.version(), optimizer: { enabled: true, runs: 200 } },
    null,
    2,
  ),
);
console.log("✓ Artefak → contracts/artifacts/ReportAttestation.json");

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
    "⚠ MAINNET: pastikan audit ringan §9.4 sudah selesai & owner akan dipindah ke multisig.",
  );
}

const pk = env.DEPLOYER_PRIVATE_KEY;
if (!pk) {
  console.error("✗ DEPLOYER_PRIVATE_KEY belum diisi di .env.local");
  process.exit(1);
}
const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const relayer = env.SEAL_RELAYER_ADDRESS || account.address;

const wallet = createWalletClient({ account, chain, transport: http() });
const publik = createPublicClient({ chain, transport: http() });

console.log(`→ Deploy ke ${chain.name} (chainId ${chain.id})`);
console.log(`  deployer: ${account.address}`);
console.log(`  relayer : ${relayer}`);

const saldo = await publik.getBalance({ address: account.address });
if (saldo === 0n) {
  console.error(
    `✗ Saldo deployer 0. Isi dulu ${keMainnet ? "BNB" : "tBNB (faucet: https://www.bnbchain.org/en/testnet-faucet)"}.`,
  );
  process.exit(1);
}

const txHash = await wallet.deployContract({ abi, bytecode, args: [relayer] });
console.log(`  tx: ${txHash} — menunggu receipt…`);
const receipt = await publik.waitForTransactionReceipt({
  hash: txHash,
  timeout: 120_000,
});
if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("✗ Deploy gagal:", receipt.status);
  process.exit(1);
}

console.log(`\n✓ ReportAttestation ter-deploy: ${receipt.contractAddress}`);
console.log(`  explorer: ${chain.blockExplorers?.default.url}/address/${receipt.contractAddress}\n`);
console.log("Salin ke .env.local & environment Vercel:");
console.log(`  NEXT_PUBLIC_REPORT_ATTESTATION_ADDRESS=${receipt.contractAddress}`);
console.log(`  AIDM_SEAL_CHAIN=${keMainnet ? "opbnb" : "opbnb-testnet"}`);
console.log(
  "  SEAL_RELAYER_PRIVATE_KEY=<kunci relayer — sama dengan deployer bila SEAL_RELAYER_ADDRESS tidak diganti>",
);
