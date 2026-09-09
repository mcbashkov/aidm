/**
 * Membaca angka on-chain sebelum build, lalu menyimpannya ke
 * `data/onchain.cache.json` yang ikut di-commit.
 *
 * ATURAN KEGAGALAN — ini bagian terpentingnya. RPC yang gagal atau lambat
 * TIDAK menggagalkan build. Skrip memakai nilai terakhir yang berhasil dan
 * menandainya; setiap nilai membawa `fetchedAt`, dan komponen yang
 * merendernya selalu menampilkan tanggal itu. Halaman yang gagal terbit
 * karena satu RPC lambat adalah kegagalan yang lebih buruk daripada angka
 * berumur tiga hari — yang kedua jujur tentang umurnya, yang pertama
 * menghilangkan seluruh dokumen.
 *
 * Cache di-commit supaya build di Vercel tidak bergantung pada ketersediaan
 * RPC sama sekali.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createPublicClient, http, formatUnits, parseAbi } from "viem";

const BATAS_MS = 10_000;
const CACHE = "data/onchain.cache.json";

const env = (k: string, bawaan = "") => (process.env[k] ?? bawaan).trim();
const RPC_BSC = env("RPC_BSC", "https://bsc-testnet-rpc.publicnode.com");
const RPC_OPBNB = env("RPC_OPBNB", "https://opbnb-testnet-rpc.bnbchain.org");
/**
 * Token v1 hidup di BSC MAINNET — ia warisan, bukan bagian dari deployment
 * testnet kita. Membacanya lewat RPC testnet mengembalikan angka dari kontrak
 * yang kebetulan ada di alamat sama, atau tidak sama sekali. Dua jaringan
 * berbeda menuntut dua klien berbeda; menyatukannya adalah cara paling halus
 * untuk menerbitkan angka yang salah dengan penuh keyakinan.
 */
const RPC_BSC_MAINNET = env("RPC_BSC_MAINNET", "https://bsc-rpc.publicnode.com");
/** Blok pembuatan ReportAttestation. Memindai dari blok 0 pada opBNB selalu
 *  timeout; rentangnya dipersempit ke sejak kontraknya ada. */
const ATTESTATION_FROM_BLOCK = BigInt(env("ATTESTATION_FROM_BLOCK", "191748408"));

const ADDR = {
  idmReborn: env("IDM_REBORN_ADDR"),
  idmx: env("IDMX_ADDR"),
  swapClaim: env("SWAPCLAIM_ADDR"),
  missionRewards: env("MISSIONREWARDS_ADDR"),
  attestation: env("ATTESTATION_ADDR"),
  tokenV1: env("TOKEN_V1_ADDR", "0x14B13E06f75E1F0Fd51ca2E699589Ef398E10F4C"),
  dead: "0x000000000000000000000000000000000000dEaD",
} as const;

/** 18 desimal untuk token kita sendiri. Token pihak lain TIDAK diasumsikan —
 *  desimalnya dibaca dari kontraknya. */
const formatUnits18 = (v: bigint) => formatUnits(v, 18);

const ERC20 = parseAbi([
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

const bsc = createPublicClient({ transport: http(RPC_BSC, { timeout: BATAS_MS }) });
const bscMainnet = createPublicClient({ transport: http(RPC_BSC_MAINNET, { timeout: BATAS_MS }) });
const opbnb = createPublicClient({ transport: http(RPC_OPBNB, { timeout: BATAS_MS }) });

type Nilai = { value: string | number | null; fetchedAt: string | null; stale?: boolean };
type Cache = Record<string, Nilai>;

const lama: Cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
const baru: Cache = {};
const sekarang = new Date().toISOString();
let gagal = 0;

async function ambil(kunci: string, fn: () => Promise<string | number>) {
  if (!ADDR.idmReborn && kunci !== "_") { /* alamat dicek per-metrik di bawah */ }
  try {
    const v = await fn();
    baru[kunci] = { value: v, fetchedAt: sekarang };
    console.log(`  ✓ ${kunci.padEnd(20)} ${v}`);
  } catch (e) {
    gagal++;
    const c = lama[kunci];
    baru[kunci] = c
      ? { ...c, stale: true }
      : { value: null, fetchedAt: null, stale: true };
    const umur = c?.fetchedAt ? ` (cache ${c.fetchedAt.slice(0, 10)})` : " (tidak ada cache)";
    console.warn(`  ⚠ ${kunci.padEnd(20)} gagal${umur} — ${String(e).slice(0, 60)}`);
  }
}

const perlu = (a: string, nama: string) => {
  if (!a) throw new Error(`alamat ${nama} belum diisi di env`);
  return a as `0x${string}`;
};

async function main() {
console.log("→ membaca on-chain (build tidak digagalkan bila RPC buntu)");

  await ambil("idmRebornSupply", async () =>
  formatUnits18(await bsc.readContract({
    address: perlu(ADDR.idmReborn, "IDM_REBORN_ADDR"), abi: ERC20, functionName: "totalSupply" })));

  await ambil("idmxSupply", async () =>
  formatUnits18(await opbnb.readContract({
    address: perlu(ADDR.idmx, "IDMX_ADDR"), abi: ERC20, functionName: "totalSupply" })));

  await ambil("deadBalance", async () => {
    const t = perlu(ADDR.tokenV1, "TOKEN_V1_ADDR");
    // Desimal DIBACA, tidak diasumsikan. Token v1 memakai 9 desimal, bukan 18;
    // memakai 18 menghasilkan angka yang meleset sembilan orde besaran — dan
    // angka sebesar itu terlihat cukup masuk akal untuk sempat terbit.
    // Jaringannya juga BSC mainnet, bukan testnet: token v1 adalah warisan,
    // bukan bagian dari deployment kita.
    const [saldo, dec] = await Promise.all([
      bscMainnet.readContract({ address: t, abi: ERC20, functionName: "balanceOf", args: [ADDR.dead] }),
      bscMainnet.readContract({ address: t, abi: ERC20, functionName: "decimals" }),
    ]);
    return formatUnits(saldo, dec);
  });

  await ambil("swapClaimPool", async () =>
  formatUnits18(await bsc.readContract({
    address: perlu(ADDR.idmReborn, "IDM_REBORN_ADDR"), abi: ERC20,
    functionName: "balanceOf", args: [perlu(ADDR.swapClaim, "SWAPCLAIM_ADDR")] })));

  await ambil("missionRewardsPool", async () =>
  formatUnits18(await opbnb.readContract({
    address: perlu(ADDR.idmx, "IDMX_ADDR"), abi: ERC20,
    functionName: "balanceOf", args: [perlu(ADDR.missionRewards, "MISSIONREWARDS_ADDR")] })));

  await ambil("sealedReports", async () => {
  const logs = await opbnb.getLogs({
    address: perlu(ADDR.attestation, "ATTESTATION_ADDR"), fromBlock: 0n, toBlock: "latest" });
  return logs.length;
});

writeFileSync(CACHE, JSON.stringify(baru, null, 2) + "\n");
console.log(gagal === 0
  ? "✓ seluruh nilai segar"
  : `⚠ ${gagal} nilai memakai cache — build DILANJUTKAN, tanggalnya dirender di halaman`);
}

// Kegagalan tak terduga pun tidak boleh menjatuhkan build — itu seluruh maksud
// berkas ini. Cache yang ada tetap dipakai apa adanya.
main().catch((e) => {
  console.warn("⚠ fetch-onchain berhenti tak terduga, cache lama dipertahankan:", String(e).slice(0, 120));
});
