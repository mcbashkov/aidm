import type { PrivyClient } from "@privy-io/server-auth";

/**
 * Membaca identitas seorang pengguna dari Privy — sumber yang berwenang.
 *
 * Berkas ini ada karena satu aturan: apa pun yang menentukan SIAPA seseorang
 * atau KE MANA rewardnya dibayarkan tidak boleh datang dari badan permintaan.
 * Token yang terverifikasi membuktikan pemiliknya memegang sesi yang sah; ia
 * tidak membuktikan bahwa alamat email atau alamat dompet yang ikut dikirim di
 * JSON yang sama benar-benar miliknya. Keduanya dibaca ulang dari Privy lewat
 * DID yang keluar dari verifikasi token.
 *
 * Ekstraksi alamat dompet dulu tinggal di `lib/wallet/server.ts`. Ia diangkat
 * ke sini supaya `POST /api/auth/session` dan pengisian susulan dompet memakai
 * definisi yang SAMA — dua salinan aturan "alamat mana yang dipakai" akan
 * menyimpang, dan menyimpang di titik ini berarti reward mendarat di alamat
 * yang berbeda dari yang ditampilkan ke pengguna.
 */

export const ALAMAT_EVM = /^0x[0-9a-fA-F]{40}$/;

/** Bentuk minimal akun Privy yang kita butuhkan — bukan seluruh tipe SDK. */
export interface AkunPrivy {
  email?: { address?: string } | null;
  phone?: { number?: string } | null;
  google?: { email?: string } | null;
  wallet?: { address?: string } | null;
  linkedAccounts?: { type?: string; address?: string }[] | null;
}

/** Alamat embedded wallet dari akun Privy, bila ada. */
export function alamatDariAkun(akun: AkunPrivy): `0x${string}` | null {
  const kandidat = [
    akun.wallet?.address,
    ...(akun.linkedAccounts ?? [])
      .filter((a) => a?.type === "wallet")
      .map((a) => a?.address),
  ];
  for (const a of kandidat) {
    if (typeof a === "string" && ALAMAT_EVM.test(a)) return a as `0x${string}`;
  }
  return null;
}

/**
 * Alamat email dari akun Privy.
 *
 * Login Google menaruh alamatnya di `google.email`, BUKAN di `email.address` —
 * membaca yang kedua saja mengembalikan `undefined` untuk setiap pengguna
 * Google, dan bila nilai itu ikut ditulis ke kolom, alamatnya terhapus diam-
 * diam setiap kali seseorang berpindah metode masuk.
 */
export function emailDariAkun(akun: AkunPrivy): string | null {
  const kandidat = akun.email?.address ?? akun.google?.email ?? null;
  return typeof kandidat === "string" && kandidat.includes("@")
    ? kandidat
    : null;
}

/** Metode masuk yang benar-benar TERTAUT pada akun ini (§10 `auth_provider`). */
export type MetodeMasuk = "google" | "email" | "sms";

export function metodeTertaut(akun: AkunPrivy): Set<MetodeMasuk> {
  const set = new Set<MetodeMasuk>();
  if (akun.google?.email) set.add("google");
  if (akun.email?.address) set.add("email");
  if (akun.phone?.number) set.add("sms");
  return set;
}

export interface IdentitasPrivy {
  email: string | null;
  phone: string | null;
  alamat: `0x${string}` | null;
  metode: Set<MetodeMasuk>;
}

/**
 * Baca identitas dari Privy. `null` berarti Privy tidak bisa ditanya —
 * BUKAN berarti penggunanya tidak punya identitas. Pemanggil wajib
 * memperlakukan keduanya berbeda: pada kegagalan Privy, jangan menimpa apa pun
 * yang sudah tersimpan, karena "tidak tahu" bukan "tidak ada".
 */
export async function bacaIdentitas(
  privy: PrivyClient,
  did: string,
): Promise<IdentitasPrivy | null> {
  try {
    const akun = (await privy.getUserById(did)) as AkunPrivy;
    return {
      email: emailDariAkun(akun),
      phone:
        typeof akun.phone?.number === "string" && akun.phone.number
          ? akun.phone.number
          : null,
      alamat: alamatDariAkun(akun),
      metode: metodeTertaut(akun),
    };
  } catch (err) {
    console.error(`[privy] getUserById gagal (did=${did}):`, err);
    return null;
  }
}
