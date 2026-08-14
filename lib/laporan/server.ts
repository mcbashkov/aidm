/**
 * Perhitungan laporan di sisi server (§7.3 / §9.3).
 *
 * Semua agregasi dilakukan Postgres — `daily_rollups` untuk ringkasan & grafik
 * (O(hari), bukan O(transaksi)) dan RPC `laporan_kategori` untuk rincian
 * kategori (GROUP BY, migrasi 0015). Node hanya menyusun bentuk akhirnya.
 * §7.3 melarang keras menarik seluruh transaksi ke luar database untuk
 * dijumlahkan di tempat lain.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { kategoriLabel, type Jenis } from "@/lib/transactions";
import { getKategoriMaps } from "@/lib/catat/server";
import {
  rentangTanggal,
  rentangSebelumnya,
  isoAwalHariWib,
  type RentangTanggal,
} from "@/lib/laporan/periode";
import {
  RINGKASAN_KOSONG,
  type BarisKategori,
  type Ringkasan,
  type SealState,
  type TitikHarian,
} from "@/lib/laporan/types";

interface RollupRow {
  tanggal: string;
  total_masuk: number;
  total_keluar: number;
  jml_transaksi: number;
  masuk_terverifikasi: number;
}

/** Baris rollup harian dalam rentang tanggal WIB, urut menaik. */
export async function ambilRollups(
  supa: SupabaseClient,
  userId: string,
  rentang: RentangTanggal,
): Promise<RollupRow[]> {
  let q = supa
    .from("daily_rollups")
    .select("tanggal, total_masuk, total_keluar, jml_transaksi, masuk_terverifikasi")
    .eq("user_id", userId);
  if (rentang.start) q = q.gte("tanggal", rentang.start);
  if (rentang.end) q = q.lt("tanggal", rentang.end);
  const { data } = await q.order("tanggal", { ascending: true });
  return (data ?? []) as RollupRow[];
}

export function ringkasDariRollups(rows: RollupRow[]): Ringkasan {
  let masuk = 0;
  let keluar = 0;
  let jmlTransaksi = 0;
  let masukTerverifikasi = 0;
  let hariAktif = 0;

  for (const r of rows) {
    masuk += r.total_masuk;
    keluar += r.total_keluar;
    jmlTransaksi += r.jml_transaksi;
    masukTerverifikasi += r.masuk_terverifikasi;
    // Baris rollup bisa tersisa bernilai nol setelah entri hari itu dihapus;
    // hari seperti itu bukan hari tercatat.
    if (r.jml_transaksi > 0) hariAktif += 1;
  }

  return {
    masuk,
    keluar,
    sisa: masuk - keluar,
    jmlTransaksi,
    hariAktif,
    masukTerverifikasi,
    rasioTerverifikasi: masuk > 0 ? masukTerverifikasi / masuk : 0,
  };
}

/** Deret harian untuk grafik arus kas (§7.3 #3) — hari tanpa transaksi
 *  sengaja TIDAK diisi nol: sumbu waktu grafik yang menentukan jaraknya. */
export function seriesDariRollups(rows: RollupRow[]): TitikHarian[] {
  return rows
    .filter((r) => r.jml_transaksi > 0)
    .map((r) => ({
      tanggal: r.tanggal,
      masuk: r.total_masuk,
      keluar: r.total_keluar,
    }));
}

interface KategoriRow {
  jenis: Jenis;
  kategori_id: string | null;
  total: number;
  jml: number;
}

/** Rincian kategori per jenis, `limit` teratas (§7.3 #4). */
export async function breakdownKategori(
  supa: SupabaseClient,
  userId: string,
  rentang: RentangTanggal,
  limit = 5,
): Promise<{ masuk: BarisKategori[]; keluar: BarisKategori[] }> {
  const [{ data }, maps] = await Promise.all([
    supa.rpc("laporan_kategori", {
      p_user: userId,
      p_start: rentang.start ? isoAwalHariWib(rentang.start) : null,
      p_end: rentang.end ? isoAwalHariWib(rentang.end) : null,
    }),
    getKategoriMaps(supa),
  ]);

  const rows = (data ?? []) as KategoriRow[];

  function susun(jenis: Jenis): BarisKategori[] {
    const milik = rows.filter((r) => r.jenis === jenis);
    const total = milik.reduce((s, r) => s + Number(r.total), 0);
    return milik
      .map((r) => {
        const slug =
          (r.kategori_id && maps.byId.get(r.kategori_id)) || "lainnya";
        return {
          slug,
          nama: kategoriLabel(jenis, slug),
          total: Number(r.total),
          persen: total > 0 ? Number(r.total) / total : 0,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  return { masuk: susun("masuk"), keluar: susun("keluar") };
}

/**
 * Baris kategori untuk KANONIKALISASI (§17.2) — beda dari breakdownKategori:
 * TANPA batas top-N, TANPA persen (float dilarang di payload hash), dan
 * urutannya leksikografis (jenis, slug) bukan berdasar besaran. Hash harus
 * menangkap SELURUH data, bukan potongan yang enak ditampilkan.
 */
export async function kategoriKanonik(
  supa: SupabaseClient,
  userId: string,
  rentang: RentangTanggal,
): Promise<{ jenis: Jenis; jml: number; slug: string; total: number }[]> {
  const [{ data }, maps] = await Promise.all([
    supa.rpc("laporan_kategori", {
      p_user: userId,
      p_start: rentang.start ? isoAwalHariWib(rentang.start) : null,
      p_end: rentang.end ? isoAwalHariWib(rentang.end) : null,
    }),
    getKategoriMaps(supa),
  ]);
  return ((data ?? []) as KategoriRow[])
    .map((r) => ({
      jenis: r.jenis,
      jml: r.jml,
      slug: (r.kategori_id && maps.byId.get(r.kategori_id)) || "lainnya",
      total: Number(r.total),
    }))
    .sort((a, b) =>
      a.jenis !== b.jenis
        ? a.jenis.localeCompare(b.jenis)
        : a.slug.localeCompare(b.slug),
    );
}

/**
 * Status segel periode (§7.5) — baris `is_latest` terbaru. Sengaja
 * order+limit(1), BUKAN maybeSingle: jendela singkat saat segel ulang bisa
 * menyisakan dua baris is_latest, dan maybeSingle akan error (lalu terbaca
 * "belum tersegel" — bohong) justru pada momen user sedang menyegel.
 */
export async function statusSegel(
  supa: SupabaseClient,
  userId: string,
  period: string,
): Promise<SealState> {
  const { data } = await supa
    .from("report_seals")
    .select("report_hash, tx_hash, sealed_at, status")
    .eq("user_id", userId)
    .eq("period_key", period)
    .eq("is_latest", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const baris = data?.[0];
  if (!baris) return { status: "belum" };
  return {
    status:
      baris.status === "confirmed"
        ? "tersegel"
        : baris.status === "failed"
          ? "belum"
          : "pending",
    hash: baris.report_hash ?? undefined,
    txHash: baris.tx_hash ?? undefined,
    sealedAt: baris.sealed_at ?? undefined,
  };
}

/** Jumlah bulan berbeda yang pernah punya catatan (§7.9 progres valuasi). */
export async function bulanTercatat(
  supa: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data } = await supa.rpc("laporan_bulanan", {
    p_user: userId,
    p_start: null,
    p_end: null,
  });
  const rows = (data ?? []) as { bulan: string; jml_transaksi: number }[];
  return rows.filter((r) => r.jml_transaksi > 0).length;
}

/** Ringkasan periode pembanding, atau null bila periode tak punya pembanding. */
export async function ringkasSebelumnya(
  supa: SupabaseClient,
  userId: string,
  period: string,
): Promise<Ringkasan | null> {
  const rentang = rentangSebelumnya(period);
  if (!rentang) return null;
  const rows = await ambilRollups(supa, userId, rentang);
  return rows.length === 0 ? RINGKASAN_KOSONG : ringkasDariRollups(rows);
}

export { rentangTanggal };
