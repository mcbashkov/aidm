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
 *
 * SEJAK BATCH 8 (2026-10-22): pembacaan utama pindah ke `GET /api/swap/keadaan`
 * (server, cache 10 dtk, status per kaki) — `ambilKeadaanServer()` di bawah.
 * `bacaKeadaanSwap`/`bacaKeadaanKlaim` tetap ada dan dipakai dua pihak: server
 * (lib/swap/server-baca.ts, dengan klien upstream-nya sendiri) dan browser
 * sebagai CADANGAN bila rute itu gagal — lewat `publicClient()` yang kini
 * menembak proxy same-origin `/api/rpc/<chain>` lebih dulu (lib/swap/
 * chains-klien.ts), dan daftar RPC publik hanya sebagai cadangan terakhir.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  fallback,
  http,
  type Chain,
  type EIP1193Provider,
  type PublicClient,
} from "viem";

import {
  IDMX_ABI,
  SWAP_CLAIM_ABI,
  SWAP_INITIATOR_ABI,
} from "@/lib/swap/config";
import type { KeadaanSwapRespons } from "@/lib/swap/tipe";

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

/**
 * Batas waktu satu permintaan RPC dari browser. Pembacaan normal opBNB/BSC
 * dari jaringan seluler Indonesia ada di kisaran 100–600 ms; enam detik berarti
 * endpoint itu memang bermasalah dan giliran cadangan yang dicoba.
 */
const RPC_TIMEOUT_MS = 6_000;

/**
 * Klien baca-saja untuk browser.
 *
 * `fallback()` atas SELURUH daftar URL chain — sejak Batch 8 entri pertamanya
 * adalah proxy same-origin `/api/rpc/<chain>` (bila chain datang dari
 * `chainDariId`), lalu env + endpoint resmi — bukan `http()` polos atas entri
 * pertama. Sebabnya tercatat di lib/chains/rpc.ts:
 * dari HP satu endpoint publik bisa tidak terjangkau sama sekali — port
 * difilter operator, atau rate-limit per IP di balik CGNAT seluler — sementara
 * endpoint lain normal. Dengan satu URL, kegagalan itu tampil sebagai "Gagal
 * membaca data dari jaringan" dan tidak ada yang bisa dilakukan pengguna.
 *
 * `retryCount: 1` per endpoint, bukan bawaan viem (3): sekali buka sheet ada
 * delapan pembacaan, dan retry bawaan berarti sampai 32 permintaan ke endpoint
 * yang sedang menolak — bila sebabnya rate-limit, itu justru memperparah.
 * Lebih baik cepat pindah ke cadangan.
 */
export function publicClient(chain: Chain): PublicClient {
  const urls = chain.rpcUrls.default.http;
  return createPublicClient({
    chain,
    transport: fallback(
      urls.map((url) => http(url, { timeout: RPC_TIMEOUT_MS, retryCount: 1 })),
    ),
  });
}

/**
 * Semua angka sisi opBNB dalam satu putaran. Dibaca serentak karena UI tidak
 * bisa menampilkan apa pun yang jujur sampai kelimanya ada — menampilkan saldo
 * sebelum jatah mingguan datang hanya mengundang pengguna mengetik angka yang
 * sebentar lagi ditolak.
 */
export async function bacaKeadaanSwap(
  klien: PublicClient,
  idmx: `0x${string}`,
  initiator: `0x${string}`,
  pengguna: `0x${string}`,
): Promise<KeadaanSwap> {
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
  klien: PublicClient,
  claim: `0x${string}`,
): Promise<KeadaanKlaim> {
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

/** Hasil GET /api/swap/keadaan yang sudah diterjemahkan ke bigint; kaki yang
 *  gagal bernilai null dengan sebabnya di `galat*`. */
export interface KeadaanDariServer {
  swap: KeadaanSwap | null;
  klaim: KeadaanKlaim | null;
  galatSwap: string | null;
  galatKlaim: string | null;
}

/**
 * Pembacaan utama (Batch 8): server membaca kedua kaki lewat upstream-nya,
 * cache 10 detik. `null` berarti RUTENYA yang gagal (jaringan ke server, 5xx,
 * sesi habis) — pemanggil lalu jatuh ke pembacaan browser lewat proxy. Kaki
 * yang gagal di server BUKAN null: ia tetap pulang dengan status & sebabnya.
 */
export async function ambilKeadaanServer(): Promise<KeadaanDariServer | null> {
  try {
    const r = await fetch("/api/swap/keadaan", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    if (!r.ok) return null;
    const j = (await r.json()) as KeadaanSwapRespons;
    return {
      swap:
        j.opbnb.status === "ok"
          ? {
              saldoIdmx: BigInt(j.opbnb.saldoIdmx),
              minSwap: BigInt(j.opbnb.minSwap),
              sisaJatahMinggu: BigInt(j.opbnb.sisaJatahMinggu),
              izin: BigInt(j.opbnb.izin),
              jeda: j.opbnb.jeda,
            }
          : null,
      klaim:
        j.bsc.status === "ok"
          ? { kurs: BigInt(j.bsc.kurs), fee: BigInt(j.bsc.fee), jeda: j.bsc.jeda }
          : null,
      galatSwap: j.opbnb.status === "ok" ? null : j.opbnb.galat,
      galatKlaim: j.bsc.status === "ok" ? null : j.bsc.galat,
    };
  } catch {
    return null;
  }
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
