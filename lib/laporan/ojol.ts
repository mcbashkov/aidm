/**
 * Rekap peran ojol untuk Laporan & Berkas (PERINTAH-AGEN-PREMIUM §Batch 10):
 * pemasukan `ojek` per platform (kotor), pengeluaran kendaraan per sub, dan
 * "bersih harian rata-rata" = (pemasukan − pengeluaran usaha) ÷ hari aktif.
 * Agregasi di Postgres (RPC 0039); Node hanya menyusun bentuknya.
 *
 * Tanpa kata "laba" — ini arus kas per hari aktif, bukan laba.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LABEL_PLATFORM, LABEL_SUB_KENDARAAN, PLATFORM_OJOL, SUB_KENDARAAN, type PlatformOjol, type SubKendaraan } from "@/lib/parse/platform";

export interface BarisPlatform {
  platform: PlatformOjol | null;
  label: string;
  total: number;
  jml: number;
  persen: number; // 0..1 dari total pemasukan ojek
}

export interface BarisKendaraan {
  sub: SubKendaraan;
  label: string;
  total: number;
  jml: number;
}

export interface RekapOjol {
  platform: BarisPlatform[];
  totalOjek: number;
  kendaraan: BarisKendaraan[];
  totalKendaraan: number;
  /** (pemasukan − pengeluaran usaha) ÷ hari aktif; null bila hari aktif 0. */
  bersihHarianRata: number | null;
  hariAktif: number;
}

export async function rekapOjol(
  supa: SupabaseClient,
  userId: string,
  rentang: { startIso: string | null; endIso: string | null },
  ringkas: { masuk: number; keluar: number; hariAktif: number },
): Promise<RekapOjol> {
  const [p, k] = await Promise.all([
    supa.rpc("laporan_ojol_platform", { p_user: userId, p_start: rentang.startIso, p_end: rentang.endIso }),
    supa.rpc("laporan_ojol_kendaraan", { p_user: userId, p_start: rentang.startIso, p_end: rentang.endIso }),
  ]);
  if (p.error) throw p.error;
  if (k.error) throw k.error;

  const perPlatform = new Map<string, { total: number; jml: number }>();
  for (const r of (p.data ?? []) as { platform: string | null; total: number; jml: number }[]) {
    const kunci = r.platform ?? "";
    const c = perPlatform.get(kunci) ?? { total: 0, jml: 0 };
    c.total += Number(r.total);
    c.jml += r.jml;
    perPlatform.set(kunci, c);
  }
  const totalOjek = [...perPlatform.values()].reduce((s, v) => s + v.total, 0);
  const urutan: (PlatformOjol | null)[] = [...PLATFORM_OJOL, null];
  const platform: BarisPlatform[] = urutan
    .filter((pl) => perPlatform.has(pl ?? ""))
    .map((pl) => {
      const c = perPlatform.get(pl ?? "")!;
      return {
        platform: pl,
        label: pl ? LABEL_PLATFORM[pl] : "Tanpa platform",
        total: c.total,
        jml: c.jml,
        persen: totalOjek > 0 ? c.total / totalOjek : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const perSub = new Map<SubKendaraan, { total: number; jml: number }>();
  for (const r of (k.data ?? []) as { sub: SubKendaraan; total: number; jml: number }[]) {
    const c = perSub.get(r.sub) ?? { total: 0, jml: 0 };
    c.total += Number(r.total);
    c.jml += r.jml;
    perSub.set(r.sub, c);
  }
  const kendaraan: BarisKendaraan[] = SUB_KENDARAAN.filter((s) => perSub.has(s)).map((s) => ({
    sub: s,
    label: LABEL_SUB_KENDARAAN[s],
    total: perSub.get(s)!.total,
    jml: perSub.get(s)!.jml,
  }));
  const totalKendaraan = kendaraan.reduce((s, b) => s + b.total, 0);

  return {
    platform,
    totalOjek,
    kendaraan,
    totalKendaraan,
    bersihHarianRata: ringkas.hariAktif > 0 ? Math.round((ringkas.masuk - ringkas.keluar) / ringkas.hariAktif) : null,
    hariAktif: ringkas.hariAktif,
  };
}
