/**
 * Mesin progres misi (§7.6) — sisi server.
 *
 * **Progres DITURUNKAN, tidak disimpan.** Setiap pembacaan menghitung ulang
 * dari tabel sumber (`transactions`, `users`, `report_seals`). Konsekuensinya
 * persis yang diminta AC §7.6: menghapus transaksi langsung menurunkan progres,
 * tanpa satu baris pemeliharaan pun di jalur hapus/edit/sinkron-offline.
 *
 * Yang DISIMPAN hanyalah klaim (`mission_claims`) — karena itu peristiwa
 * finansial yang tidak boleh dihitung ulang, dan sudah terlanjur jadi transaksi
 * on-chain.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_MISSIONS,
  CAP_HARIAN_IDMX,
  CAP_BULANAN_IDMX,
  ikutCapHarian,
  type DefaultMission,
  type MisiProgress,
  type MisiResponse,
} from "@/lib/missions";
import type { KodeGalatKlaim } from "@/lib/missions/galat";
import { todayWib } from "@/lib/wib";
import { geserHari } from "@/lib/laporan/periode";

interface BarisHarian {
  tanggal: string; // YYYY-MM-DD (WIB)
  jml: number;
}

/** Hitungan transaksi unik-valid per hari (§7.6 anti-abuse) — RPC 0017. */
export async function hitungHarian(
  supa: SupabaseClient,
  userId: string,
  mulai: string,
): Promise<Map<string, number>> {
  const { data } = await supa.rpc("misi_hitung_harian", {
    p_user: userId,
    p_start: mulai,
    p_end: null,
  });
  const peta = new Map<string, number>();
  for (const r of (data ?? []) as BarisHarian[]) peta.set(r.tanggal, r.jml);
  return peta;
}

/**
 * Runtun hari mencatat yang masih hidup. Dihitung mundur dari hari ini; bila
 * hari ini belum ada catatan, runtun kemarin masih dianggap hidup — kalau
 * tidak, runtun setiap orang "putus" tiap tengah malam sampai ia sempat
 * mencatat, dan angka di layar akan terasa berbohong.
 */
export function hitungRuntun(peta: Map<string, number>, hariIni: string): number {
  let mulai = hariIni;
  if (!(peta.get(hariIni) ?? 0)) {
    const kemarin = geserHari(hariIni, -1);
    if (!(peta.get(kemarin) ?? 0)) return 0;
    mulai = kemarin;
  }
  let runtun = 0;
  let kursor = mulai;
  // Batas 400 hari: penjaga agar data aneh tidak membuat loop tak berujung.
  while (runtun < 400 && (peta.get(kursor) ?? 0) > 0) {
    runtun += 1;
    kursor = geserHari(kursor, -1);
  }
  return runtun;
}

/** Nomor pekan ISO dalam bentuk 'YYYY-Www' dari tanggal WIB. */
export function pekanIso(tanggal: string): string {
  const [y, m, d] = tanggal.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  // ISO: pekan dimiliki oleh hari Kamis-nya.
  const hari = (t.getUTCDay() + 6) % 7; // Senin = 0
  t.setUTCDate(t.getUTCDate() - hari + 3);
  const kamis = t.getTime();
  const awalTahun = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const hariAwal = (awalTahun.getUTCDay() + 6) % 7;
  awalTahun.setUTCDate(awalTahun.getUTCDate() - hariAwal + 3);
  const pekan =
    1 + Math.round((kamis - awalTahun.getTime()) / (7 * 86_400_000));
  return `${t.getUTCFullYear()}-W${String(pekan).padStart(2, "0")}`;
}

/** Bulan sebelumnya dari tanggal WIB, sebagai 'YYYY-MM'. */
export function bulanLalu(tanggal: string): string {
  const [y, m] = tanggal.slice(0, 7).split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** Kunci periode klaim per tipe misi. */
export function periodKey(m: DefaultMission, hariIni: string): string {
  if (m.tipe === "daily") return hariIni;
  if (m.tipe === "weekly") return pekanIso(hariIni);
  if (m.tipe === "monthly") return bulanLalu(hariIni);
  return "once";
}

interface KlaimRow {
  mission_id: string;
  period_key: string | null;
  amount_idmx: number;
  status: "queued" | "sending" | "submitted" | "confirmed" | "failed" | "signed";
  tx_hash: string | null;
  created_at: string;
}

/**
 * Evaluasi seluruh misi untuk satu user. `klaimSiap` diteruskan pemanggil —
 * lib ini tidak membaca env kontrak supaya tetap murni & mudah diuji.
 */
export async function evaluasiMisi(
  supa: SupabaseClient,
  userId: string,
  klaimSiap: boolean,
  now = new Date(),
): Promise<MisiResponse> {
  const hariIni = todayWib(now);
  const bulanTarget = bulanLalu(hariIni);

  const [peta, { data: user }, { data: segel }, { data: misiDb }, { data: klaim }] =
    await Promise.all([
      // 60 hari cukup untuk runtun 7 hari + ruang pemeriksaan; menarik seluruh
      // riwayat tidak menambah informasi apa pun untuk misi yang ada.
      hitungHarian(supa, userId, geserHari(hariIni, -60)),
      supa
        .from("users")
        .select("nama_usaha, kategori_id, kota, earner_type")
        .eq("id", userId)
        .maybeSingle(),
      supa
        .from("report_seals")
        .select("period_key")
        .eq("user_id", userId)
        .eq("period_key", bulanTarget)
        .eq("status", "confirmed")
        .limit(1),
      supa.from("missions").select("id, code, reward_idmx, tipe, aktif"),
      supa
        .from("mission_claims")
        .select("mission_id, period_key, amount_idmx, status, tx_hash, created_at")
        .eq("user_id", userId)
        .neq("status", "failed"),
    ]);

  const misiById = new Map<string, { code: string }>();
  const misiByCode = new Map<string, { id: string; reward: number; aktif: boolean }>();
  for (const r of (misiDb ?? []) as {
    id: string;
    code: string;
    reward_idmx: number;
    tipe: string;
    aktif: boolean;
  }[]) {
    misiById.set(r.id, { code: r.code });
    misiByCode.set(r.code, {
      id: r.id,
      reward: Number(r.reward_idmx),
      aktif: r.aktif,
    });
  }

  const klaimRows = (klaim ?? []) as KlaimRow[];
  const klaimByKunci = new Map<string, KlaimRow>();
  for (const k of klaimRows) {
    const kode = misiById.get(k.mission_id)?.code;
    if (kode) klaimByKunci.set(`${kode}|${k.period_key ?? ""}`, k);
  }

  // Cap dihitung dari klaim yang benar-benar tercatat hari ini (WIB).
  let capHarianTerpakai = 0;
  let capBulananTerpakai = 0;
  for (const k of klaimRows) {
    const kode = misiById.get(k.mission_id)?.code;
    const def = DEFAULT_MISSIONS.find((d) => d.code === kode);
    if (!def) continue;
    if (ikutCapHarian(def.tipe)) {
      if (todayWib(new Date(k.created_at)) === hariIni) {
        capHarianTerpakai += Number(k.amount_idmx);
      }
    } else if (k.period_key === bulanTarget) {
      capBulananTerpakai += Number(k.amount_idmx);
    }
  }

  const jmlHariIni = peta.get(hariIni) ?? 0;
  const runtun = hitungRuntun(peta, hariIni);
  const profilLengkap = Boolean(
    user?.nama_usaha?.trim() &&
      user?.kategori_id &&
      user?.kota?.trim() &&
      user?.earner_type,
  );
  const sudahSegel = ((segel ?? []) as unknown[]).length > 0;

  function progresUntuk(code: string): number {
    if (code === "first_tx_today" || code === "five_tx_today") return jmlHariIni;
    if (code === "streak_7_days") return runtun;
    if (code === "seal_monthly_report") return sudahSegel ? 1 : 0;
    if (code === "complete_profile") return profilLengkap ? 1 : 0;
    return 0;
  }

  const misi: MisiProgress[] = DEFAULT_MISSIONS.filter(
    // Misi yang dinonaktifkan admin tidak ditampilkan; baris DB adalah otoritas
    // aktif/tidaknya, sedangkan daftar di kode adalah otoritas cara menghitung.
    (d) => misiByCode.get(d.code)?.aktif !== false,
  ).map((d) => {
    const kunci = periodKey(d, hariIni);
    const k = klaimByKunci.get(`${d.code}|${kunci}`);
    const progress = Math.min(progresUntuk(d.code), d.target);
    const selesai = progress >= d.target;
    // Reward diambil dari DB bila ada (admin bisa mengubah tanpa deploy, §16 #7).
    const reward = misiByCode.get(d.code)?.reward ?? d.reward;

    // Kode dan kalimatnya lahir bersama: endpoint klaim menolak dengan kode
    // ini, layar mematikan tombolnya dari kode yang sama. Kalimat di sini lebih
    // spesifik daripada pesan generik taksonomi (menyebut angka capnya), jadi
    // yang dikirim ke layar tetap kalimat ini.
    let alasanTerkunci: string | undefined;
    let kodeTerkunci: KodeGalatKlaim | undefined;
    if (selesai && !k) {
      if (!klaimSiap) {
        kodeTerkunci = "CLAIM_NOT_CONFIGURED";
        alasanTerkunci = "Klaim on-chain belum aktif di server ini.";
      } else if (
        ikutCapHarian(d.tipe) &&
        capHarianTerpakai + reward > CAP_HARIAN_IDMX
      ) {
        kodeTerkunci = "DAILY_QUOTA_EXCEEDED";
        alasanTerkunci = `Batas ${CAP_HARIAN_IDMX} IDMX/hari sudah tercapai. Coba lagi besok.`;
      } else if (
        !ikutCapHarian(d.tipe) &&
        capBulananTerpakai + reward > CAP_BULANAN_IDMX
      ) {
        kodeTerkunci = "MONTHLY_QUOTA_EXCEEDED";
        alasanTerkunci = `Batas misi bulanan ${CAP_BULANAN_IDMX} IDMX sudah tercapai.`;
      }
    }

    return {
      ...d,
      reward,
      progress,
      selesai,
      periodKey: kunci,
      diklaim: Boolean(k),
      txHash: k?.tx_hash ?? undefined,
      statusKlaim: k?.status,
      alasanTerkunci,
      kodeTerkunci,
    };
  });

  return {
    misi,
    capHarian: { terpakai: capHarianTerpakai, batas: CAP_HARIAN_IDMX },
    capBulanan: { terpakai: capBulananTerpakai, batas: CAP_BULANAN_IDMX },
    klaimSiap,
  };
}
