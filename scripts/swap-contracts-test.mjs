/**
 * Uji kontrak swap (§11) di anvil lokal — SwapInitiator + SwapClaim + IDMX +
 * IDMReborn. Kompilasi dari source, deploy ke anvil, jalankan seluruh jalur
 * penerimaan & penolakan. TANPA jaringan publik, TANPA gas testnet.
 *
 *   pnpm test:swap            # butuh `anvil` (foundry) di PATH
 *
 * Skrip menyalakan & mematikan anvil-nya sendiri di port 8547 (bukan 8545,
 * supaya tidak bentrok dengan anvil yang mungkin sedang dipakai manual).
 */
import { readFileSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  createWalletClient, createPublicClient, createTestClient, http,
  parseEther, keccak256, toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

try {
  execSync("anvil --version", { stdio: "ignore" });
} catch {
  console.error("✗ anvil (foundry) tidak ditemukan di PATH — uji dilewati.");
  console.error("  Pasang: https://getfoundry.sh");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const solc = require("solc");

const sources = {};
for (const f of ["IDMX.sol", "IDMReborn.sol", "SwapInitiator.sol", "SwapClaim.sol"])
  sources[f] = { content: readFileSync(`contracts/${f}`, "utf8") };
const out = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity", sources,
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
})));
const errs = (out.errors ?? []).filter((e) => e.severity === "error");
if (errs.length) { errs.forEach((e) => console.error(e.formattedMessage)); process.exit(1); }
const C = (f, n) => out.contracts[f][n];

const PORT = 8547;
const anvil = spawn("anvil", ["--silent", "--port", String(PORT)], { stdio: "ignore" });
process.on("exit", () => anvil.kill());
await new Promise((r) => setTimeout(r, 2000));

// Akun default anvil (kunci publik terkenal — hanya untuk chain lokal)
const deployer = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const user = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const signer = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");

const transport = http(`http://127.0.0.1:${PORT}`);
const chain = foundry;
const pub = createPublicClient({ chain, transport });
const test = createTestClient({ chain, transport, mode: "anvil" });
const wDeployer = createWalletClient({ account: deployer, chain, transport });
const wUser = createWalletClient({ account: user, chain, transport });

let passed = 0, failed = 0;
const ok = (cond, label) => {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ GAGAL: ${label}`); }
};
const reverts = async (fn, errName, label) => {
  try { await fn(); ok(false, `${label} (tidak revert!)`); }
  catch (e) {
    const s = String(e);
    ok(s.includes(errName), `${label}${s.includes(errName) ? "" : ` — revert lain: ${s.slice(0, 120)}`}`);
  }
};

async function deploy(w, art, args) {
  const hash = await w.deployContract({ abi: art.abi, bytecode: `0x${art.evm.bytecode.object}`, args });
  const r = await pub.waitForTransactionReceipt({ hash });
  return r.contractAddress;
}
const write = async (w, address, abi, functionName, args) => {
  const hash = await w.writeContract({ address, abi, functionName, args });
  return pub.waitForTransactionReceipt({ hash });
};
const read = (address, abi, functionName, args = []) =>
  pub.readContract({ address, abi, functionName, args });

const E = parseEther;

/* ── Deploy semua ── */
const idmxArt = C("IDMX.sol", "IDMX");
const idmArt = C("IDMReborn.sol", "IDMReborn");
const initArt = C("SwapInitiator.sol", "SwapInitiator");
const claimArt = C("SwapClaim.sol", "SwapClaim");

const idmx = await deploy(wDeployer, idmxArt, [deployer.address, E("50000000000")]);
const idm = await deploy(wDeployer, idmArt, [deployer.address]);
// parameter testnet §10.5: weekly 2000, ambang 100k, plafon 200k
const init = await deploy(wDeployer, initArt, [idmx, E("2000"), E("100000"), E("200000")]);
const claim = await deploy(wDeployer, claimArt, [idm, signer.address, E("2000")]);

await write(wDeployer, idmx, idmxArt.abi, "transfer", [user.address, E("100000")]);
await write(wDeployer, idm, idmArt.abi, "transfer", [claim, E("150000000")]);
await write(wUser, idmx, idmxArt.abi, "approve", [init, (2n ** 256n) - 1n]);

/* ── SwapInitiator ── */
console.log("SwapInitiator:");
await reverts(() => wUser.writeContract({ address: init, abi: initArt.abi, functionName: "swap", args: [E("499")] }), "BelowMinimum", "swap 499 revert BelowMinimum");

let r = await write(wUser, init, initArt.abi, "swap", [E("500")]);
ok(r.status === "success", "swap 500 sukses");
ok(await read(idmx, idmxArt.abi, "totalSupply") === E("50000000000") - E("500"), "totalSupply IDMX turun 500 (burn sejati)");
ok(await read(init, initArt.abi, "nonceCounter") === 1n, "nonceCounter = 1");
ok(await read(init, initArt.abi, "remainingWeeklyAllowance", [user.address]) === E("1500"), "sisa jatah minggu = 1500");

r = await write(wUser, init, initArt.abi, "swap", [E("1500")]);
ok(r.status === "success", "swap 1500 (tepat di cap 2000) sukses");
await reverts(() => wUser.writeContract({ address: init, abi: initArt.abi, functionName: "swap", args: [E("500")] }), "WeeklyCapExceeded", "swap melewati cap revert WeeklyCapExceeded");

await test.increaseTime({ seconds: 7 * 86400 });
await test.mine({ blocks: 1 });
ok(await read(init, initArt.abi, "remainingWeeklyAllowance", [user.address]) === E("2000"), "minggu baru → jatah reset 2000");

/* breaker: ambang diturunkan supaya murah dipicu; alert di ≥70% (1400/2000) */
await write(wDeployer, init, initArt.abi, "setGlobalThreshold", [E("2000")]);
r = await write(wUser, init, initArt.abi, "swap", [E("1500")]);
const sigAlert = keccak256(toHex("BreakerAlert(uint256,uint256,uint256)"));
const sigTrip = keccak256(toHex("BreakerTripped(uint256,uint256,uint256)"));
const sigReq = keccak256(toHex("SwapRequested(address,uint256,uint256,uint256)"));
let topics = r.logs.map((l) => l.topics[0]);
ok(topics.includes(sigAlert), "70%: BreakerAlert ter-emit");
ok(!topics.includes(sigTrip), "70%: BreakerTripped TIDAK ter-emit");
ok(await read(init, initArt.abi, "paused") === false, "70%: belum pause");

const supplyBefore = await read(idmx, idmxArt.abi, "totalSupply");
r = await write(wUser, init, initArt.abi, "swap", [E("500")]);
topics = r.logs.map((l) => l.topics[0]);
ok(r.status === "success" && topics.includes(sigTrip) && topics.includes(sigReq), "100%: tx pemicu LOLOS + BreakerTripped + SwapRequested");
ok(await read(idmx, idmxArt.abi, "totalSupply") === supplyBefore - E("500"), "100%: burn tetap terjadi");
ok(await read(init, initArt.abi, "paused") === true, "100%: paused tersimpan");
await reverts(() => wUser.writeContract({ address: init, abi: initArt.abi, functionName: "swap", args: [E("500")] }), "ContractPaused", "tx berikutnya revert ContractPaused");
await write(wDeployer, init, initArt.abi, "setPaused", [false]);
await test.increaseTime({ seconds: 7 * 86400 });
await test.mine({ blocks: 1 });
await write(wDeployer, init, initArt.abi, "setGlobalThreshold", [E("100000")]);
r = await write(wUser, init, initArt.abi, "swap", [E("500")]);
ok(r.status === "success", "setelah unpause manual bisa lanjut");

/* plafon kumulatif: total sejauh ini 4500; plafon 5000 → 500 lagi lolos, lebih revert */
await write(wDeployer, init, initArt.abi, "setLifetimeCap", [E("5000")]);
await test.increaseTime({ seconds: 7 * 86400 });
await test.mine({ blocks: 1 });
r = await write(wUser, init, initArt.abi, "swap", [E("500")]);
ok(r.status === "success", "tepat di plafon kumulatif lolos");
await test.increaseTime({ seconds: 7 * 86400 });
await test.mine({ blocks: 1 });
await reverts(() => wUser.writeContract({ address: init, abi: initArt.abi, functionName: "swap", args: [E("500")] }), "LifetimeCapExceeded", "melebihi plafon revert LifetimeCapExceeded");
ok(await read(init, initArt.abi, "totalBurned") === E("5000"), "totalBurned = 5000");

/* ── SwapClaim ── */
console.log("\nSwapClaim:");
const domain = { name: "AIDM SwapClaim", version: "1", chainId: 31337, verifyingContract: claim };
const types = { SwapVoucher: [
  { name: "user", type: "address" },
  { name: "idmxBurned", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "deadline", type: "uint64" },
] };
const now = (await pub.getBlock()).timestamp;
const sign = (v, who = signer) => createWalletClient({ account: who, chain, transport })
  .signTypedData({ domain, types, primaryType: "SwapVoucher", message: v });

const v1 = { user: user.address, idmxBurned: E("500"), nonce: 1n, deadline: now + 86400n };
const sig1 = await sign(v1);
const idmSupply0 = await read(idm, idmArt.abi, "totalSupply");
r = await write(wUser, claim, claimArt.abi, "claim", [v1, sig1]);
ok(r.status === "success", "voucher sah tertebus");
ok(await read(idm, idmArt.abi, "balanceOf", [user.address]) === E("9"), "net = 9 IDM (gross 10 − fee 1)");
ok(await read(idm, idmArt.abi, "totalSupply") === idmSupply0 - E("1"), "fee 1 IDM benar-benar dibakar (totalSupply turun)");
ok(await read(idm, idmArt.abi, "balanceOf", [claim]) === E("150000000") - E("10"), "kolam berkurang GROSS 10");

await reverts(() => wUser.writeContract({ address: claim, abi: claimArt.abi, functionName: "claim", args: [v1, sig1] }), "NonceAlreadyUsed", "nonce dipakai dua kali revert");

const v2 = { user: user.address, idmxBurned: E("500"), nonce: 2n, deadline: now + 86400n };
await reverts(async () => wUser.writeContract({ address: claim, abi: claimArt.abi, functionName: "claim", args: [v2, await sign(v2, user)] }), "InvalidSignature", "tanda tangan bukan swapSigner revert");
const vLate = { ...v2, nonce: 3n, deadline: now - 1n };
await reverts(async () => wUser.writeContract({ address: claim, abi: claimArt.abi, functionName: "claim", args: [vLate, await sign(vLate)] }), "VoucherExpired", "deadline lewat revert");
const vBig = { ...v2, nonce: 4n, idmxBurned: E("2001") };
await reverts(async () => wUser.writeContract({ address: claim, abi: claimArt.abi, functionName: "claim", args: [vBig, await sign(vBig)] }), "VoucherOutOfRange", "idmxBurned > maxIdmxPerVoucher revert");

await reverts(() => wDeployer.writeContract({ address: claim, abi: claimArt.abi, functionName: "setRate", args: [51n] }), "RatchetViolation", "setRate(51) revert RatchetViolation");
await reverts(() => wDeployer.writeContract({ address: claim, abi: claimArt.abi, functionName: "setRate", args: [0n] }), "RatchetViolation", "setRate(0) revert RatchetViolation");
r = await write(wDeployer, claim, claimArt.abi, "setRate", [25n]);
ok(r.status === "success", "setRate(25) sukses (turun)");

/* regresi B2: voucher 2000 IDMX tetap tertebus setelah rate 25, bayar lebih banyak */
const v5 = { user: user.address, idmxBurned: E("2000"), nonce: 5n, deadline: now + 86400n };
r = await write(wUser, claim, claimArt.abi, "claim", [v5, await sign(v5)]);
ok(r.status === "success", "regresi B2: voucher 2000 IDMX tertebus setelah setRate(25)");
ok(await read(idm, idmArt.abi, "balanceOf", [user.address]) === E("88"), "klaim setelah rate turun membayar LEBIH (net 79)");

await write(wDeployer, claim, claimArt.abi, "setPaused", [true]);
const v6 = { user: user.address, idmxBurned: E("500"), nonce: 6n, deadline: now + 86400n };
await reverts(async () => wUser.writeContract({ address: claim, abi: claimArt.abi, functionName: "claim", args: [v6, await sign(v6)] }), "ContractPaused", "claim saat pause revert");
await write(wDeployer, claim, claimArt.abi, "setPaused", [false]);

await reverts(() => wUser.writeContract({ address: claim, abi: claimArt.abi, functionName: "sweep", args: [user.address, E("1")] }), "NotOwner", "sweep oleh non-owner revert");
await write(wDeployer, claim, claimArt.abi, "transferOwnership", [user.address]);
ok(await read(claim, claimArt.abi, "owner") === deployer.address, "owner belum pindah sebelum accept");
await write(wUser, claim, claimArt.abi, "acceptOwnership", []);
ok(await read(claim, claimArt.abi, "owner") === user.address, "acceptOwnership memindahkan owner");

console.log(`\n${passed} lulus, ${failed} gagal`);
anvil.kill();
process.exit(failed ? 1 : 0);
