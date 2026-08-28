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
  ada_masuk: boolean;
  ada_keluar: boolean;
  jml_suara: number;
}

/** Sinyal satu hari pencatatan — cukup untuk SELURUH misi harian sekaligus. */
export interface SinyalHarian {
  jml: number;
  adaMasuk: boolean;
  adaKeluar: boolean;
  jmlSuara: number;
}

const SINYAL_KOSONG: SinyalHarian = {
  jml: 0,
  adaMasuk: false,
  adaKeluar: false,
  jmlSuara: 0,
};

/**
 * Sinyal pencatatan per hari (§7.6 anti-abuse) — RPC 0023.
 *
 * Satu pemindaian menjawab keempat misi pencatatan. Definisi "unik-valid"
 * tidak berubah dari 0017; yang bertambah hanya kolom yang dilaporkan.
 */
export async function hitungHarian(
  supa: SupabaseClient,
  userId: string,
  mulai: string,
): Promise<Map<string, SinyalHarian>> {
  const { data } = await supa.rpc("misi_sinyal_harian", {
    p_user: userId,
    p_start: mulai,
    p_end: null,
  });
  const peta = new Map<string, SinyalHarian>();
  for (const r of (data ?? []) as BarisHarian[]) {
    peta.set(r.tanggal, {
      jml: r.jml,
      adaMasuk: Boolean(r.ada_masuk),
      adaKeluar: Boolean(r.ada_keluar),
      jmlSuara: r.jml_suara ?? 0,
    });
  }
  return peta;
}

/**
 * Runtun hari mencatat yang masih hidup. Dihitung mundur dari hari ini; bila
 * hari ini belum ada catatan, runtun kemarin masih dianggap hidup — kalau
 * tidak, runtun setiap orang "putus" tiap tengah malam sampai ia sempat
 * mencatat, dan angka di layar akan terasa berbohong.
 */
export function hitungRuntun(
  peta: Map<string, SinyalHarian>,
  hariIni: string,
): number {
  const jml = (t: string) => peta.get(t)?.jml ?? 0;
  let mulai = hariIni;
  if (!jml(hariIni)) {
    const kemarin = geserHari(hariIni, -1);
    if (!jml(kemarin)) return 0;
    mulai = kemarin;
  }
  let runtun = 0;
  let kursor = mulai;
  // Batas 400 hari: penjaga agar data aneh tidak membuat loop tak berujung.
  while (runtun < 400 && jml(kursor) > 0) {
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

  const [
    peta,
    { data: user },
    { data: segel },
    { data: misiDb },
    { data: klaim },
    { data: peristiwa },
  ] =
    await Promise.all([
      // 45 hari lebih dari cukup untuk runtun TERPANJANG yang ada (30 hari)
      // plus ruang pemeriksaan. Dinaikkan dari 60 ke 45? Tidak — dinaikkan
      // dari 60 tetap 60 tidak cukup jelas: runtun 30 hari butuh 30 hari
      // penuh, dan 60 memberi kelonggaran dua kali lipat. Menarik seluruh
      // riwayat tetap tidak menambah informasi apa pun untuk misi yang ada.
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
      // Misi yang TIDAK bisa diturunkan dari transaksi — membaca laporan
      // adalah peristiwa, bukan jejak. Satu-satunya misi berbasis event
      // selain segel, dan keduanya memakai tabel + indeks unik yang sama
      // (`uq_mission_events_period`, 0016).
      supa
        .from("mission_events")
        .select("mission_id, progress")
        .eq("user_id", userId),
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

  const hariIniSinyal = peta.get(hariIni) ?? SINYAL_KOSONG;
  const jmlHariIni = hariIniSinyal.jml;
  const runtun = hitungRuntun(peta, hariIni);
  const pekanIniKunci = pekanIso(hariIni);
  // Peristiwa "buka laporan" pekan ini, dari `mission_events`.
  const bacaLaporanPekanIni = ((peristiwa ?? []) as {
    mission_id: string;
    progress: { period_key?: string } | null;
  }[]).some(
    (e) =>
      misiById.get(e.mission_id)?.code === "open_report_weekly" &&
      e.progress?.period_key === pekanIniKunci,
  );
  const profilLengkap = Boolean(
    user?.nama_usaha?.trim() &&
      user?.kategori_id &&
      user?.kota?.trim() &&
      user?.earner_type,
  );
  const sudahSegel = ((segel ?? []) as unknown[]).length > 0;

  function progresUntuk(code: string): number {
    if (code === "first_tx_today" || code === "five_tx_today") return jmlHariIni;
    // Target 2 = kedua sisi. Progres 1 berarti baru satu sisi tercatat, dan
    // bar-nya menunjukkan setengah — itu petunjuk yang benar: yang kurang
    // bukan "catat lebih banyak", melainkan "catat sisi satunya".
    if (code === "both_sides_today") {
      return (hariIniSinyal.adaMasuk ? 1 : 0) + (hariIniSinyal.adaKeluar ? 1 : 0);
    }
    if (code === "voice_tx_today") return hariIniSinyal.jmlSuara;
    if (code === "streak_7_days" || code === "streak_30_days") return runtun;
    if (code === "open_report_weekly") return bacaLaporanPekanIni ? 1 : 0;
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
