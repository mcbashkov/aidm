/**
 * Agregasi data Berkas Pengajuan (§1.5): N bulan penuh yang berakhir di BULAN
 * LALU — bulan berjalan belum lengkap, dan bank membaca bulan utuh. Bulanan
 * dari RPC `laporan_bulanan` (0015), harian dari `daily_rollups`, rincian dari
 * `transactions` confirmed. Kasbon aktif TIDAK masuk — konsisten dengan §7k:
 * uang yang belum berpindah bukan catatan arus kas.
 *
 * Tidak ada kata "laba" di mana pun: angkanya arus kas (sisa uang).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { geserBulan } from "@/lib/kesiapan/hitung";
import { kategoriLabel, type Jenis } from "@/lib/transactions";

export interface BulanBerkas {
  bulan: string; // YYYY-MM
  masuk: number;
  keluar: number;
  sisa: number;
  hariAktif: number;
  jmlTransaksi: number;
}

export interface TransaksiRingkas {
  tanggal: string; // YYYY-MM-DD WIB
  keterangan: string;
  masuk: number;
  keluar: number;
}

export interface DataBerkas {
  usaha: { nama: string; kota: string | null; kategori: string | null };
  earnerType: string | null;
  periodeAwal: string; // YYYY-MM
  periodeAkhir: string; // YYYY-MM
  bulanan: BulanBerkas[]; // urut naik, SETIAP bulan ada walau kosong
  total: { masuk: number; keluar: number; sisa: number; hariAktif: number; jmlTransaksi: number };
  /** Rincian per bulan, kunci YYYY-MM; bulan tanpa catatan → []. */
  rincian: Record<string, TransaksiRingkas[]>;
}

/** Batas baris rincian per bulan di PDF — di atas ini dokumen jadi buku. */
export const RINCIAN_MAKS_PER_BULAN = 400;

/** Rentang N bulan penuh yang berakhir di bulan sebelum `bulanIni`. */
export function periodeBerkas(bulanIni: string, bulan: 6 | 12): { awal: string; akhir: string } {
  const akhir = geserBulan(bulanIni, 1);
  const awal = geserBulan(bulanIni, bulan);
  return { awal, akhir };
}

function tanggalWibDari(iso: string): string {
  // occurred_at dipatok 12:00 WIB oleh jalur tulis, jadi pergeseran +7 jam
  // selalu mendarat di tanggal WIB yang benar.
  return new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

export async function ambilDataBerkas(
  supa: SupabaseClient,
  userId: string,
  bulan: 6 | 12,
  bulanIni: string,
): Promise<DataBerkas> {
  const { awal, akhir } = periodeBerkas(bulanIni, bulan);
  const tglAwal = `${awal}-01`;
  const tglBatas = `${bulanIni}-01`; // eksklusif

  const [profil, bulananRaw, rows] = await Promise.all([
    supa
      .from("users")
      .select("nama_usaha, kota, earner_type, categories:kategori_id(nama)")
      .eq("id", userId)
      .maybeSingle(),
    supa.rpc("laporan_bulanan", { p_user: userId, p_start: tglAwal, p_end: tglBatas }),
    supa
      .from("transactions")
      .select("occurred_at, catatan, jenis, amount, kategori_id, categories:kategori_id(slug)")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .gte("occurred_at", `${tglAwal}T00:00:00+07:00`)
      .lt("occurred_at", `${tglBatas}T00:00:00+07:00`)
      .order("occurred_at", { ascending: true })
      .limit(RINCIAN_MAKS_PER_BULAN * bulan),
  ]);
  if (bulananRaw.error) throw bulananRaw.error;
  if (rows.error) throw rows.error;

  const u = profil.data as {
    nama_usaha: string | null; kota: string | null; earner_type: string | null;
    categories: { nama?: string } | { nama?: string }[] | null;
  } | null;
  const katRel = u?.categories;
  const kategori = Array.isArray(katRel) ? katRel[0]?.nama ?? null : katRel?.nama ?? null;

  const perBulan = new Map<string, BulanBerkas>();
  for (const r of (bulananRaw.data ?? []) as {
    bulan: string; total_masuk: number; total_keluar: number; jml_transaksi: number; hari_aktif: number;
  }[]) {
    perBulan.set(r.bulan, {
      bulan: r.bulan,
      masuk: Number(r.total_masuk),
      keluar: Number(r.total_keluar),
      sisa: Number(r.total_masuk) - Number(r.total_keluar),
      hariAktif: r.hari_aktif,
      jmlTransaksi: r.jml_transaksi,
    });
  }
  // Setiap bulan ADA, walau kosong — bulan kosong tidak disembunyikan (§1.5 #3).
  const bulanan: BulanBerkas[] = [];
  const rincian: Record<string, TransaksiRingkas[]> = {};
  for (let i = bulan - 1; i >= 0; i--) {
    const b = geserBulan(akhir, i);
    bulanan.push(perBulan.get(b) ?? { bulan: b, masuk: 0, keluar: 0, sisa: 0, hariAktif: 0, jmlTransaksi: 0 });
    rincian[b] = [];
  }

  for (const r of (rows.data ?? []) as {
    occurred_at: string; catatan: string | null; jenis: Jenis; amount: number;
    categories: { slug?: string } | { slug?: string }[] | null;
  }[]) {
    const tgl = tanggalWibDari(r.occurred_at);
    const b = tgl.slice(0, 7);
    const daftar = rincian[b];
    if (!daftar || daftar.length >= RINCIAN_MAKS_PER_BULAN) continue;
    const rel = r.categories;
    const slug = (Array.isArray(rel) ? rel[0]?.slug : rel?.slug) ?? "lainnya";
    const label = kategoriLabel(r.jenis, slug);
    const ket = r.catatan?.trim() ? `${label} — ${r.catatan.trim()}` : label;
    daftar.push({
      tanggal: tgl,
      keterangan: ket.slice(0, 80),
      masuk: r.jenis === "masuk" ? r.amount : 0,
      keluar: r.jenis === "keluar" ? r.amount : 0,
    });
  }

  const total = bulanan.reduce(
    (t, b) => ({
      masuk: t.masuk + b.masuk,
      keluar: t.keluar + b.keluar,
      sisa: t.sisa + b.sisa,
      hariAktif: t.hariAktif + b.hariAktif,
      jmlTransaksi: t.jmlTransaksi + b.jmlTransaksi,
    }),
    { masuk: 0, keluar: 0, sisa: 0, hariAktif: 0, jmlTransaksi: 0 },
  );

  return {
    usaha: { nama: u?.nama_usaha?.trim() || "Usaha tanpa nama", kota: u?.kota ?? null, kategori },
    earnerType: u?.earner_type ?? null,
    periodeAwal: awal,
    periodeAkhir: akhir,
    bulanan,
    total,
    rincian,
  };
}
