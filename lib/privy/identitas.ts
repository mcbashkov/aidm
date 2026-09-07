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

/**
 * Privy menjawab "tidak ada user seperti itu" — jawaban PASTI, bukan gangguan.
 *
 * Perbedaan itu menentukan perilaku di tiga tempat sekaligus, dan karena itu ia
 * tinggal di sini alih-alih disalin: pengisian dompet susulan memakainya untuk
 * membedakan "belum siap" dari "Privy sedang tidak bisa ditanya", dan
 * penghapusan akun memakainya untuk memperlakukan identitas yang memang sudah
 * lenyap sebagai keberhasilan. Dua salinan aturan ini akan menyimpang, dan
 * menyimpangnya tidak terlihat sampai seseorang terjebak.
 */
export function privyTidakDitemukan(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ((err as { status?: unknown }).status === 404) return true;
  const pesan = err instanceof Error ? err.message : "";
  return /not\s*found|404/i.test(pesan);
}

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

/**
 * Hasil pemastian dompet. `gagal` sengaja dibedakan dari "belum ada": yang
 * pertama berarti kita TIDAK TAHU dan harus berkata begitu, yang kedua adalah
 * keadaan yang tidak boleh lagi bertahan sedetik pun setelah fungsi ini
 * dipanggil.
 */
export type HasilBuatDompet =
  | { status: "ada"; alamat: `0x${string}`; dibuat: boolean }
  | { status: "gagal"; sebab: string };

/**
 * Pastikan seorang pengguna punya embedded wallet — buat bila belum ada.
 *
 * KENAPA INI DI SERVER, dan kenapa ia tidak boleh dipindahkan ke komponen.
 *
 * Sampai 2026-08-28 tidak ada satu pun baris kode kita yang membuat dompet.
 * Yang membuatnya adalah MODAL Privy, lewat `embeddedWallets.createOnLogin`
 * di `lib/privy/provider.tsx` — dan `createOnLogin` dieksekusi oleh layar
 * modal itu sendiri, bukan oleh SDK secara umum. Ketika modal diganti UI
 * Indonesia kita (P1-4, commit `1156194`), pembuatan dompet ikut hilang
 * bersamanya. Tidak ada yang menyadarinya selama sepuluh hari: tujuh pengguna
 * berturut-turut mendaftar tanpa dompet, dan setiap permintaan tetap dijawab
 * `200`.
 *
 * Pelajarannya bukan "modalnya jangan diganti". Pelajarannya: sebuah invarian
 * produk — §7.1 "punya akun = punya wallet" — tidak boleh ditegakkan oleh
 * komponen tampilan, karena komponen tampilan boleh diganti kapan saja oleh
 * orang yang tidak tahu ada invarian menumpang di sana. Di server ia berada
 * pada jalur yang HARUS dilewati setiap sesi, dan menghapusnya menuntut
 * seseorang menghapus baris yang menyebut dompet secara eksplisit.
 *
 * Mode aplikasi ini `user-controlled-server-wallets-only` dan
 * `requireUserOwnedRecoveryOnCreate` mati, jadi pembuatannya satu panggilan
 * API tanpa UI apa pun — tidak ada layar berbahasa Inggris yang muncul, dan
 * syarat P1-4 tetap utuh.
 */
export async function buatDompetPrivy(
  privy: PrivyClient,
  did: string,
): Promise<HasilBuatDompet> {
  try {
    const akun = (await privy.createWallets({
      userId: did,
      createEthereumWallet: true,
    })) as AkunPrivy;
    const alamat = alamatDariAkun(akun);
    if (alamat) return { status: "ada", alamat, dibuat: true };
    // Privy menjawab sukses tapi tidak ada alamat yang bisa dibaca. Jangan
    // menebak: ini persis kelas kegagalan yang baru saja kita bayar mahal.
    return { status: "gagal", sebab: "createWallets sukses tanpa alamat" };
  } catch (err) {
    // Dua permintaan bersamaan dari satu pengguna sama-sama melihat "belum ada"
    // dan sama-sama memanggil ini; yang kalah menerima galat "sudah punya
    // dompet". Itu bukan kegagalan — dompetnya justru ADA sekarang. Satu-
    // satunya cara membedakannya dari kegagalan sungguhan adalah bertanya
    // ulang, bukan mencocokkan teks pesan galat yang bisa berubah diam-diam.
    try {
      const akun = (await privy.getUserById(did)) as AkunPrivy;
      const alamat = alamatDariAkun(akun);
      if (alamat) return { status: "ada", alamat, dibuat: false };
    } catch {
      // Jatuh ke laporan gagal di bawah — sebab aslinya yang dilaporkan.
    }
    const sebab = err instanceof Error ? err.message : String(err);
    return { status: "gagal", sebab };
  }
}
