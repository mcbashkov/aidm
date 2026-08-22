/**
 * Sisi klien fitur Tukar (§7.7 / §9).
 *
 * Berbeda dari misi dan segel yang transaksinya dikirim relayer, `swap()`
 * WAJIB dikirim dompet pengguna sendiri (§5): itu yang membuat pengguna
 * terhitung sebagai alamat aktif yang sah, dan yang membuat burn benar-benar
 * atas kehendaknya. Karena itu berkas ini — satu-satunya di repo — membangun
 * wallet client dari provider Privy.
 *
 * Pembacaan keadaan kontrak juga dilakukan di sini, bukan di server: angkanya
 * harus segar pada detik pengguna menekan tombol. Sisa jatah mingguan yang
 * basi 30 detik berarti transaksi yang revert setelah pengguna membayar gas.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Chain,
  type EIP1193Provider,
} from "viem";

import {
  IDMX_ABI,
  SWAP_CLAIM_ABI,
  SWAP_INITIATOR_ABI,
} from "@/lib/swap/config";

/**
 * Bentuk dompet Privy yang kita butuhkan, ditulis struktural.
 *
 * Tidak memakai `ConnectedWallet` dari Privy dengan sengaja: Privy dan viem
 * sama-sama mendeklarasikan tipe bernama `EIP1193Provider`, dan tanda tangan
 * `on()` keduanya berbeda meski menggambarkan objek runtime yang PERSIS sama.
 * Mengetiknya struktural di sini membuat berkas ini tidak ikut pecah setiap
 * kali salah satu pustaka merapikan definisinya.
 */
export interface DompetPrivy {
  address: string;
  switchChain: (id: number) => Promise<void>;
  getEthereumProvider: () => Promise<unknown> | unknown;
}

/** Keadaan kontrak yang menentukan boleh-tidaknya menukar sekarang. */
export interface KeadaanSwap {
  saldoIdmx: bigint;
  minSwap: bigint;
  sisaJatahMinggu: bigint;
  izin: bigint;
  jeda: boolean;
}

/** Angka sisi BSC yang dipakai untuk pratinjau "kamu terima". */
export interface KeadaanKlaim {
  kurs: bigint;
  fee: bigint;
  jeda: boolean;
}

export function publicClient(chain: Chain) {
  return createPublicClient({ chain, transport: http() });
}

/**
 * Semua angka sisi opBNB dalam satu putaran. Dibaca serentak karena UI tidak
 * bisa menampilkan apa pun yang jujur sampai kelimanya ada — menampilkan saldo
 * sebelum jatah mingguan datang hanya mengundang pengguna mengetik angka yang
 * sebentar lagi ditolak.
 */
export async function bacaKeadaanSwap(
  chain: Chain,
  idmx: `0x${string}`,
  initiator: `0x${string}`,
  pengguna: `0x${string}`,
): Promise<KeadaanSwap> {
  const klien = publicClient(chain);
  const [saldoIdmx, minSwap, sisaJatahMinggu, izin, jeda] = await Promise.all([
    klien.readContract({
      address: idmx,
      abi: IDMX_ABI,
      functionName: "balanceOf",
      args: [pengguna],
    }),
    klien.readContract({
      address: initiator,
      abi: SWAP_INITIATOR_ABI,
      functionName: "MIN_SWAP",
    }),
    klien.readContract({
      address: initiator,
      abi: SWAP_INITIATOR_ABI,
      functionName: "remainingWeeklyAllowance",
      args: [pengguna],
    }),
    klien.readContract({
      address: idmx,
      abi: IDMX_ABI,
      functionName: "allowance",
      args: [pengguna, initiator],
    }),
    klien.readContract({
      address: initiator,
      abi: SWAP_INITIATOR_ABI,
      functionName: "paused",
    }),
  ]);
  return { saldoIdmx, minSwap, sisaJatahMinggu, izin, jeda };
}

/**
 * Kurs dibaca dari kontrak, TIDAK PERNAH ditulis mati di UI: `setRate` boleh
 * menurunkannya kapan saja (ratchet satu arah, §6). Angka 50 yang tertulis di
 * mockup adalah nilai awal, bukan konstanta.
 */
export async function bacaKeadaanKlaim(
  chain: Chain,
  claim: `0x${string}`,
): Promise<KeadaanKlaim> {
  const klien = publicClient(chain);
  const [kurs, fee, jeda] = await Promise.all([
    klien.readContract({
      address: claim,
      abi: SWAP_CLAIM_ABI,
      functionName: "rateIdmxPerIdm",
    }),
    klien.readContract({
      address: claim,
      abi: SWAP_CLAIM_ABI,
      functionName: "FEE_IDM",
    }),
    klien.readContract({
      address: claim,
      abi: SWAP_CLAIM_ABI,
      functionName: "paused",
    }),
  ]);
  return { kurs, fee, jeda };
}

/**
 * Wallet client di atas provider Privy, sekaligus memindahkan dompet ke chain
 * yang benar.
 *
 * `switchChain` dipanggil SEBELUM transaksi apa pun karena alur Tukar
 * melintasi dua jaringan dalam satu duduk: burn di opBNB, klaim di BSC.
 * Mengirim transaksi ke chain yang salah bukan sekadar gagal — ia bisa
 * mengenai kontrak berbeda yang kebetulan beralamat sama (IDMX dan SwapClaim
 * di repo ini memang beralamat identik di dua chain).
 */
export async function walletUntukChain(wallet: DompetPrivy, chain: Chain) {
  await wallet.switchChain(chain.id);
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({
    account: wallet.address as `0x${string}`,
    chain,
    // Satu-satunya cast di alur ini, dan letaknya memang di perbatasan dua
    // pustaka: yang dipakai `custom()` hanyalah `request`, dan bentuk itu
    // identik di kedua definisi. Yang berbeda cuma tanda tangan `on()`, yang
    // tidak pernah kita sentuh.
    transport: custom(provider as EIP1193Provider),
  });
}

/** Izin tak terbatas dihindari: yang disetujui persis sebesar yang akan
 *  dibakar, supaya kebocoran kunci tidak membawa serta seluruh saldo. */
export async function setujuiIdmx(
  wallet: DompetPrivy,
  chain: Chain,
  idmx: `0x${string}`,
  initiator: `0x${string}`,
  jumlah: bigint,
): Promise<`0x${string}`> {
  const w = await walletUntukChain(wallet, chain);
  return w.writeContract({
    address: idmx,
    abi: IDMX_ABI,
    functionName: "approve",
    args: [initiator, jumlah],
    chain,
    account: w.account!,
  });
}

export async function kirimSwap(
  wallet: DompetPrivy,
  chain: Chain,
  initiator: `0x${string}`,
  jumlah: bigint,
): Promise<`0x${string}`> {
  const w = await walletUntukChain(wallet, chain);
  return w.writeContract({
    address: initiator,
    abi: SWAP_INITIATOR_ABI,
    functionName: "swap",
    args: [jumlah],
    chain,
    account: w.account!,
  });
}

/**
 * Menebus voucher di BSC. Gas ditanggung pengguna — itu garis monetisasi yang
 * disengaja (§6), jadi jangan pernah menambahkan jalur relayer-submit di sini.
 */
export async function klaimVoucher(
  wallet: DompetPrivy,
  chain: Chain,
  claim: `0x${string}`,
  voucher: {
    user: `0x${string}`;
    idmxBurned: string;
    nonce: string;
    deadline: string;
  },
  signature: `0x${string}`,
): Promise<`0x${string}`> {
  const w = await walletUntukChain(wallet, chain);
  return w.writeContract({
    address: claim,
    abi: SWAP_CLAIM_ABI,
    functionName: "claim",
    args: [
      // Tuple posisional, bukan objek: urutannya harus persis sama dengan
      // struct di SwapClaim.sol, dan `idmxBurned` wajib dipakai apa adanya
      // dalam wei — membulatkannya lewat desimal akan membuat tanda tangan
      // EIP-712 tidak cocok dan klaim ditolak `InvalidSignature`.
      [
        voucher.user,
        BigInt(voucher.idmxBurned),
        BigInt(voucher.nonce),
        BigInt(voucher.deadline),
      ],
      signature,
    ],
    chain,
    account: w.account!,
  });
}
