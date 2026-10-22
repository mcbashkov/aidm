/**
 * Kesiapan Catatan — sisi server (Batch 4, §1.4). Mengumpulkan masukan dari
 * database lalu menyerahkannya ke fungsi murni `hitungKesiapan`; tidak ada
 * aritmetika tingkat di berkas ini.
 *
 * Cache: per pengguna per hari WIB, di dalam proses. Hasilnya hanya berubah
 * bila ada baris rollup baru (catat, konfirmasi, edit/hapus, pelunasan
 * kasbon) atau profil berubah; jalur tulis memanggil `hapusCacheKesiapan`.
 * Di serverless cache ini per-instance — yang terlewat hanya berarti dihitung
 * ulang (tiga query ringan), bukan jawaban yang salah. Tabel cache sengaja
 * tidak dibuat: ia menambah jalur tulis untuk menghemat tiga query.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { todayWib } from "@/lib/wib";
import {
  geserBulan,
  hitungKesiapan,
  JENDELA_BULAN,
  KASBON_MENGGANTUNG_HARI,
  labelBerkas,
  type HasilKesiapan,
  type RollupHari,
  type Tingkat,
} from "@/lib/kesiapan/hitung";

export type TonggakToast = Extract<Tingkat, "siap3" | "siap6">;

export interface KesiapanResponse extends HasilKesiapan {
  earnerType: string | null;
  /** "Riwayat Pendapatan" / "Bukti Penghasilan" / "Berkas Usaha" (§1.2). */
  labelBerkas: string;
  /** Tonggak yang tercapai dan toast-nya belum pernah tampil (0034). */
  tonggakBaru: TonggakToast | null;
  /** Hari WIB saat dihitung. */
  pada: string;
}

const cache = new Map<string, { hari: string; hasil: KesiapanResponse }>();

export function hapusCacheKesiapan(userId: string): void {
  cache.delete(userId);
}

export async function ambilKesiapan(
  supa: SupabaseClient,
  userId: string,
): Promise<KesiapanResponse> {
  const today = todayWib();
  const c = cache.get(userId);
  if (c && c.hari === today) return c.hasil;

  const bulanIni = today.slice(0, 7);
  const awalJendela = `${geserBulan(bulanIni, JENDELA_BULAN - 1)}-01`;
  const batasMenggantung = new Date(
    Date.now() - KASBON_MENGGANTUNG_HARI * 86_400_000,
  ).toISOString();

  const [rollups, profil, kasbon, tonggak] = await Promise.all([
    supa
      .from("daily_rollups")
      .select("tanggal, total_masuk, total_keluar, jml_transaksi")
      .eq("user_id", userId)
      .gte("tanggal", awalJendela)
      .order("tanggal", { ascending: true }),
    supa
      .from("users")
      .select("earner_type, nama_usaha, kota, kategori_id")
      .eq("id", userId)
      .maybeSingle(),
    supa
      .from("kasbon")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "aktif")
      .lt("occurred_at", batasMenggantung),
    supa.from("kesiapan_tonggak").select("tingkat").eq("user_id", userId),
  ]);
  if (rollups.error) throw rollups.error;

  const u = profil.data as {
    earner_type: string | null;
    nama_usaha: string | null;
    kota: string | null;
    kategori_id: string | null;
  } | null;

  const hasil = hitungKesiapan({
    today,
    rollups: (rollups.data ?? []) as RollupHari[],
    profilLengkap: Boolean(
      u?.nama_usaha?.trim() && u?.kota?.trim() && u?.kategori_id,
    ),
    // Kasbon gagal dibaca → dianggap tidak ada: ia item informasi, bukan syarat.
    kasbonMenggantung: kasbon.error ? 0 : (kasbon.count ?? 0),
  });

  const sudah = new Set(
    ((tonggak.data ?? []) as { tingkat: string }[]).map((r) => r.tingkat),
  );
  // Hanya tingkat yang SEDANG dicapai yang punya toast: naik ke siap6 tanpa
  // pernah melihat toast siap3 cukup satu toast — yang tertinggi.
  let tonggakBaru: TonggakToast | null = null;
  if (hasil.tingkat === "siap6" && !sudah.has("siap6")) tonggakBaru = "siap6";
  else if (hasil.tingkat === "siap3" && !sudah.has("siap3")) tonggakBaru = "siap3";

  const res: KesiapanResponse = {
    ...hasil,
    earnerType: u?.earner_type ?? null,
    labelBerkas: labelBerkas(u?.earner_type),
    tonggakBaru,
    pada: today,
  };
  cache.set(userId, { hari: today, hasil: res });
  return res;
}
