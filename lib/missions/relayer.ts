/**
 * Relayer klaim misi (§7.6) — sisi yang benar-benar menyentuh rantai.
 *
 * Handler HTTP hanya menulis NIAT. Berkas inilah yang menandatangani,
 * mengirim, lalu merekonsiliasi hasilnya. Pemisahan itu bukan soal kecepatan
 * respons; ia menghapus satu kelas bug secara struktural:
 *
 *   Dulu handler mengirim transaksi LALU menulis `tx_hash`. Di antara keduanya
 *   ada jendela tempat uang sudah berpindah tapi catatannya belum ada — dan
 *   kegagalan tulis di sana membuat pengguna melihat 500, mencoba lagi, dan
 *   dijawab "sudah diklaim" untuk reward yang tidak pernah bisa ia lihat.
 *
 * Sekarang barisnya SELALU lebih dulu, lengkap dengan `nonce`-nya. Karena
 * nonce sudah tersimpan sebelum apa pun dikirim, kebenaran on-chain selalu bisa
 * ditanyakan ulang (`nonceUsed`, lalu event `Claimed` untuk hash-nya) — baris
 * database tidak pernah lagi menjadi satu-satunya bukti bahwa reward dibayar.
 * Nonce yang tetap juga membuat kirim ulang aman: kontrak menolak nonce yang
 * sudah terpakai, jadi percobaan kedua tidak mungkin membayar dua kali.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  parseAbi,
  parseAbiItem,
  formatEther,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ikutCapHarian, type MissionTipe } from "@/lib/missions";
import {
  MISSION_REWARDS_ABI,
  idmxKeWei,
  isKlaimConfigured,
  missionIdOnChain,
  missionRewardsAddress,
  relayerAccountKey,
  rewardChain,
  tandatanganiVoucher,
  type VoucherData,
} from "@/lib/missions/klaim-server";

/** Voucher berlaku 10 menit sejak DITANDATANGANI — bukan sejak diantrekan.
 *  Kalau dihitung dari waktu antre, klaim yang menunggu cron lebih dari 10
 *  menit akan lahir sudah kedaluwarsa. */
const VOUCHER_TTL_DETIK = 600;

/** Berapa klaim yang dikirim per tick. Ditahan rendah dengan sengaja: seluruh
 *  pengiriman berbagi satu EOA dan karenanya SERIAL, dan satu tick punya
 *  anggaran 60 detik yang juga dipakai tick swap. */
const KIRIM_MAKS = 5;
const REKONSILIASI_MAKS = 20;

/** Anggaran waktu fase kirim bila pemanggil tidak menentukan tenggat. Sisanya
 *  disediakan untuk rekonsiliasi, yang jauh lebih murah dan tidak boleh
 *  kelaparan karena antrean panjang. */
const ANGGARAN_KIRIM_MS = 25_000;

/** Umur sewa pengirim. Lebih panjang dari `maxDuration` endpoint (60 detik)
 *  supaya tick yang dibunuh Vercel di tengah jalan tidak langsung disusul
 *  tick berikutnya sementara transaksinya masih mengudara. */
const SEWA_DETIK = 90;

/** Baris klaim yang belum tuntas. */
interface BarisKlaim {
  id: string;
  user_id: string;
  mission_id: string;
  amount_idmx: number;
  nonce: string;
  period_key: string | null;
  status: string;
  tx_hash: string | null;
}

export interface HasilTickMisi {
  /** Sewa pengirim dipegang tick lain — bukan galat, memang harus mundur. */
  dilewati: boolean;
  dikirim: number;
  gagalKirim: number;
  dikonfirmasi: number;
  dipulihkan: number;
  dikembalikanKeAntrean: number;
  /** Sisa IDMX di kontrak reward saat kolamnya menipis; `null` selama sehat. */
  kolamMenipis: string | null;
}

const KOSONG: HasilTickMisi = {
  dilewati: false,
  dikirim: 0,
  gagalKirim: 0,
  dikonfirmasi: 0,
  dipulihkan: 0,
  dikembalikanKeAntrean: 0,
  kolamMenipis: null,
};

/**
 * Ambang peringatan kolam reward.
 *
 * Kalau IDMX di `MissionRewards` habis, `claim()` REVERT dan pengguna melihat
 * kegagalan tanpa sebab yang bisa ia pahami — bukan "kolamnya kosong",
 * melainkan klaim yang berulang kali gagal. Angka ini kira-kira sepuluh hari
 * beta 100 user pada cap penuh (100 × 250 × 10 = 250.000, dibulatkan naik
 * dengan margin) — cukup lama untuk mengisi ulang tanpa ada yang terganggu.
 */
const AMBANG_KOLAM_IDMX = 1_000_000n;

const IDMX_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
]);

const EVENT_CLAIMED = parseAbiItem(
  "event Claimed(address indexed user, uint256 indexed missionId, uint256 amount, uint256 nonce, uint8 bucket)",
);

/**
 * Ambil sewa pengirim untuk sebuah EOA.
 *
 * Kuncinya ALAMAT, bukan nama pekerjaan: siapa pun yang kelak mengirim dari
 * EOA yang sama otomatis ikut terserialkan tanpa perlu ingat mendaftarkan
 * kunci baru. Baris disisipkan lebih dulu bila belum ada, lalu diambil alih
 * hanya jika sewanya sudah lewat — satu pernyataan UPDATE berkondisi, sehingga
 * dua tick yang berlomba tidak mungkin sama-sama menang.
 */
async function ambilSewa(
  supa: SupabaseClient,
  alamat: string,
): Promise<boolean> {
  const id = `pengirim:${alamat.toLowerCase()}`;
  const sekarang = new Date();
  const sampai = new Date(sekarang.getTime() + SEWA_DETIK * 1000).toISOString();

  // Sisipan pertama kali. Bentrok = baris sudah ada, dan itu jalur normal.
  const { error: errSisip } = await supa
    .from("relayer_locks")
    .insert({ id, locked_until: sampai, pemegang: "misi" });
  if (!errSisip) return true;

  const { data } = await supa
    .from("relayer_locks")
    .update({ locked_until: sampai, pemegang: "misi" })
    .eq("id", id)
    .lt("locked_until", sekarang.toISOString())
    .select("id");
  return (data ?? []).length > 0;
}

async function lepasSewa(supa: SupabaseClient, alamat: string): Promise<void> {
  await supa
    .from("relayer_locks")
    .update({ locked_until: new Date().toISOString() })
    .eq("id", `pengirim:${alamat.toLowerCase()}`);
}

/**
 * Alamat dompet user dalam bentuk checksum EIP-55.
 *
 * viem MENOLAK alamat yang checksum-nya tidak cocok, dan penolakan itu terjadi
 * saat menandatangani — artinya sebuah alamat yang tersimpan dengan kapitalisasi
 * salah akan membuat klaimnya gagal, kembali mengantre, gagal lagi, setiap
 * menit, selamanya. Menormalkannya di sini (huruf kecil dulu, baru dihitung
 * ulang checksum-nya) menutup mode macet itu tanpa perlu memercayai bahwa
 * setiap penulis kolom `wallets.address` sudah rapi.
 */
async function alamatTerkanonik(
  supa: SupabaseClient,
  userId: string,
): Promise<`0x${string}` | null> {
  const { data } = await supa
    .from("wallets")
    .select("address")
    .eq("user_id", userId)
    .maybeSingle();
  const mentah = data?.address;
  if (typeof mentah !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(mentah)) {
    return null;
  }
  try {
    return getAddress(mentah.toLowerCase());
  } catch {
    return null;
  }
}

/** Peta id misi → tipe, untuk menentukan ember cap voucher. */
async function petaTipeMisi(
  supa: SupabaseClient,
): Promise<Map<string, MissionTipe>> {
  const { data } = await supa.from("missions").select("id, tipe");
  const peta = new Map<string, MissionTipe>();
  for (const r of (data ?? []) as { id: string; tipe: MissionTipe }[]) {
    peta.set(r.id, r.tipe);
  }
  return peta;
}

function voucherDari(
  baris: BarisKlaim,
  alamatUser: `0x${string}`,
  kodeMisi: string,
  tipe: MissionTipe,
): VoucherData {
  return {
    user: alamatUser,
    missionId: missionIdOnChain(kodeMisi),
    amount: idmxKeWei(Number(baris.amount_idmx)),
    nonce: BigInt(baris.nonce),
    deadline: BigInt(Math.floor(Date.now() / 1000) + VOUCHER_TTL_DETIK),
    bucket: ikutCapHarian(tipe) ? 0 : 1,
  };
}

/** Hash transaksi `Claimed` untuk (user, misi, nonce) — dipakai memulihkan
 *  baris yang transaksinya terlanjur terkirim tanpa sempat tercatat. */
async function cariHashClaimed(
  publik: ReturnType<typeof createPublicClient>,
  kontrak: `0x${string}`,
  user: `0x${string}`,
  missionId: bigint,
  nonce: bigint,
): Promise<`0x${string}` | null> {
  const kepala = await publik.getBlockNumber();
  // Jendela ~2 jam di opBNB (blok 1 detik). Cukup lebar untuk menampung tick
  // yang tertunda, cukup sempit untuk tidak ditolak RPC publik.
  const dari = kepala > 7200n ? kepala - 7200n : 0n;
  const logs = await publik.getLogs({
    address: kontrak,
    event: EVENT_CLAIMED,
    args: { user, missionId },
    fromBlock: dari,
    toBlock: kepala,
  });
  for (const l of logs) {
    if (l.args?.nonce === nonce) return l.transactionHash;
  }
  return null;
}

/**
 * Satu putaran relayer misi. Aman dipanggil berkali-kali; aman dipanggil
 * bersamaan (yang kalah mengambil sewa akan mundur, bukan menggandakan kerja).
 */
export async function jalankanTickMisi(
  supa: SupabaseClient,
  /**
   * Tenggat absolut (epoch ms) untuk fase kirim. Diisi pemanggil karena tick
   * ini berbagi satu invokasi — dan karenanya satu `maxDuration` — dengan tick
   * swap yang berjalan lebih dulu. Tanpa tenggat bersama, antrean panjang bisa
   * membuat fungsi dibunuh Vercel di tengah pengiriman. Itu tidak menghilangkan
   * uang siapa pun (jaring rekonsiliasi menangkapnya menit berikutnya), tapi
   * membiarkannya terjadi berarti sengaja bersandar pada jaring untuk sesuatu
   * yang bisa dihindari.
   */
  tenggatKirim?: number,
): Promise<HasilTickMisi> {
  if (!isKlaimConfigured()) return KOSONG;

  const kontrak = missionRewardsAddress();
  const kunci = relayerAccountKey();
  if (!kontrak || !kunci) return KOSONG;

  const chain: Chain = rewardChain();
  const akun = privateKeyToAccount(kunci);

  if (!(await ambilSewa(supa, akun.address))) {
    return { ...KOSONG, dilewati: true };
  }

  const hasil: HasilTickMisi = { ...KOSONG };
  const publik = createPublicClient({ chain, transport: http() });
  const dompet = createWalletClient({ account: akun, chain, transport: http() });

  try {
    const tipeById = await petaTipeMisi(supa);
    const kodeById = new Map<string, string>();
    {
      const { data } = await supa.from("missions").select("id, code");
      for (const r of (data ?? []) as { id: string; code: string }[]) {
        kodeById.set(r.id, r.code);
      }
    }

    /* ── 1. Kirim yang masih mengantre ─────────────────────────────────── */

    const batasKirim = tenggatKirim ?? Date.now() + ANGGARAN_KIRIM_MS;
    const { data: antre } = await supa
      .from("mission_claims")
      .select("id, user_id, mission_id, amount_idmx, nonce, period_key, status, tx_hash")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(KIRIM_MAKS);

    for (const baris of (antre ?? []) as BarisKlaim[]) {
      if (Date.now() > batasKirim) break;

      // Transisi status berkondisi = pengambilan baris yang atomik. Bila tick
      // lain (atau percobaan lain) sudah memindahkannya, kita tidak dapat
      // baris apa pun dan melewatinya — bukan mengirim untuk kedua kalinya.
      const { data: diambil } = await supa
        .from("mission_claims")
        .update({ status: "sending" })
        .eq("id", baris.id)
        .eq("status", "queued")
        .select("id");
      if (!(diambil ?? []).length) continue;

      const kode = kodeById.get(baris.mission_id);
      const tipe = tipeById.get(baris.mission_id);
      const alamat = await alamatTerkanonik(supa, baris.user_id);

      if (!kode || !tipe || !alamat) {
        // Bukan kegagalan rantai: datanya yang tidak lengkap. Dikembalikan ke
        // antrean, bukan ditandai gagal — dompet bisa muncul menit berikutnya
        // (lihat lib/wallet/server.ts), dan menandai gagal akan membuang hak
        // reward yang sah.
        await supa
          .from("mission_claims")
          .update({ status: "queued" })
          .eq("id", baris.id);
        hasil.dikembalikanKeAntrean += 1;
        continue;
      }

      const voucher = voucherDari(baris, alamat, kode, tipe);
      try {
        const signature = await tandatanganiVoucher(voucher);
        const txHash = await dompet.writeContract({
          address: kontrak,
          abi: MISSION_REWARDS_ABI,
          functionName: "claim",
          args: [
            [
              voucher.user,
              voucher.missionId,
              voucher.amount,
              voucher.nonce,
              voucher.deadline,
              voucher.bucket,
            ],
            signature,
          ],
        });
        // Hash dicatat SEKARANG, tanpa menunggu receipt. Menunggu di sini akan
        // mengembalikan jendela yang justru sedang dihapus.
        await supa
          .from("mission_claims")
          .update({ signature, tx_hash: txHash, status: "submitted" })
          .eq("id", baris.id);
        hasil.dikirim += 1;
      } catch (err) {
        // Gagal kirim TIDAK ditandai `failed`: kita belum tentu tahu transaksi
        // itu tidak terkirim (RPC bisa putus setelah broadcast). Dikembalikan
        // ke antrean dengan nonce yang SAMA; rekonsiliasi yang memutuskan.
        console.error(`[misi-relayer] kirim gagal (klaim=${baris.id}):`, err);
        await supa
          .from("mission_claims")
          .update({ status: "queued" })
          .eq("id", baris.id);
        hasil.gagalKirim += 1;
      }
    }

    /* ── 1b. Kolam reward ──────────────────────────────────────────────── */
    // Diperiksa hanya SETELAH ada yang benar-benar dikirim: itulah satu-satunya
    // yang menguras kolam, dan memeriksanya tiap menit saat antrean kosong
    // hanya menambah panggilan RPC tanpa menjawab pertanyaan siapa pun.
    if (hasil.dikirim > 0) {
      const idmx = process.env.NEXT_PUBLIC_IDMX_ADDRESS;
      if (idmx && /^0x[0-9a-fA-F]{40}$/.test(idmx)) {
        try {
          const sisa = (await publik.readContract({
            address: idmx as `0x${string}`,
            abi: IDMX_ABI,
            functionName: "balanceOf",
            args: [kontrak],
          })) as bigint;
          if (sisa < AMBANG_KOLAM_IDMX * 10n ** 18n) {
            hasil.kolamMenipis = formatEther(sisa);
            console.error(
              `[misi-relayer] KOLAM REWARD MENIPIS: ${hasil.kolamMenipis} IDMX tersisa di ${kontrak}. Isi ulang sebelum habis — klaim akan revert dan pengguna melihat kegagalan tanpa sebab.`,
            );
          }
        } catch (err) {
          // Gagal membaca saldo bukan alasan menggagalkan tick.
          console.error("[misi-relayer] gagal membaca kolam reward:", err);
        }
      }
    }

    /* ── 2. Rekonsiliasi: baris yang sudah punya hash ──────────────────── */

    const { data: menunggu } = await supa
      .from("mission_claims")
      .select("id, user_id, mission_id, amount_idmx, nonce, period_key, status, tx_hash")
      .eq("status", "submitted")
      .not("tx_hash", "is", null)
      .order("created_at", { ascending: true })
      .limit(REKONSILIASI_MAKS);

    for (const baris of (menunggu ?? []) as BarisKlaim[]) {
      try {
        const receipt = await publik.getTransactionReceipt({
          hash: baris.tx_hash as `0x${string}`,
        });
        await supa
          .from("mission_claims")
          .update({ status: receipt.status === "success" ? "confirmed" : "failed" })
          .eq("id", baris.id);
        if (receipt.status === "success") hasil.dikonfirmasi += 1;
      } catch {
        // Belum ter-mine, atau RPC belum melihatnya. Dibiarkan `submitted`;
        // tick berikutnya membacanya lagi. Tidak ada yang hilang karena
        // hash-nya sudah tercatat.
      }
    }

    /* ── 3. Jaring: baris menggantung TANPA hash ───────────────────────── */
    // Inilah pengganti kelas bug lama. Sebuah baris bisa berhenti di `sending`
    // bila proses mati tepat setelah broadcast, atau bila RPC putus sesudah
    // transaksinya diterima. Rantailah yang berwenang: `nonceUsed` menjawab
    // apakah reward benar-benar sudah dibayar, dan event `Claimed` memulihkan
    // hash-nya supaya pengguna tetap punya tautan yang bisa dibuka.
    const ambangSewa = new Date(Date.now() - SEWA_DETIK * 1000).toISOString();
    const { data: menggantung } = await supa
      .from("mission_claims")
      .select("id, user_id, mission_id, amount_idmx, nonce, period_key, status, tx_hash")
      .in("status", ["sending", "submitted", "signed"])
      .is("tx_hash", null)
      .lt("created_at", ambangSewa)
      .limit(REKONSILIASI_MAKS);

    for (const baris of (menggantung ?? []) as BarisKlaim[]) {
      const kode = kodeById.get(baris.mission_id);
      const alamat = await alamatTerkanonik(supa, baris.user_id);
      if (!kode || !alamat) continue;

      const missionId = missionIdOnChain(kode);
      const nonce = BigInt(baris.nonce);
      let terpakai: boolean;
      try {
        terpakai = (await publik.readContract({
          address: kontrak,
          abi: MISSION_REWARDS_ABI,
          functionName: "nonceUsed",
          args: [alamat, nonce],
        })) as boolean;
      } catch (err) {
        console.error(`[misi-relayer] nonceUsed gagal (klaim=${baris.id}):`, err);
        continue;
      }

      if (!terpakai) {
        // Rantai belum pernah melihatnya → aman dikirim ulang dengan nonce yang
        // sama. Tidak ada risiko bayar dua kali: kontrak yang menjaganya.
        await supa
          .from("mission_claims")
          .update({ status: "queued" })
          .eq("id", baris.id);
        hasil.dikembalikanKeAntrean += 1;
        continue;
      }

      // Sudah dibayar. Pulihkan hash-nya supaya tautan opBNBScan tetap ada;
      // bila lognya di luar jangkauan pemindaian, status tetap dinaikkan —
      // reward yang sudah dibayar tidak boleh tampil sebagai belum diklaim
      // hanya karena hash-nya tidak lagi bisa dicari.
      let hash: `0x${string}` | null = null;
      try {
        hash = await cariHashClaimed(publik, kontrak, alamat, missionId, nonce);
      } catch (err) {
        console.error(`[misi-relayer] cari log Claimed gagal (klaim=${baris.id}):`, err);
      }
      await supa
        .from("mission_claims")
        .update({ status: "confirmed", ...(hash ? { tx_hash: hash } : {}) })
        .eq("id", baris.id);
      hasil.dipulihkan += 1;
      console.warn(
        `[misi-relayer] klaim dipulihkan dari rantai (klaim=${baris.id}, hash=${hash ?? "tidak ketemu"})`,
      );
    }

    return hasil;
  } finally {
    // Sewa selalu dilepas, termasuk saat melempar — kalau tidak, satu tick
    // yang gagal akan membekukan pengiriman selama SEWA_DETIK berikutnya.
    await lepasSewa(supa, akun.address);
  }
}
