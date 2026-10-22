/**
 * Penomoran Berkas Pengajuan (PERINTAH-AGEN-PREMIUM §1.5). Murni — tanpa
 * database — supaya bisa diuji langsung.
 *
 * - Nomor dokumen `BK-YYYYMM-xxxxx`: bulan terbit (WIB) + urutan lima digit
 *   per bulan. Urutannya ditentukan pemanggil dari database (count + 1, ulangi
 *   bila unik gagal); di sini hanya formatnya.
 * - Kode verifikasi 12 karakter dari alfabet Crockford base32 tanpa huruf yang
 *   mudah tertukar (I, L, O, U): dibaca di telepon, diketik dari sampul PDF,
 *   dicetak di URL /verifikasi/<kode>. 60 bit acak — cukup agar menebak kode
 *   milik orang lain tidak praktis, dan bukan UUID supaya tidak terlihat
 *   seperti pengenal internal.
 */

import { randomBytes } from "node:crypto";

const ALFABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32

export const PANJANG_KODE_VERIFIKASI = 12;

export function nomorDokumen(bulanWib: string, urutan: number): string {
  // bulanWib 'YYYY-MM' → 'YYYYMM'
  const ym = bulanWib.replace("-", "");
  if (!/^\d{6}$/.test(ym)) throw new Error(`bulan tidak sah: ${bulanWib}`);
  if (!Number.isInteger(urutan) || urutan < 1 || urutan > 99_999) {
    throw new Error(`urutan di luar jangkauan: ${urutan}`);
  }
  return `BK-${ym}-${String(urutan).padStart(5, "0")}`;
}

export function kodeVerifikasiBaru(): string {
  const b = randomBytes(PANJANG_KODE_VERIFIKASI);
  let out = "";
  for (let i = 0; i < PANJANG_KODE_VERIFIKASI; i++) out += ALFABET[b[i] % 32];
  return out;
}

/** Normalisasi masukan pengguna: huruf besar, I/L→1, O→0, buang pemisah. */
export function normalisasiKode(masukan: string): string | null {
  const t = masukan
    .toUpperCase()
    .replace(/[\s\-_.]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  if (t.length !== PANJANG_KODE_VERIFIKASI) return null;
  for (const ch of t) if (!ALFABET.includes(ch)) return null;
  return t;
}

export const RE_NOMOR_DOKUMEN = /^BK-\d{6}-\d{5}$/;
