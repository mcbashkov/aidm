/**
 * Bentuk data kasbon yang dipakai bersama server & klien (Batch 2, migrasi
 * 0031). Kasbon BUKAN transaksi: uangnya belum berpindah, jadi ia tidak
 * pernah masuk laporan, PDF, maupun segel sampai ditandai lunas.
 */

import type { ItemBarang, PaymentMethod } from "@/lib/transactions";

/** piutang = orang lain berutang pada pengguna · utang = pengguna berutang. */
export type KasbonTipe = "piutang" | "utang";

/** Penanda pada kartu entri Catat — cukup untuk memberi label yang jujur. */
export interface KasbonRingkas {
  tipe: KasbonTipe;
  pihak: string | null;
  lunas: boolean;
}

/** Satu baris di kartu "Kasbon belum lunas" (Laporan). */
export interface KasbonItem {
  id: string;
  tipe: KasbonTipe;
  pihak: string | null;
  amount: number;
  kategori: string;
  catatan: string | null;
  occurredAt: string; // ISO
  items: ItemBarang[] | null;
}

/** GET /api/kasbon. Total dihitung server — layar tidak menjumlah sendiri. */
export interface KasbonDaftar {
  piutang: KasbonItem[];
  utang: KasbonItem[];
  totalPiutang: number;
  totalUtang: number;
}

/**
 * PATCH /api/kasbon/:id. `catat: false` = "Sudah kucatat": pelunasannya sudah
 * diucapkan di Catat, jadi yang ditutup hanya kasbonnya — membuat transaksi
 * lagi berarti menghitung uang yang sama dua kali.
 */
export interface LunasiKasbon {
  aksi: "lunas";
  catat: boolean;
  metode?: PaymentMethod;
}
