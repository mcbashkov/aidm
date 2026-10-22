/**
 * Pembungkus klien API kasbon (Batch 2). Semantik demo/offline sama dengan
 * seluruh API lain — lihat `lib/api/panggil`.
 */

import { panggil, type ApiHasil } from "@/lib/api/panggil";
import type { PaymentMethod } from "@/lib/transactions";
import type { KasbonDaftar } from "@/lib/kasbon/tipe";

export function daftarKasbon(): Promise<ApiHasil<KasbonDaftar>> {
  return panggil("/api/kasbon");
}

/**
 * `catat: true` membuat transaksi pelunasan hari ini; `false` ("Sudah
 * kucatat") hanya menutup kasbonnya. Selalu dikirim eksplisit — server
 * menolak permintaan tanpa pilihan ini.
 */
export function lunasiKasbon(
  id: string,
  catat: boolean,
  metode: PaymentMethod,
): Promise<ApiHasil<{ ok: true; transaction_id: string | null }>> {
  return panggil(`/api/kasbon/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ aksi: "lunas", catat, metode }),
  });
}

export function hapusKasbon(id: string): Promise<ApiHasil<{ ok: true }>> {
  return panggil(`/api/kasbon/${id}`, { method: "DELETE" });
}
