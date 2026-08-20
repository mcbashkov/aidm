/**
 * Sisi server klaim misi (§7.6) — penandatangan voucher + pengirim gasless.
 *
 * SATU-SATUNYA berkas yang menyentuh kunci penandatangan voucher. Jangan
 * pernah diimpor dari komponen klien.
 *
 * Kunci di sini setara "mesin cetak IDMX dalam batas cap": siapa pun yang
 * memegangnya bisa menandatangani voucher sah. Karena itu cap dan anti-replay
 * TIDAK bersandar padanya — keduanya ditegakkan di `MissionRewards.sol`,
 * sehingga kebocoran kunci pun tetap terbatas oleh aturan on-chain.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseAbi,
  parseEther,
  stringToBytes,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { opbnb, opbnbTestnet, DEFAULT_CHAIN } from "@/lib/chains/opbnb";
import { CAP_HARIAN_IDMX, CAP_BULANAN_IDMX } from "@/lib/missions";

export const MISSION_REWARDS_ABI = parseAbi([
  "struct Voucher { address user; uint256 missionId; uint256 amount; uint256 nonce; uint64 deadline; uint8 bucket; }",
  "function claim((address,uint256,uint256,uint256,uint64,uint8) v, bytes signature)",
  "function nonceUsed(address user, uint256 nonce) view returns (bool)",
  "function remainingAllowance(address user, uint8 bucket) view returns (uint256)",
]);

/** Chain kontrak reward — dipisah dari chain default app, sama seperti segel. */
export function rewardChain(): Chain {
  const pilihan = process.env.AIDM_REWARD_CHAIN ?? process.env.AIDM_SEAL_CHAIN;
  if (pilihan === "opbnb") return opbnb;
  if (pilihan === "opbnb-testnet") return opbnbTestnet;
  return DEFAULT_CHAIN;
}

export function missionRewardsAddress(): `0x${string}` | null {
  const a = process.env.NEXT_PUBLIC_MISSION_REWARDS_ADDRESS;
  return a && /^0x[0-9a-fA-F]{40}$/.test(a) ? (a as `0x${string}`) : null;
}

function signerKey(): `0x${string}` | null {
  const k = process.env.MISSION_VOUCHER_PRIVATE_KEY;
  if (!k) return null;
  const hex = k.startsWith("0x") ? k : `0x${k}`;
  return /^0x[0-9a-fA-F]{64}$/.test(hex) ? (hex as `0x${string}`) : null;
}

function relayerKey(): `0x${string}` | null {
  // Relayer boleh sama dengan relayer segel — perannya identik: membayar gas.
  const k =
    process.env.MISSION_RELAYER_PRIVATE_KEY ??
    process.env.SEAL_RELAYER_PRIVATE_KEY;
  if (!k) return null;
  const hex = k.startsWith("0x") ? k : `0x${k}`;
  return /^0x[0-9a-fA-F]{64}$/.test(hex) ? (hex as `0x${string}`) : null;
}

/** Klaim on-chain siap? Kontrak + penandatangan + relayer harus lengkap. */
export function isKlaimConfigured(): boolean {
  return (
    missionRewardsAddress() !== null &&
    signerKey() !== null &&
    relayerKey() !== null
  );
}

/** missionId on-chain = keccak256(kode misi) — kontrak tidak perlu tahu
 *  artinya, tapi event tetap bisa ditelusuri balik ke misi tertentu. */
export function missionIdOnChain(code: string): bigint {
  return BigInt(keccak256(stringToBytes(code)));
}

export interface VoucherData {
  user: `0x${string}`;
  missionId: bigint;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
  bucket: number;
}

/** Nonce acak 64-bit — ruangnya cukup besar sehingga tabrakan tak realistis,
 *  dan keunikannya tetap dijaga kontrak (nonce terpakai ditolak permanen). */
export function nonceBaru(): bigint {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let n = 0n;
  for (const b of buf) n = (n << 8n) | BigInt(b);
  return n;
}

/** Tanda tangani voucher (EIP-712) dengan kunci penandatangan. */
export async function tandatanganiVoucher(
  v: VoucherData,
): Promise<`0x${string}`> {
  const key = signerKey();
  const address = missionRewardsAddress();
  if (!key || !address) throw new Error("Klaim belum dikonfigurasi.");

  const account = privateKeyToAccount(key);
  return account.signTypedData({
    domain: {
      name: "AIDM MissionRewards",
      version: "1",
      chainId: rewardChain().id,
      verifyingContract: address,
    },
    types: {
      Voucher: [
        { name: "user", type: "address" },
        { name: "missionId", type: "uint256" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint64" },
        { name: "bucket", type: "uint8" },
      ],
    },
    primaryType: "Voucher",
    message: v,
  });
}

export interface HasilKlaim {
  txHash: `0x${string}`;
  confirmed: boolean;
}

/**
 * Tebus voucher lewat relayer treasury (gasless bagi user, §7.6). Melempar
 * error bila transaksi gagal DIKIRIM atau revert; timeout receipt bukan error
 * (klaim tetap tercatat pending dan dituntaskan saat dibaca ulang).
 */
export async function tebusVoucher(
  v: VoucherData,
  signature: `0x${string}`,
): Promise<HasilKlaim> {
  const address = missionRewardsAddress();
  const key = relayerKey();
  if (!address || !key) throw new Error("Klaim belum dikonfigurasi.");

  const chain = rewardChain();
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain, transport: http() });
  const publik = createPublicClient({ chain, transport: http() });

  const txHash = await wallet.writeContract({
    address,
    abi: MISSION_REWARDS_ABI,
    functionName: "claim",
    args: [
      [v.user, v.missionId, v.amount, v.nonce, v.deadline, v.bucket],
      signature,
    ],
  });

  try {
    // AC §7.6: klaim menghasilkan tx sukses ≤ 30 detik.
    const receipt = await publik.waitForTransactionReceipt({
      hash: txHash,
      timeout: 25_000,
    });
    if (receipt.status !== "success") {
      throw new Error(`Klaim revert (${txHash}).`);
    }
    return { txHash, confirmed: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("revert")) throw err;
    return { txHash, confirmed: false };
  }
}

/** URL explorer untuk tx klaim — memakai chain KONTRAK REWARD, yang bisa
 *  berbeda dari chain segel maupun chain default aplikasi. */
export function explorerKlaimUrl(txHash: string): string {
  const base = rewardChain().blockExplorers?.default.url ?? "";
  return base ? `${base}/tx/${txHash}` : "";
}

/** IDMX memakai 18 desimal — reward di PRD ditulis dalam satuan utuh. */
export function idmxKeWei(jumlah: number): bigint {
  return parseEther(String(jumlah));
}

/** Cap dalam wei, dipakai skrip deploy agar angka kontrak = angka PRD. */
export const CAP_HARIAN_WEI = idmxKeWei(CAP_HARIAN_IDMX);
export const CAP_BULANAN_WEI = idmxKeWei(CAP_BULANAN_IDMX);
