/**
 * Alamat dompet embedded milik seorang user — dengan pengisian susulan.
 *
 * Latar yang menentukan bentuk berkas ini: baris `wallets` dulu HANYA ditulis
 * sekali, oleh `POST /api/auth/session`, dari `user?.wallet?.address` yang
 * dibaca klien pada detik login. Privy membuat embedded wallet secara
 * asinkron, jadi bila ia belum jadi pada detik itu, field-nya terkirim
 * `undefined` dan tidak ada apa pun yang mengisinya belakangan — user tersebut
 * PERMANEN tanpa dompet sampai ia kebetulan login ulang. Gejalanya 400/409,
 * bukan 500, sehingga tidak pernah muncul di pemantauan error. Saat ditemukan
 * (2026-08-26), 2 dari 9 user produksi berada dalam keadaan itu; salah satunya
 * punya profil lengkap dan 5 catatan.
 *
 * Perbaikannya sengaja TIDAK berupa "kirim ulang alamat dari klien":
 *
 *   1. alamat dompet tidak boleh datang dari input klien — di sinilah reward
 *      dibayarkan, dan satu-satunya sumber yang berwenang adalah Privy;
 *   2. cookie sesi sudah membawa DID, jadi server bisa bertanya sendiri;
 *   3. cara ini menyembuhkan user yang TERLANJUR rusak tanpa mereka melakukan
 *      apa pun — tidak ada "coba login ulang" yang menyuruh orang menebak.
 *
 * `startedRef` di `components/auth/login-panel.tsx` sengaja TIDAK dilepas:
 * penjaga itu ada karena `POST /api/auth/session` bertubi-tubi pernah
 * membekukan tab. Masalahnya bukan penjaga itu, melainkan tidak adanya jalur
 * susulan — dan jalur itulah yang ditambahkan di sini.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPrivyServerClient } from "@/lib/privy/server";

export type HasilWallet =
  | { status: "ada"; alamat: `0x${string}`; diisiSusulan: boolean }
  /** Privy menjawab, dan memang belum ada embedded wallet untuk DID ini. */
  | { status: "belum-siap" }
  /** Privy sendiri yang gagal (jaringan, kredensial, rate limit). Beda sebab,
   *  beda kode, beda log — "belum ada" dan "tidak bisa ditanya" bukan hal yang
   *  sama, dan menyamakannya membuat gangguan Privy tampak seperti akun yang
   *  belum siap selamanya. */
  | { status: "galat-privy" };

const ALAMAT = /^0x[0-9a-fA-F]{40}$/;

/**
 * Ingatan singkat untuk user yang Privy-nya BELUM punya dompet.
 *
 * `/api/wallet/saldo` dipanggil pada setiap navigasi; tanpa ini, user yang
 * memang belum punya dompet akan memicu satu panggilan Privy per permintaan.
 * TTL-nya sengaja pendek: jendela yang sedang dilayani adalah detik-detik
 * pertama sebuah akun, dan pengguna yang menunggu dompetnya jadi lalu menekan
 * Klaim lagi tidak boleh dijawab dari ingatan basi.
 */
const NEGATIF_TTL_MS = 10_000;
const belumSiap = new Map<string, number>();

/** Privy menjawab "tidak ada user seperti itu" — jawaban pasti, bukan galat. */
function tidakDitemukan(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: unknown }).status;
  if (status === 404) return true;
  const pesan = err instanceof Error ? err.message : "";
  return /not\s*found|404/i.test(pesan);
}

/** Alamat embedded wallet dari akun Privy, bila ada. */
function alamatDariPrivy(akun: {
  wallet?: { address?: string } | null;
  linkedAccounts?: { type?: string; address?: string }[] | null;
}): `0x${string}` | null {
  const kandidat = [
    akun.wallet?.address,
    ...(akun.linkedAccounts ?? [])
      .filter((a) => a?.type === "wallet")
      .map((a) => a?.address),
  ];
  for (const a of kandidat) {
    if (typeof a === "string" && ALAMAT.test(a)) return a as `0x${string}`;
  }
  return null;
}

/**
 * Baca alamat dompet user. Bila barisnya belum ada, tanya Privy sekali lalu
 * simpan — sehingga panggilan berikutnya kembali murni dari Postgres.
 *
 * TIDAK PERNAH melempar: setiap kegagalan diterjemahkan menjadi status, karena
 * pemanggilnya adalah endpoint yang wajib menjawab dengan kode yang bisa
 * dipahami pengguna, bukan 500.
 */
export async function alamatWalletUser(
  supa: SupabaseClient,
  uid: string,
  did: string | null,
): Promise<HasilWallet> {
  const { data: baris } = await supa
    .from("wallets")
    .select("address")
    .eq("user_id", uid)
    .maybeSingle();

  const tersimpan = baris?.address;
  if (typeof tersimpan === "string" && ALAMAT.test(tersimpan)) {
    return { status: "ada", alamat: tersimpan as `0x${string}`, diisiSusulan: false };
  }

  // Tanpa DID kita tidak punya siapa yang harus ditanyakan ke Privy. Itu bukan
  // galat: cookie sesi lama memang bisa tidak membawanya.
  if (!did) return { status: "belum-siap" };

  const ingat = belumSiap.get(uid);
  if (ingat && ingat > Date.now()) return { status: "belum-siap" };

  const privy = getPrivyServerClient();
  if (!privy) return { status: "belum-siap" };

  let alamat: `0x${string}` | null = null;
  try {
    const akun = await privy.getUserById(did);
    alamat = alamatDariPrivy(akun as Parameters<typeof alamatDariPrivy>[0]);
  } catch (err) {
    // "Privy tidak mengenal DID ini" bukan gangguan Privy — jawabannya pasti,
    // dan artinya memang tidak ada dompet. Menjawabnya 503 "coba lagi" akan
    // menyuruh orang menunggu sesuatu yang tidak akan datang.
    if (tidakDitemukan(err)) {
      console.warn(`[wallet] DID tidak dikenal Privy (uid=${uid})`);
      belumSiap.set(uid, Date.now() + NEGATIF_TTL_MS);
      return { status: "belum-siap" };
    }
    // Sisanya: Privy tidak bisa DITANYA — bukan "user ini belum punya dompet".
    console.error(`[wallet] getUserById gagal (uid=${uid}):`, err);
    return { status: "galat-privy" };
  }

  if (!alamat) {
    belumSiap.set(uid, Date.now() + NEGATIF_TTL_MS);
    return { status: "belum-siap" };
  }

  // ON CONFLICT (user_id): dua permintaan bersamaan dari user yang sama
  // menghasilkan satu baris, bukan dua dan bukan 23505 yang naik jadi 500.
  const { error } = await supa.from("wallets").upsert(
    {
      user_id: uid,
      address: alamat,
      provider: "privy",
      chain_default: "opbnb",
    },
    { onConflict: "user_id" },
  );

  if (error) {
    // `wallets.address` juga unik. Bentrok di situ berarti alamat yang sama
    // sudah terdaftar pada user lain — keadaan yang tidak boleh kita timpa
    // diam-diam, dan tidak bisa diperbaiki dengan mencoba lagi.
    console.error(
      `[wallet] simpan alamat gagal (uid=${uid}, sqlstate=${
        (error as { code?: string }).code ?? "-"
      }):`,
      error,
    );
    // Baris bisa saja sudah ditulis permintaan lain yang menang balapan.
    const { data: ulang } = await supa
      .from("wallets")
      .select("address")
      .eq("user_id", uid)
      .maybeSingle();
    const lagi = ulang?.address;
    if (typeof lagi === "string" && ALAMAT.test(lagi)) {
      return { status: "ada", alamat: lagi as `0x${string}`, diisiSusulan: false };
    }
    return { status: "galat-privy" };
  }

  belumSiap.delete(uid);
  return { status: "ada", alamat, diisiSusulan: true };
}
