/**
 * Kompilasi + deploy IDMReborn.sol ke BNB Smart Chain (§10 langkah 2 — BSC A).
 *
 *   pnpm deploy:idm-bsc                # BSC testnet 97 (gladi resik)
 *   pnpm deploy:idm-bsc --mainnet      # BSC mainnet 56
 *   pnpm deploy:idm-bsc --dry-run      # kompilasi saja, tanpa kirim
 *
 * Butuh di .env.local:
 *   IDM_LEGACY_DEPLOYER_PRIVATE_KEY — WALLET LAMA IDM (provenance ATH; tampil
 *                                     sebagai Contract Creator di BscScan).
 *                                     Wallet ini HANYA menandatangani 1 tx ini.
 *   IDM_TREASURY_ADDRESS            — penerima 1 miliar IDM. Testnet: EOA baru.
 *                                     Mainnet: WAJIB multisig.
 *
 * Pemisahan peran (permintaan langsung PO — jangan dicampur):
 *   deployer = wallet lama, BUKAN owner (kontrak memang tanpa owner), BUKAN
 *   treasury, tidak pernah memegang token. Sekali pakai: isi tBNB secukupnya
 *   → deploy → tidak dipakai lagi.
 *
 * Skrip ini SATU transaksi saja. Salah isi IDM_TREASURY_ADDRESS = seluruh
 * suplai nyangkut permanen (tanpa fungsi owner, tak bisa ditarik), maka alamat
 * treasury ditampilkan dan divalidasi sebelum kirim.
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
      // Buang komentar sebaris (hanya bila didahului spasi — password di
      // SUPABASE_DB_URL boleh mengandung "#") lalu trim: alamat/kunci yang
      // kecolongan spasi ekor gagal validasi dengan pesan membingungkan.
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

/* ── 1. Kompilasi ────────────────────────────────────────────────────────── */

const solc = require("solc");
const keluaran = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: {
        "IDMReborn.sol": {
          content: readFileSync(join(root, "contracts/IDMReborn.sol"), "utf8"),
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

const idm = keluaran.contracts["IDMReborn.sol"].IDMReborn;
console.log(`✓ Kompilasi solc ${solc.version()}`);
console.log(`  IDMReborn — ${idm.evm.bytecode.object.length / 2} byte`);

mkdirSync(join(root, "contracts/artifacts"), { recursive: true });
writeFileSync(
  join(root, "contracts/artifacts/IDMReborn.json"),
  JSON.stringify(
    {
      abi: idm.abi,
      bytecode: `0x${idm.evm.bytecode.object}`,
      compiler: solc.version(),
      optimizer: { enabled: true, runs: 200 },
    },
    null,
    2,
  ),
);
console.log("✓ Artefak → contracts/artifacts/IDMReborn.json");

if (dryRun) {
  console.log("Dry run selesai — tidak ada transaksi dikirim.");
  process.exit(0);
}

/* ── 2. Deploy — SATU transaksi dari wallet lama ─────────────────────────── */

const { createWalletClient, createPublicClient, http, isAddress, getAddress } =
  await import("viem");
const { privateKeyToAccount } = await import("viem/accounts");
const { bsc, bscTestnet } = await import("viem/chains");

const chain = keMainnet ? bsc : bscTestnet;
if (keMainnet) {
  console.warn(
    "⚠ MAINNET: pastikan IDM_TREASURY_ADDRESS = MULTISIG dan sudah dicek dua kali.",
  );
}

const pk = env.IDM_LEGACY_DEPLOYER_PRIVATE_KEY;
if (!pk) {
  console.error("✗ IDM_LEGACY_DEPLOYER_PRIVATE_KEY belum diisi di .env.local");
  process.exit(1);
}
const treasuryMentah = env.IDM_TREASURY_ADDRESS;
if (!treasuryMentah || !isAddress(treasuryMentah)) {
  console.error(
    "✗ IDM_TREASURY_ADDRESS belum diisi / bukan alamat sah. Suplai 1 miliar",
  );
  console.error(
    "  dicetak ke alamat ini TANPA jalan kembali — wajib benar sebelum deploy.",
  );
  process.exit(1);
}
const treasury = getAddress(treasuryMentah);

const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const wallet = createWalletClient({ account, chain, transport: http() });
const publik = createPublicClient({ chain, transport: http() });

console.log(`→ Deploy ke ${chain.name} (chainId ${chain.id})`);
console.log(`  deployer (wallet lama) : ${account.address}`);
console.log(`  treasury (terima 1 M)  : ${treasury}`);

if ((await publik.getBalance({ address: account.address })) === 0n) {
  console.error(
    `✗ Saldo deployer 0. Isi dulu ${keMainnet ? "BNB" : "tBNB (faucet BNB Chain, pilih BSC Testnet)"}.`,
  );
  process.exit(1);
}

const hash = await wallet.deployContract({
  abi: idm.abi,
  bytecode: `0x${idm.evm.bytecode.object}`,
  args: [treasury],
});
console.log(`  IDMReborn tx: ${hash} — menunggu receipt…`);
const receipt = await publik.waitForTransactionReceipt({ hash, timeout: 120_000 });
if (receipt.status !== "success" || !receipt.contractAddress) {
  console.error("✗ Deploy IDMReborn gagal:", receipt.status);
  process.exit(1);
}
console.log(`  ✓ IDMReborn: ${receipt.contractAddress}`);

// Bukti langsung suplai mendarat di treasury — bukan sekadar receipt sukses.
const saldoTreasury = await publik.readContract({
  address: receipt.contractAddress,
  abi: idm.abi,
  functionName: "balanceOf",
  args: [treasury],
});
console.log(`  saldo treasury: ${saldoTreasury / 10n ** 18n} IDM\n`);

const explorer = chain.blockExplorers?.default.url ?? "";
console.log(`explorer IDMReborn: ${explorer}/address/${receipt.contractAddress}\n`);
console.log("Salin ke .env.local & environment Vercel:");
console.log(`  NEXT_PUBLIC_IDM_REBORN_ADDRESS=${receipt.contractAddress}`);
console.log(
  "\nWallet lama selesai bertugas — jangan dipakai lagi untuk transaksi apa pun.",
);
