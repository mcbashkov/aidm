/** Misi default untuk tampilan M0 (mirror seed 0009). Nanti diganti data
 *  dari /api/missions + progress user. */
export interface DefaultMission {
  code: string;
  judul: string;
  deskripsi: string;
  reward: number;
  tipe: "daily" | "weekly" | "once";
}

export const DEFAULT_MISSIONS: DefaultMission[] = [
  {
    code: "first_research_today",
    judul: "Riset pertama hari ini",
    deskripsi: "Lakukan 1 riset hari ini",
    reward: 20,
    tipe: "daily",
  },
  {
    code: "three_research_today",
    judul: "3 riset dalam sehari",
    deskripsi: "Selesaikan 3 riset hari ini",
    reward: 50,
    tipe: "daily",
  },
  {
    code: "share_result_card",
    judul: "Bagikan kartu hasil",
    deskripsi: "Bagikan 1 kartu hasil riset",
    reward: 30,
    tipe: "daily",
  },
  {
    code: "login_streak_7",
    judul: "Login 7 hari beruntun",
    deskripsi: "Masuk 7 hari berturut-turut",
    reward: 100,
    tipe: "weekly",
  },
  {
    code: "complete_profile",
    judul: "Lengkapi profil usaha",
    deskripsi: "Isi kategori & kota usaha",
    reward: 50,
    tipe: "once",
  },
];
