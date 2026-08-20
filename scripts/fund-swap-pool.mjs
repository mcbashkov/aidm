/**
 * Transfer kolam swap: 150 juta IDM dari treasury → SwapClaim
 * (§10 langkah 3 — BSC C).
 *
 *   pnpm fund:swap-pool                # BSC testnet 97
 *   pnpm fund:swap-pool --mainnet      # ← JANGAN: mainnet dari UI multisig,
 *                                      #   kunci treasury tidak boleh ada di env
 *
 * Butuh di .env.local:
 *   IDM_TREASURY_PRIVATE_KEY        — HANYA untuk 1 tx ini. Hapus setelah pakai.
 *   NEXT_PUBLIC_IDM_REBORN_ADDRESS  — hasil pnpm deploy:idm-bsc
 *   NEXT_PUBLIC_SWAP_CLAIM_ADDRESS  — hasil pnpm deploy:swap-bsc
 *
 * Skrip menolak jalan bila tujuan bukan kontrak, dan membaca ulang saldo
 * SwapClaim setelah transfer sebagai bukti dana mendarat.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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
if (keMainnet) {
  // Keputusan §10: di mainnet treasury = multisig dan transfer ini dilakukan
  // dari UI multisig-nya. Kunci treasury mainnet tidak boleh menyentuh env.
  console.error("✗ Mainnet: lakukan transfer ini dari UI multisig treasury,");
  console.error("  bukan dari skrip dengan private key di env. Berhenti.");
  process.exit(1);
}

// §0: kolam swap = 150 juta IDM, dibuka penuh.
const POOL_IDM = 150_000_000n * 10n ** 18n;

const { createWalletClient, createPublicClient, http, isAddress, getAddress, parseAbi } =
  await import("viem");
const { privateKeyToAccount } = await import("viem/accounts");
const { bscTestnet } = await import("viem/chains");

const chain = bscTestnet;
const abi = parseAbi([
  "function transfer(address to, uint256 value) returns (bool)",
  "function balanceOf(address who) view returns (uint256)",
]);

const pk = env.IDM_TREASURY_PRIVATE_KEY;
if (!pk) {
  console.error("✗ IDM_TREASURY_PRIVATE_KEY belum diisi di .env.local");
  process.exit(1);
}
const alamat = {};
for (const nama of ["NEXT_PUBLIC_IDM_REBORN_ADDRESS", "NEXT_PUBLIC_SWAP_CLAIM_ADDRESS"]) {
  const mentah = env[nama];
  if (!mentah || !isAddress(mentah)) {
    console.error(`✗ ${nama} belum diisi / bukan alamat sah.`);
    process.exit(1);
  }
  alamat[nama] = getAddress(mentah);
}
const idm = alamat.NEXT_PUBLIC_IDM_REBORN_ADDRESS;
const swapClaim = alamat.NEXT_PUBLIC_SWAP_CLAIM_ADDRESS;

const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const wallet = createWalletClient({ account, chain, transport: http() });
const publik = createPublicClient({ chain, transport: http() });

// Salah tempel alamat = 150 juta IDM nyangkut permanen (IDMReborn tak punya
// fungsi penyelamat apa pun). "Berupa kontrak" saja belum cukup — salah tempel
// alamat IDMReborn sendiri, atau SwapClaim lama dari deploy uji sebelumnya,
// juga lolos cek kode. Bukti yang benar: tujuan adalah SwapClaim yang `idm`
// immutable-nya menunjuk token yang sedang ditransfer — hanya kolam itu yang
// punya sweep() sebagai jalan pulang untuk token ini.
if ((await publik.getCode({ address: swapClaim })) === undefined) {
  console.error(`✗ ${swapClaim} bukan kontrak di ${chain.name} — cek alamat SwapClaim.`);
  process.exit(1);
}
let idmTerikat;
try {
  idmTerikat = await publik.readContract({
    address: swapClaim,
    abi: parseAbi(["function idm() view returns (address)"]),
    functionName: "idm",
  });
} catch {
  console.error(`✗ ${swapClaim} tidak punya fungsi idm() — bukan kontrak SwapClaim.`);
  process.exit(1);
}
if (getAddress(idmTerikat) !== idm) {
  console.error(`✗ SwapClaim di ${swapClaim} terikat ke token ${idmTerikat},`);
  console.error(`  bukan ${idm} — alamat SwapClaim usang / salah tempel. Berhenti.`);
  process.exit(1);
}

const saldoTreasury = await publik.readContract({
  address: idm, abi, functionName: "balanceOf", args: [account.address],
});
console.log(`→ ${chain.name} (chainId ${chain.id})`);
console.log(`  treasury          : ${account.address}`);
console.log(`  saldo treasury    : ${saldoTreasury / 10n ** 18n} IDM`);
console.log(`  SwapClaim         : ${swapClaim}`);
console.log(`  akan ditransfer   : ${POOL_IDM / 10n ** 18n} IDM`);

if (saldoTreasury < POOL_IDM) {
  console.error("✗ Saldo treasury kurang dari 150 juta IDM — treasury salah alamat?");
  process.exit(1);
}
if ((await publik.getBalance({ address: account.address })) === 0n) {
  console.error("✗ Saldo gas treasury 0. Isi tBNB (faucet BNB Chain, pilih BSC Testnet).");
  process.exit(1);
}

const hash = await wallet.writeContract({
  address: idm, abi, functionName: "transfer", args: [swapClaim, POOL_IDM],
});
console.log(`  transfer tx: ${hash} — menunggu receipt…`);
const receipt = await publik.waitForTransactionReceipt({ hash, timeout: 120_000 });
if (receipt.status !== "success") {
  console.error("✗ Transfer gagal:", receipt.status);
  process.exit(1);
}

const saldoKolam = await publik.readContract({
  address: idm, abi, functionName: "balanceOf", args: [swapClaim],
});
console.log(`  ✓ saldo SwapClaim sekarang: ${saldoKolam / 10n ** 18n} IDM\n`);
console.log("Kolam terisi. IDM_TREASURY_PRIVATE_KEY boleh DIHAPUS dari .env.local sekarang.");
