/** Misi default v3.0 (§7.6) — pemicunya bergeser dari riset ke pencatatan.
 *  Dipakai sebagai fallback tampilan (mode demo) dan sebagai daftar target
 *  yang dievaluasi server di `lib/missions/server.ts`. */
export type MissionTipe = "daily" | "weekly" | "monthly" | "once";

export interface DefaultMission {
  code: string;
  judul: string;
  deskripsi: string;
  reward: number;
  tipe: MissionTipe;
  /** Nilai progres yang harus dicapai agar misi selesai. */
  target: number;
}

export const DEFAULT_MISSIONS: DefaultMission[] = [
  {
    code: "first_tx_today",
    judul: "Catat transaksi pertama hari ini",
    deskripsi: "Catat 1 transaksi hari ini",
    reward: 20,
    tipe: "daily",
    target: 1,
  },
  {
    code: "five_tx_today",
    judul: "Catat 5 transaksi dalam sehari",
    deskripsi: "Selesaikan 5 catatan hari ini",
    reward: 50,
    tipe: "daily",
    target: 5,
  },
  {
    code: "streak_7_days",
    judul: "Catat 7 hari beruntun",
    deskripsi: "Mencatat setiap hari selama seminggu",
    reward: 100,
    tipe: "weekly",
    target: 7,
  },
  {
    code: "seal_monthly_report",
    judul: "Segel laporan bulanan",
    deskripsi: "Segel laporan bulan lalu ke opBNB",
    reward: 150,
    tipe: "monthly",
    target: 1,
  },
  {
    code: "complete_profile",
    judul: "Lengkapi profil usaha",
    deskripsi: "Isi nama usaha, kategori, dan kota",
    reward: 50,
    tipe: "once",
    target: 1,
  },
];

/** Cap harian default (§7.6) — misi bulanan punya cap tersendiri. */
export const CAP_HARIAN_IDMX = 250;

/** Cap misi bulanan (§7.6 "misi bulanan di luar cap harian, cap tersendiri").
 *  Sebesar satu reward segel: satu periode hanya bisa diklaim sekali. */
export const CAP_BULANAN_IDMX = 150;

/** Misi bulanan tidak ikut menghabiskan jatah harian. */
export function ikutCapHarian(tipe: MissionTipe): boolean {
  return tipe !== "monthly";
}

/** Bentuk satu misi beserta progres nyata milik user (GET /api/missions). */
export interface MisiProgress extends DefaultMission {
  /** Progres saat ini, 0..target. Diturunkan dari data sumber tiap dibaca —
   *  menghapus transaksi otomatis menurunkannya (AC §7.6). */
  progress: number;
  selesai: boolean;
  /** Kunci periode klaim: '2026-08-15' | '2026-W33' | '2026-07' | 'once'. */
  periodKey: string;
  diklaim: boolean;
  /** Terisi bila klaim sudah masuk on-chain. */
  txHash?: string;
  /** URL explorer — WAJIB diisi server. Chain kontrak reward ditentukan env
   *  tanpa awalan NEXT_PUBLIC_, jadi klien tidak bisa menyimpulkannya sendiri:
   *  di browser nilainya undefined dan tautan akan menunjuk chain yang salah. */
  explorerTx?: string;
  statusKlaim?: "signed" | "submitted" | "confirmed" | "failed";
  /** Alasan misi belum bisa diklaim meski selesai (cap harian tercapai, dll). */
  alasanTerkunci?: string;
}

export interface MisiResponse {
  misi: MisiProgress[];
  capHarian: { terpakai: number; batas: number };
  capBulanan: { terpakai: number; batas: number };
  /** Kontrak reward + penandatangan voucher terpasang di server. */
  klaimSiap: boolean;
}
