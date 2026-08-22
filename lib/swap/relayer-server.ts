/**
 * Relayer swap — jembatan opBNB → BSC (§7.7 / §10 langkah 6).
 *
 * SATU-SATUNYA berkas yang menyentuh kunci penandatangan voucher swap. Jangan
 * pernah diimpor dari komponen klien.
 *
 * Tugasnya satu kalimat: **setiap `SwapRequested` di opBNB harus berakhir
 * sebagai voucher bertanda tangan yang bisa ditebus di BSC.** IDMX sudah
 * terbakar sebelum event itu terbit, dan burn tidak bisa dibatalkan — jadi
 * relayer yang melewatkan satu event bukan sekadar "terlambat", melainkan
 * membuat user kehilangan uang.
 *
 * Tiga sifat yang menjaga janji itu, dan alasan bentuk kodenya seperti ini:
 *
 *   1. IDEMPOTEN. Nonce adalah primary key `swap_vouchers`, jadi dua tick yang
 *      berjalan bersamaan (cron menumpuk, retry setelah timeout) tidak bisa
 *      menerbitkan dua voucher untuk satu burn. Penjaganya database, bukan
 *      kehati-hatian kode.
 *   2. KURSOR MAJU BELAKANGAN. Voucher ditulis dulu, kursor baru digeser.
 *      Bila proses mati di tengah, tick berikutnya memindai ulang rentang yang
 *      sama — aman justru karena sifat (1). Urutan sebaliknya akan melewatkan
 *      burn secara permanen.
 *   3. TAHAN REORG. Hanya blok yang sudah cukup dalam yang diproses. Voucher
 *      untuk burn yang kemudian hilang karena reorg tidak bisa ditarik kembali;
 *      menunggu konfirmasi jauh lebih murah daripada menambalnya.
 *
 * Kunci `swapSigner` setara "surat kuasa mencairkan kolam" dalam batas
 * `maxIdmxPerVoucher`. Batas itu, dan anti-replay, ditegakkan di `SwapClaim.sol`
 * — bukan di sini — supaya kebocoran kunci tetap terbatas aturan on-chain.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient, http, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  SWAP_CLAIM_ABI,
  swapBurnChain,
  swapClaimAddress,
  swapClaimChain,
  swapInitiatorAddress,
} from "@/lib/swap/config";

/** Baris tunggal kursor di `relayer_state`. */
const CURSOR_ID = "swap";

/**
 * Konfirmasi sebelum sebuah burn dianggap final. opBNB memproduksi blok tiap
 * ~1 detik, jadi 15 blok ≈ 15 detik — tak terasa bagi user (UI memang
 * menampilkan "Diproses"), tapi cukup untuk melewati reorg dangkal.
 */
const KONFIRMASI = 15n;

/** Batas rentang per panggilan getLogs. RPC publik menolak rentang lebar. */
const RENTANG_MAKS = 5_000n;

/** Batas iterasi per tick supaya route tidak melewati batas waktu serverless.
 *  Sisa rentang dikejar tick berikutnya — kursor sudah tersimpan. */
const CHUNK_MAKS = 20;

/** Anggaran waktu satu tick; di bawah `maxDuration` route dengan margin. */
const ANGGARAN_MS = 20_000;

/** Umur voucher. Panjang dengan sengaja: user membayar gas BSC sendiri, jadi
 *  ia berhak menunggu sampai punya BNB tanpa kehilangan haknya. */
const UMUR_VOUCHER_HARI = 30;

/** Perbarui voucher yang tersisa < ambang ini, sebelum benar-benar mati.
 *  Menandatangani ulang lebih awal berarti user tidak pernah melihat voucher
 *  kedaluwarsa — padahal haknya memang tidak pernah hilang. */
const AMBANG_PERPANJANG_HARI = 7;

/** Berapa voucher yang direkonsiliasi statusnya per tick (hemat panggilan RPC). */
const REKONSILIASI_MAKS = 25;

const EVENT_SWAP_REQUESTED = parseAbiItem(
  "event SwapRequested(address indexed user, uint256 idmxAmount, uint256 indexed nonce, uint256 timestamp)",
);

function signerKey(): `0x${string}` | null {
  const k = process.env.SWAP_SIGNER_PRIVATE_KEY;
  if (!k) return null;
  const hex = k.startsWith("0x") ? k : `0x${k}`;
  return /^0x[0-9a-fA-F]{64}$/.test(hex) ? (hex as `0x${string}`) : null;
}

/** Relayer siap? Kedua kontrak + kunci penandatangan harus lengkap. */
export function isRelayerConfigured(): boolean {
  return (
    swapInitiatorAddress() !== null &&
    swapClaimAddress() !== null &&
    signerKey() !== null
  );
}

export interface SwapVoucherData {
  user: `0x${string}`;
  idmxBurned: bigint;
  nonce: bigint;
  deadline: bigint;
}

/**
 * Tanda tangani voucher (EIP-712). Domain WAJIB sama persis dengan konstruktor
 * `SwapClaim.sol` — nama, versi, chainId BSC, dan alamat kontraknya. Salah satu
 * saja meleset dan kontrak menolak setiap voucher dengan `InvalidSignature`,
 * padahal IDMX sudah terbakar.
 */
export async function tandatanganiVoucherSwap(
  v: SwapVoucherData,
): Promise<`0x${string}`> {
  const key = signerKey();
  const address = swapClaimAddress();
  if (!key || !address) throw new Error("Relayer swap belum dikonfigurasi.");

  const account = privateKeyToAccount(key);
  return account.signTypedData({
    domain: {
      name: "AIDM SwapClaim",
      version: "1",
      chainId: swapClaimChain().id,
      verifyingContract: address,
    },
    types: {
      SwapVoucher: [
        { name: "user", type: "address" },
        { name: "idmxBurned", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint64" },
      ],
    },
    primaryType: "SwapVoucher",
    message: v,
  });
}

/**
 * Kedua bentuk WAJIB berasal dari satu nilai detik yang sama.
 *
 * Yang ditandatangani adalah `detik` (uint64), sedangkan yang tersimpan di DB
 * adalah `iso` — dan klien harus bisa memulihkan `detik` persis dari `iso`,
 * karena angka itulah yang dipakai memanggil kontrak. Sebelumnya `iso` dibuat
 * dari milidetik mentah sementara `detik` dibulatkan ke bawah, sehingga
 * keduanya berbeda hingga 999 ms. Pemulihan dengan pembulatan ke bawah memang
 * kebetulan menghasilkan angka yang benar, tapi kebenaran yang bergantung pada
 * kebetulan tidak layak dipegang saat taruhannya voucher yang ditolak
 * `InvalidSignature` atas IDMX yang sudah terbakar.
 */
function deadlineBaru(): { detik: bigint; iso: string } {
  const detik = Math.floor((Date.now() + UMUR_VOUCHER_HARI * 86_400_000) / 1000);
  return { detik: BigInt(detik), iso: new Date(detik * 1000).toISOString() };
}

export interface HasilTick {
  dariBlok: string;
  sampaiBlok: string;
  voucherBaru: number;
  voucherDiperpanjang: number;
  ditandaiTertebus: number;
  tertinggal: string;
}

/**
 * Satu putaran relayer. Dipanggil endpoint cron; aman dipanggil berkali-kali
 * dan aman dipanggil bersamaan.
 */
export async function jalankanTick(
  supa: SupabaseClient,
): Promise<HasilTick> {
  const initiator = swapInitiatorAddress();
  if (!initiator || !isRelayerConfigured()) {
    throw new Error("Relayer swap belum dikonfigurasi.");
  }

  const mulai = Date.now();
  const burnChain = swapBurnChain();
  const publik = createPublicClient({ chain: burnChain, transport: http() });

  /* ── 1. Kursor ─────────────────────────────────────────────────────────── */

  const { data: stateRow } = await supa
    .from("relayer_state")
    .select("cursor_block")
    .eq("id", CURSOR_ID)
    .maybeSingle();

  const kepala = await publik.getBlockNumber();
  const aman = kepala > KONFIRMASI ? kepala - KONFIRMASI : 0n;

  let kursor: bigint;
  if (stateRow) {
    kursor = BigInt(stateRow.cursor_block);
  } else {
    // Bootstrap sekali seumur hidup. Env dipakai HANYA di sini; sesudah baris
    // ada, env tidak pernah dibaca lagi (redeploy tidak boleh memundurkan
    // kursor). Tanpa env, mulai dari kepala rantai — sikap yang jujur: lebih
    // baik tidak mengaku pernah memindai masa lalu yang tidak kita pindai.
    const bootstrap = process.env.SWAP_RELAYER_CURSOR_BLOCK;
    kursor = /^\d+$/.test(bootstrap ?? "") ? BigInt(bootstrap!) - 1n : aman;
    await supa
      .from("relayer_state")
      .insert({ id: CURSOR_ID, cursor_block: kursor.toString() });
  }

  /* ── 2. Pindai SwapRequested ───────────────────────────────────────────── */

  let voucherBaru = 0;
  let posisi = kursor;

  for (let i = 0; i < CHUNK_MAKS && posisi < aman; i++) {
    if (Date.now() - mulai > ANGGARAN_MS) break;

    const dari = posisi + 1n;
    const sampai = dari + RENTANG_MAKS - 1n > aman ? aman : dari + RENTANG_MAKS - 1n;

    const logs = await publik.getLogs({
      address: initiator,
      event: EVENT_SWAP_REQUESTED,
      fromBlock: dari,
      toBlock: sampai,
    });

    for (const log of logs) {
      const { user, idmxAmount, nonce } = log.args as {
        user?: `0x${string}`;
        idmxAmount?: bigint;
        nonce?: bigint;
      };
      // Log tanpa argumen lengkap tidak mungkin berasal dari kontrak kita;
      // melewatinya lebih aman daripada menandatangani voucher setengah jadi.
      if (!user || idmxAmount === undefined || nonce === undefined) continue;

      const { detik, iso } = deadlineBaru();
      const signature = await tandatanganiVoucherSwap({
        user,
        idmxBurned: idmxAmount,
        nonce,
        deadline: detik,
      });

      const { data: uid } = await supa
        .from("wallets")
        .select("user_id")
        .ilike("address", user)
        .maybeSingle();

      // `ignoreDuplicates` = idempotensi: nonce yang sudah punya voucher tidak
      // ditimpa. Menimpanya akan mengganti tanda tangan yang mungkin sedang
      // dipegang user di layar konfirmasi dompetnya.
      const { error, count } = await supa
        .from("swap_vouchers")
        .upsert(
          {
            nonce: nonce.toString(),
            user_address: user,
            user_id: uid?.user_id ?? null,
            idmx_burned: idmxAmount.toString(),
            burn_tx_hash: log.transactionHash,
            burn_block: log.blockNumber.toString(),
            deadline: iso,
            signature,
            status: "signed",
          },
          { onConflict: "nonce", ignoreDuplicates: true, count: "exact" },
        );
      if (error) throw error;
      if (count) voucherBaru += count;
    }

    // Kursor digeser SETELAH voucher rentang ini tersimpan — lihat sifat (2)
    // di komentar kepala berkas.
    posisi = sampai;
    const { error: errKursor } = await supa
      .from("relayer_state")
      .update({ cursor_block: posisi.toString() })
      .eq("id", CURSOR_ID);
    if (errKursor) throw errKursor;
  }

  /* ── 3. Perpanjang voucher yang mendekati kedaluwarsa ──────────────────── */

  const ambang = new Date(
    Date.now() + AMBANG_PERPANJANG_HARI * 86_400_000,
  ).toISOString();
  const { data: perluPerpanjang } = await supa
    .from("swap_vouchers")
    .select("nonce, user_address, idmx_burned")
    .eq("status", "signed")
    .lt("deadline", ambang)
    .limit(REKONSILIASI_MAKS);

  let voucherDiperpanjang = 0;
  for (const row of perluPerpanjang ?? []) {
    // Nonce SAMA, deadline baru. Yang mencegah klaim ganda adalah nonce di
    // kontrak, bukan deadline — jadi memperbarui masa berlaku tidak pernah
    // membuka jalan tebus kedua.
    const { detik, iso } = deadlineBaru();
    const signature = await tandatanganiVoucherSwap({
      user: row.user_address as `0x${string}`,
      idmxBurned: BigInt(row.idmx_burned),
      nonce: BigInt(row.nonce),
      deadline: detik,
    });
    await supa
      .from("swap_vouchers")
      .update({ deadline: iso, signature })
      .eq("nonce", row.nonce);
    voucherDiperpanjang++;
  }

  /* ── 4. Rekonsiliasi voucher yang sudah tertebus ───────────────────────── */
  // Kebenarannya ada di kontrak BSC, bukan di sini: `nonceUsed` yang menentukan.
  // Tanpa langkah ini UI akan terus menawarkan tombol "Klaim" untuk voucher
  // yang sebenarnya sudah dicairkan, dan klik itu pasti revert.

  const claimAddress = swapClaimAddress()!;
  const publikBsc = createPublicClient({
    chain: swapClaimChain(),
    transport: http(),
  });
  const { data: belumTertebus } = await supa
    .from("swap_vouchers")
    .select("nonce")
    .eq("status", "signed")
    .order("created_at", { ascending: true })
    .limit(REKONSILIASI_MAKS);

  let ditandaiTertebus = 0;
  for (const row of belumTertebus ?? []) {
    if (Date.now() - mulai > ANGGARAN_MS + 10_000) break;
    const terpakai = await publikBsc.readContract({
      address: claimAddress,
      abi: SWAP_CLAIM_ABI,
      functionName: "nonceUsed",
      args: [BigInt(row.nonce)],
    });
    if (terpakai) {
      await supa
        .from("swap_vouchers")
        .update({ status: "claimed" })
        .eq("nonce", row.nonce);
      ditandaiTertebus++;
    }
  }

  return {
    dariBlok: kursor.toString(),
    sampaiBlok: posisi.toString(),
    voucherBaru,
    voucherDiperpanjang,
    ditandaiTertebus,
    tertinggal: (aman > posisi ? aman - posisi : 0n).toString(),
  };
}
