import type { SupabaseClient } from "@supabase/supabase-js";
import { bulanWib } from "@/lib/wib";
import {
  KUOTA_BULANAN,
  MASA_COBA_HARI,
  PERIODE_HARI,
  type FiturPremium,
  type Langganan,
  type StatusLangganan,
} from "@/lib/langganan";

/**
 * Sisi server langganan. Seluruh mutasi lewat fungsi Postgres berkunci
 * (migrasi 0027) — alasannya sama dengan kredit sebelumnya: memutuskan hak
 * akses dan uang di JavaScript berarti membaca, memutuskan, lalu menulis,
 * dengan dua celah di antaranya.
 */

interface BarisLangganan {
  status: StatusLangganan;
  berakhir_at: string | null;
  coba_dipakai: boolean;
}

function keLangganan(b: BarisLangganan | null): Langganan {
  if (!b) {
    return { status: "tidak_aktif", berakhirAt: null, cobaDipakai: false };
  }
  return {
    status: b.status,
    berakhirAt: b.berakhir_at,
    cobaDipakai: b.coba_dipakai,
  };
}

/**
 * Status langganan seseorang.
 *
 * MELEMPAR bila pembacaan gagal — sengaja. Mengembalikan "tidak_aktif" saat
 * database tersendat akan mencabut akses pelanggan yang sudah membayar dan
 * menyodorkan ajakan berlangganan kepada orang yang baru saja berlangganan.
 * Kegagalan harus terbaca sebagai kegagalan, bukan menyamar jadi "belum bayar"
 * (kontrak tiga-keadaan, §P0-1).
 */
export async function statusLangganan(
  supa: SupabaseClient,
  uid: string,
): Promise<Langganan> {
  const { data, error } = await supa
    .from("subscriptions")
    .select("status, berakhir_at, coba_dipakai")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;

  const l = keLangganan(data as BarisLangganan | null);

  // Tanggal yang sudah lewat tapi belum tersapu cron: diperlakukan tidak aktif
  // di sini juga. Penyapu harian mengurus BARISNYA; pembacaan ini mengurus
  // JAWABANNYA, dan jawaban tidak boleh menunggu cron berikutnya.
  if (l.status !== "tidak_aktif" && l.berakhirAt) {
    if (new Date(l.berakhirAt).getTime() <= Date.now()) {
      return { status: "tidak_aktif", berakhirAt: null, cobaDipakai: l.cobaDipakai };
    }
  }
  return l;
}

/**
 * Mulai masa coba 7 hari. Idempoten: dipanggil berkali-kali hanya menghasilkan
 * satu masa coba seumur akun (ditegakkan `on conflict do nothing` + kolom
 * `coba_dipakai` yang tidak pernah direset).
 */
export async function mulaiMasaCoba(
  supa: SupabaseClient,
  uid: string,
): Promise<Langganan> {
  const { data, error } = await supa.rpc("langganan_mulai_coba", {
    p_user: uid,
    p_hari: MASA_COBA_HARI,
  });
  if (error) throw error;
  const baris = Array.isArray(data) ? (data[0] as BarisLangganan) : null;
  return keLangganan(baris);
}

/** Perpanjang 30 hari dari SISA yang masih berjalan. Return tanggal berakhir. */
export async function perpanjangLangganan(
  supa: SupabaseClient,
  uid: string,
  sumber: "midtrans" | "manual",
  hari: number = PERIODE_HARI,
): Promise<string> {
  const { data, error } = await supa.rpc("langganan_perpanjang", {
    p_user: uid,
    p_hari: hari,
    p_sumber: sumber,
  });
  if (error) throw error;
  return String(data);
}

export type HasilKuota =
  | { boleh: true; sisa: number }
  /** Pagar anti-abuse tersentuh. Bukan "kehabisan jatah" — pengguna normal
   *  tidak pernah sampai ke sini. */
  | { boleh: false; batas: number };

/**
 * Catat satu pemakaian fitur premium dan periksa pagar dalam satu langkah
 * berkunci. Dipanggil SEBELUM pekerjaan mahal dimulai.
 */
export async function pakaiKuota(
  supa: SupabaseClient,
  uid: string,
  fitur: FiturPremium,
): Promise<HasilKuota> {
  const batas = KUOTA_BULANAN[fitur];
  const { data, error } = await supa.rpc("premium_pakai", {
    p_user: uid,
    p_fitur: fitur,
    p_bulan: bulanWib(),
    p_batas: batas,
  });
  if (error) throw error;
  if (data === null || data === undefined) return { boleh: false, batas };
  return { boleh: true, sisa: Number(data) };
}

/** Pemakaian bulan berjalan — untuk keterangan kecil di /premium saja. */
export async function pemakaianBulanIni(
  supa: SupabaseClient,
  uid: string,
): Promise<Record<FiturPremium, number>> {
  const { data, error } = await supa
    .from("premium_usage")
    .select("riset, konten")
    .eq("user_id", uid)
    .eq("bulan_wib", bulanWib())
    .maybeSingle();
  if (error) throw error;
  return {
    riset: Number(data?.riset ?? 0),
    konten: Number(data?.konten ?? 0),
  };
}
