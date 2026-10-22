/** Pembungkus klien Kesiapan Catatan (Batch 4). Semantik demo/offline sama
 *  dengan API lain — lihat `lib/api/panggil`. */

import { panggil, type ApiHasil } from "@/lib/api/panggil";
import type { KesiapanResponse, TonggakToast } from "@/lib/kesiapan/server";

export type { KesiapanResponse, TonggakToast };

export function ambilKesiapan(): Promise<ApiHasil<KesiapanResponse>> {
  return panggil("/api/kesiapan");
}

/** Tandai toast tonggak sudah tampil — sekali seumur akun (0034). */
export function tandaiTonggak(
  tingkat: TonggakToast,
): Promise<ApiHasil<{ ok: true }>> {
  return panggil("/api/kesiapan/tonggak", {
    method: "POST",
    body: JSON.stringify({ tingkat }),
  });
}

export function kalimatTonggak(tingkat: TonggakToast): string {
  return tingkat === "siap6"
    ? "Catatanmu sudah 6 bulan rutin — Berkas Pengajuan 6 bulan penuh sudah bisa dibuat."
    : "Catatanmu sudah 3 bulan rutin — cukup untuk Berkas Pengajuan.";
}
