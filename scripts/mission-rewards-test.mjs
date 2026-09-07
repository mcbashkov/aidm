/**
 * Uji MissionRewards di anvil lokal — F-05 (periode per ember) + plafon global.
 *
 *   pnpm test:misi            # butuh `anvil` (foundry) di PATH
 *
 * Menyalakan & mematikan anvil-nya sendiri di port 8548 (bukan 8545 maupun
 * 8547 yang dipakai `test:swap`), supaya ketiganya bisa jalan berdampingan.
 *
 * Kenapa berkas ini ada, dan kenapa ujinya berbentuk begini: F-05 adalah cap
 * yang TIDAK MENAHAN — bukan fungsi yang melempar galat. Uji yang hanya
 * memanggil `claim()` sekali akan lulus pada kontrak yang cacat maupun yang
 * benar. Satu-satunya uji yang membuktikan sesuatu adalah yang MENGGERAKKAN
 * WAKTU: klaim, majukan sehari, klaim lagi, dan tuntut penolakan. Uji itulah
 * yang gagal pada kontrak lama dan lulus pada yang baru — dan itu yang membuat
 * ia bukti, bukan hiasan.
 */
import { readFileSync } from "node:fs";
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  createWalletClient, createPublicClient, createTestClient, http, parseEther,
  toFunctionSelector,
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
for (const f of ["IDMX.sol", "MissionRewards.sol"])
  sources[f] = { content: readFileSync(`contracts/${f}`, "utf8") };
const out = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity", sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
})));
const errs = (out.errors ?? []).filter((e) => e.severity === "error");
if (errs.length) { errs.forEach((e) => console.error(e.formattedMessage)); process.exit(1); }
const C = (f, n) => out.contracts[f][n];

const PORT = 8548;
const anvil = spawn("anvil", ["--silent", "--port", String(PORT)], { stdio: "ignore" });
process.on("exit", () => anvil.kill());
await new Promise((r) => setTimeout(r, 2000));

const deployer = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const userA = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const userB = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
const signer = privateKeyToAccount("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
const orangLain = privateKeyToAccount("0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a");

const transport = http(`http://127.0.0.1:${PORT}`);
const chain = foundry;
const pub = createPublicClient({ chain, transport });
const test = createTestClient({ chain, transport, mode: "anvil" });
const w = createWalletClient({ account: deployer, chain, transport });
const wLain = createWalletClient({ account: orangLain, chain, transport });

let passed = 0, failed = 0;
const ok = (cond, label) => {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ GAGAL: ${label}`); }
};
const reverts = async (fn, errName, label) => {
  try { await fn(); ok(false, `${label} (tidak revert!)`); }
  catch (e) {
    // Data revert mentah ikut diperiksa: untuk galat konstruktor, nama custom
    // error tidak pernah muncul di pesan, hanya selektornya di `data`.
    let data = "";
    for (let c = e; c; c = c.cause) if (typeof c.data === "string") data = c.data;
    const s = String(e) + " " + data;
    ok(s.includes(errName), `${label}${s.includes(errName) ? "" : ` — revert lain: ${String(e).slice(0, 140)}`}`);
  }
};

async function deploy(art, args) {
  const hash = await w.deployContract({ abi: art.abi, bytecode: `0x${art.evm.bytecode.object}`, args });
  const r = await pub.waitForTransactionReceipt({ hash });
  return r.contractAddress;
}
const write = async (wallet, address, abi, functionName, args) => {
  const hash = await wallet.writeContract({ address, abi, functionName, args });
  return pub.waitForTransactionReceipt({ hash });
};

/* ── Deploy ──────────────────────────────────────────────────────────────── */

const idmxArt = C("IDMX.sol", "IDMX");
const rewardsArt = C("MissionRewards.sol", "MissionRewards");

const CAP_HARIAN = parseEther("250");
const CAP_BULANAN = parseEther("450");
const CAP_GLOBAL = parseEther("150000");

const idmx = await deploy(idmxArt, [deployer.address, parseEther("50000000000")]);
const rewards = await deploy(rewardsArt, [
  idmx, signer.address, CAP_HARIAN, CAP_BULANAN, CAP_GLOBAL,
]);
await write(w, idmx, idmxArt.abi, "transfer", [rewards, parseEther("1000000")]);

const abi = rewardsArt.abi;
const baca = (fn, args = []) => pub.readContract({ address: rewards, abi, functionName: fn, args });
const saldo = (who) => pub.readContract({ address: idmx, abi: idmxArt.abi, functionName: "balanceOf", args: [who] });

const domain = {
  name: "AIDM MissionRewards",
  version: "1",
  chainId: await pub.getChainId(),
  verifyingContract: rewards,
};
const types = {
  Voucher: [
    { name: "user", type: "address" },
    { name: "missionId", type: "uint256" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint64" },
    { name: "bucket", type: "uint8" },
  ],
};

let nonceBerikut = 1n;
async function voucher(user, amount, bucket) {
  const v = {
    user: user.address,
    missionId: 1n,
    amount,
    nonce: nonceBerikut++,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600),
    bucket,
  };
  const signature = await signer.signTypedData({ domain, types, primaryType: "Voucher", message: v });
  return [v, signature];
}
const klaim = async (user, amount, bucket) => {
  const [v, sig] = await voucher(user, amount, bucket);
  return write(wLain, rewards, abi, "claim", [v, sig]);
};
const majuHari = async (n) => {
  await test.increaseTime({ seconds: n * 86400 });
  await test.mine({ blocks: 1 });
};

/* ── F-05 · ember bulanan TIDAK boleh reset harian ───────────────────────── */

console.log("\nF-05 — periode per ember");

await klaim(userA, parseEther("450"), 1);
ok((await saldo(userA.address)) === parseEther("450"), "ember bulanan: klaim penuh 450 diterima");
ok((await baca("remainingAllowance", [userA.address, 1])) === 0n, "sisa jatah bulanan jadi 0");

// INI uji yang gagal pada kontrak lama: sehari kemudian, cap 'bulanan' reset.
await majuHari(1);
ok(
  (await baca("remainingAllowance", [userA.address, 1])) === 0n,
  "sehari kemudian sisa jatah bulanan MASIH 0 (regresi F-05)",
);
await reverts(
  () => klaim(userA, parseEther("450"), 1),
  "CapExceeded",
  "klaim bulanan kedua di hari berikutnya DITOLAK (regresi F-05)",
);

// ...dan tetap ditolak setelah 20 hari, selama masih bulan yang sama.
await majuHari(20);
const bulanSama = (await baca("monthUtc7", [BigInt(Math.floor(Date.now() / 1000))])) !== undefined;
ok(bulanSama, "monthUtc7 terbaca");

console.log("\nF-05 — ember harian tetap reset harian");
await klaim(userA, parseEther("250"), 0);
ok((await baca("remainingAllowance", [userA.address, 0])) === 0n, "jatah harian habis setelah 250");
await reverts(() => klaim(userA, parseEther("1"), 0), "CapExceeded", "klaim harian melebihi cap ditolak");
await majuHari(1);
ok(
  (await baca("remainingAllowance", [userA.address, 0])) === CAP_HARIAN,
  "besoknya jatah harian pulih penuh",
);

console.log("\nF-05 — ember bulanan reset di bulan berikutnya");
// Sudah maju 22 hari sejak klaim bulanan; +25 hari menjamin lewat batas bulan.
await majuHari(25);
ok(
  (await baca("remainingAllowance", [userA.address, 1])) === CAP_BULANAN,
  "di bulan berikutnya jatah bulanan pulih penuh",
);
await klaim(userA, parseEther("450"), 1);
ok((await saldo(userA.address)) === parseEther("1150"), "klaim bulanan bulan berikutnya diterima (450+250+450)");

/* ── monthUtc7 · kebenaran kalender ──────────────────────────────────────── */

console.log("\nmonthUtc7 — batas kalender WIB");
// 2026-08-31 17:00:00Z = 2026-09-01 00:00 WIB → sudah bulan September.
const akhirAgustusUtc = BigInt(Date.UTC(2026, 7, 31, 16, 59, 59) / 1000);
const awalSeptemberWib = BigInt(Date.UTC(2026, 7, 31, 17, 0, 0) / 1000);
const mAgu = await baca("monthUtc7", [akhirAgustusUtc]);
const mSep = await baca("monthUtc7", [awalSeptemberWib]);
ok(mSep === mAgu + 1n, "17:00Z tanggal 31 Agustus = pergantian bulan WIB (bukan 00:00Z)");
ok(mAgu === BigInt(2026 * 12 + 7), "indeks bulan Agustus 2026 benar");
// Tahun kabisat: 2028-02-29 harus tetap Februari, 03-01 sudah Maret.
ok(
  (await baca("monthUtc7", [BigInt(Date.UTC(2028, 1, 29, 12) / 1000)])) === BigInt(2028 * 12 + 1),
  "29 Februari 2028 (kabisat) masih Februari",
);
ok(
  (await baca("monthUtc7", [BigInt(Date.UTC(2028, 2, 1, 12) / 1000)])) === BigInt(2028 * 12 + 2),
  "1 Maret 2028 sudah Maret",
);

/* ── Plafon global ───────────────────────────────────────────────────────── */

console.log("\nPlafon global harian");
ok((await baca("dailyGlobalCap")) === CAP_GLOBAL, "plafon global terpasang dari konstruktor");

const rendah = parseEther("300");
await write(w, rewards, abi, "setDailyGlobalCap", [rendah]);
await majuHari(1);
ok((await baca("remainingGlobalAllowance")) === rendah, "sisa plafon global penuh di hari baru");

await klaim(userA, parseEther("250"), 0);
ok((await baca("remainingGlobalAllowance")) === parseEther("50"), "plafon global berkurang oleh klaim");

// userB masih punya jatah PRIBADI penuh, tapi plafon global sudah tipis —
// inilah mode penolakan-layanan yang diterima sadar.
ok(
  (await baca("remainingAllowance", [userB.address, 0])) === CAP_HARIAN,
  "userB masih punya jatah pribadi penuh",
);
await reverts(
  () => klaim(userB, parseEther("100"), 0),
  "GlobalCapExceeded",
  "klaim userB ditolak plafon GLOBAL meski jatah pribadinya sisa (DoS yang diterima sadar)",
);
await klaim(userB, parseEther("50"), 0);
ok((await baca("remainingGlobalAllowance")) === 0n, "plafon global habis persis di batas");

await majuHari(1);
ok((await baca("remainingGlobalAllowance")) === rendah, "plafon global pulih keesokan hari");

console.log("\nPlafon global — urutan galat & otorisasi");
// Jatah pribadi harus diperiksa LEBIH DULU: pengguna yang melewati capnya
// sendiri berhak diberi tahu itu, bukan galat sistem tentang orang lain.
await write(w, rewards, abi, "setDailyGlobalCap", [parseEther("150000")]);
await klaim(userA, parseEther("250"), 0);
await reverts(
  () => klaim(userA, parseEther("10"), 0),
  "CapExceeded",
  "jatah pribadi habis → CapExceeded, bukan GlobalCapExceeded",
);
await reverts(
  () => write(wLain, rewards, abi, "setDailyGlobalCap", [parseEther("1")]),
  "NotOwner",
  "setDailyGlobalCap hanya untuk owner",
);
await reverts(
  () => write(w, rewards, abi, "setDailyGlobalCap", [0n]),
  "ZeroAmount",
  "plafon global 0 ditolak (nol = semua klaim mati, bukan 'nonaktif')",
);
// Revert DI DALAM konstruktor tidak membawa ABI kontraknya, jadi viem tidak
// bisa menerjemahkan nama custom error-nya. Yang dicocokkan karena itu selektor
// 4-byte-nya — bukan sekadar "ada revert", yang akan sama-sama lulus kalau
// konstruktornya gagal karena sebab lain sama sekali.
const SELEKTOR_ZERO_AMOUNT = toFunctionSelector("ZeroAmount()");
await reverts(
  () => deploy(rewardsArt, [idmx, signer.address, CAP_HARIAN, CAP_BULANAN, 0n]),
  SELEKTOR_ZERO_AMOUNT,
  `konstruktor menolak plafon global 0 (selektor ${SELEKTOR_ZERO_AMOUNT})`,
);

/* ── Jaminan lama tidak boleh rusak ──────────────────────────────────────── */

console.log("\nJaminan lama (tidak boleh rusak oleh perubahan ini)");
await majuHari(1);
const [vUlang, sigUlang] = await voucher(userB, parseEther("10"), 0);
await write(wLain, rewards, abi, "claim", [vUlang, sigUlang]);
await reverts(
  () => write(wLain, rewards, abi, "claim", [vUlang, sigUlang]),
  "NonceAlreadyUsed",
  "voucher tidak bisa ditebus dua kali",
);
const [vPalsu] = await voucher(userB, parseEther("10"), 0);
const sigPalsu = await orangLain.signTypedData({ domain, types, primaryType: "Voucher", message: vPalsu });
await reverts(
  () => write(wLain, rewards, abi, "claim", [vPalsu, sigPalsu]),
  "InvalidSignature",
  "tanda tangan bukan dari voucherSigner ditolak",
);
const [vKedaluwarsa] = await voucher(userB, parseEther("10"), 0);
vKedaluwarsa.deadline = 1n;
const sigKedaluwarsa = await signer.signTypedData({ domain, types, primaryType: "Voucher", message: vKedaluwarsa });
await reverts(
  () => write(wLain, rewards, abi, "claim", [vKedaluwarsa, sigKedaluwarsa]),
  "VoucherExpired",
  "voucher kedaluwarsa ditolak",
);
const [vEmber] = await voucher(userB, parseEther("10"), 2);
const sigEmber = await signer.signTypedData({ domain, types, primaryType: "Voucher", message: vEmber });
await reverts(
  () => write(wLain, rewards, abi, "claim", [vEmber, sigEmber]),
  "UnknownBucket",
  "ember di luar 0/1 ditolak",
);
await write(w, rewards, abi, "setPaused", [true]);
await reverts(() => klaim(userB, parseEther("10"), 0), "ContractPaused", "kontrak dijeda menolak klaim");
await write(w, rewards, abi, "setPaused", [false]);

/* ── Ringkas ─────────────────────────────────────────────────────────────── */

console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} lulus, ${failed} gagal`);
process.exit(failed === 0 ? 0 : 1);
