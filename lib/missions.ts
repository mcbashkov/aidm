/** Misi default v3.0 (§7.6) — pemicunya bergeser dari riset ke pencatatan.
 *  Tampilan M0; nanti diganti data dari /api/missions + progress user. */
export interface DefaultMission {
  code: string;
  judul: string;
  deskripsi: string;
  reward: number;
  tipe: "daily" | "weekly" | "monthly" | "once";
}

export const DEFAULT_MISSIONS: DefaultMission[] = [
  {
    code: "first_tx_today",
    judul: "Catat transaksi pertama hari ini",
    deskripsi: "Catat 1 transaksi hari ini",
    reward: 20,
    tipe: "daily",
  },
  {
    code: "five_tx_today",
    judul: "Catat 5 transaksi dalam sehari",
    deskripsi: "Selesaikan 5 catatan hari ini",
    reward: 50,
    tipe: "daily",
  },
  {
    code: "streak_7_days",
    judul: "Catat 7 hari beruntun",
    deskripsi: "Mencatat setiap hari selama seminggu",
    reward: 100,
    tipe: "weekly",
  },
  {
    code: "seal_monthly_report",
    judul: "Segel laporan bulanan",
    deskripsi: "Segel laporan bulan lalu ke opBNB",
    reward: 150,
    tipe: "monthly",
  },
  {
    code: "complete_profile",
    judul: "Lengkapi profil usaha",
    deskripsi: "Isi nama usaha, kategori, dan kota",
    reward: 50,
    tipe: "once",
  },
];

/** Cap harian default (§7.6) — misi bulanan punya cap tersendiri. */
export const CAP_HARIAN_IDMX = 250;
