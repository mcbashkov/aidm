/** Generator Konten — format & bentuk keluaran (§7.8). Dipakai server & layar. */

export const FORMAT_KONTEN = {
  tiktok_script: {
    judul: "Skrip TikTok",
    keterangan: "Hook–isi–CTA, 30–60 detik",
  },
  ig_caption: {
    judul: "Caption Instagram",
    keterangan: "Caption + tagar",
  },
  promo_copy: {
    judul: "Promo WhatsApp",
    keterangan: "Pesan jualan siap kirim",
  },
  calendar7: {
    judul: "Kalender 7 hari",
    keterangan: "Ide konten seminggu",
  },
} as const;

export type FormatKonten = keyof typeof FORMAT_KONTEN;

export const FORMAT_VALID = Object.keys(FORMAT_KONTEN) as FormatKonten[];

export function formatSah(v: unknown): v is FormatKonten {
  return typeof v === "string" && (FORMAT_VALID as string[]).includes(v);
}

/** Satu bagian keluaran. Sengaja seragam lintas format: layar hanya perlu tahu
 *  cara menggambar "judul + badan + (opsional) tagar", bukan empat bentuk. */
export interface BagianKonten {
  judul: string;
  badan: string;
  tagar?: string[];
}

export interface HasilKonten {
  format: FormatKonten;
  topik: string;
  bagian: BagianKonten[];
}

export const BATAS_TOPIK = 200;
