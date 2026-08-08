/** Kontrak output agen riset (§17) — dipakai UI kartu jawaban. */
export interface Temuan {
  poin: string;
  angka?: string | null;
  sumber: string;
  tanggal: string;
}

export interface ResearchBody {
  ringkasan: string;
  temuan: Temuan[];
  peluang_aksi: string[];
  peringatan?: string | null;
  saran_lanjutan: string[];
}

export interface ResearchAnswer {
  question: string;
  createdAt: string; // ISO
  confidence: number; // 1..3 (§7.8)
  body: ResearchBody;
}

/** Contoh hasil untuk demo format kartu jawaban (agen riil dibangun di M1). */
export const SAMPLE_RESEARCH: ResearchAnswer = {
  question: "Produk kuliner apa yang lagi naik di Bekasi?",
  createdAt: "2026-08-07T09:00:00+07:00",
  confidence: 2,
  body: {
    ringkasan:
      "Minuman berbasis matcha dan dessert box masih menanjak; rice bowl porsi hemat naik permintaannya untuk segmen pekerja. Contoh data (bukan hasil live).",
    temuan: [
      {
        poin: "Pencarian 'matcha latte' meningkat di kategori minuman",
        angka: "+38% MoM",
        sumber: "google_trends_id",
        tanggal: "2026-08-06",
      },
      {
        poin: "Konten 'dessert box' ramai di kreator lokal",
        angka: "12 video >100rb views",
        sumber: "tiktok_trends",
        tanggal: "2026-08-06",
      },
      {
        poin: "Rice bowl Rp15–20rb laris di marketplace area Bekasi",
        angka: "rata-rata 500+ terjual/toko",
        sumber: "marketplace_snapshot",
        tanggal: "2026-08-05",
      },
    ],
    peluang_aksi: [
      "Uji jual matcha latte kemasan cup 250ml dengan modal awal < Rp1 juta",
      "Buat 3 video dessert box mengikuti format kreator yang lagi ramai",
      "Tawarkan paket rice bowl hemat untuk jam makan siang kantor",
    ],
    peringatan:
      "Ini contoh untuk mendemokan format. Riset live aktif setelah kredensial (.env.local) diisi.",
    saran_lanjutan: [
      "Bandingkan harga matcha latte kompetitor",
      "Ide konten TikTok untuk dessert box",
    ],
  },
};
