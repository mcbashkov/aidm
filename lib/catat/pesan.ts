/**
 * Kalimat tetap untuk jalur Catat — SATU-SATUNYA teks yang boleh dilihat
 * pengguna sebagai "jawaban" di tab Catat.
 *
 * Jaminannya arsitektural, bukan berupa aturan di prompt: model tidak pernah
 * mengarang kalimat yang dirender. Ia hanya mengisi field bertipe — `entries`
 * dan satu enum `tidak_dikenali` — dan berkas inilah yang mengubah enum itu
 * menjadi kalimat. Tidak ada jalur di mana teks bebas dari model sampai ke
 * layar, sehingga tab Catat tidak bisa dipakai sebagai chatbot umum betapa pun
 * pandai kalimat yang dikirim pengguna.
 *
 * Dipakai server DAN layar: keduanya memetakan dari kode yang sama, sehingga
 * tidak ada versi kalimat yang bisa menyimpang di salah satu sisi.
 */

/** Kenapa satu kalimat tidak menghasilkan entri. */
export type KodeTidakDikenali =
  /** Sama sekali bukan tentang uang usaha — sapaan, pertanyaan umum, obrolan. */
  | "bukan_uang"
  /** Terasa soal uang, tapi tidak cukup untuk dijadikan entri. */
  | "tidak_jelas";

/** Bentuk pertanyaan klarifikasi — union bertipe, bukan kalimat. */
export type Pertanyaan =
  | {
      jenis: "nominal";
      /** Potongan catatan entri yang ditanyakan. Bukan kalimat model — ia teks
       *  yang juga tersimpan sebagai catatan transaksi dan tampil di Riwayat. */
      untuk: string;
    }
  /** Jawaban atas pertanyaan nominal tidak terbaca sebagai angka. */
  | { jenis: "nominal_tidak_terbaca" };

/**
 * Berapa kali offtopic dalam sehari sebelum kalimatnya dipendekkan.
 *
 * Pengulangan kalimat panjang yang sama terbaca seperti dimarahi. Yang
 * dipendekkan hanya kalimatnya — TIDAK ADA penangguhan akun, tidak ada
 * peringatan. Audiens produk ini banyak yang baru pertama kali memakai AI;
 * mencoba mengobrol dengannya adalah rasa ingin tahu yang wajar, bukan
 * pelanggaran.
 */
export const OFFTOPIC_AMBANG_PENDEK = 3;

const OFFTOPIC_PANJANG =
  "Aku cuma bisa bantu mencatat keuangan usahamu — pemasukan, pengeluaran, " +
  "dan laporannya. Coba ucapkan transaksimu, misalnya “jual 10 porsi 150rb” " +
  "atau “beli gas 22rb”.";

const OFFTOPIC_PENDEK = "Fitur catat khusus untuk transaksi usaha ya.";

const TIDAK_JELAS =
  "Aku belum menangkap transaksi dari kalimat itu. Coba sebutkan nominalnya, " +
  "misalnya “jual 3 nasi goreng 45rb”.";

/**
 * Kalimat untuk sebuah kode. `offtopicHariIni` menentukan panjang-pendeknya;
 * layar boleh mengirim 0 bila tidak tahu — hasilnya versi panjang, yang aman.
 */
export function pesanTidakDikenali(
  kode: KodeTidakDikenali,
  offtopicHariIni = 0,
): string {
  if (kode === "tidak_jelas") return TIDAK_JELAS;
  return offtopicHariIni >= OFFTOPIC_AMBANG_PENDEK
    ? OFFTOPIC_PENDEK
    : OFFTOPIC_PANJANG;
}

/** Kalimat untuk pertanyaan klarifikasi. */
export function pesanPertanyaan(p: Pertanyaan): string {
  if (p.jenis === "nominal_tidak_terbaca") {
    return "Aku masih belum menangkap angkanya. Tulis nominalnya saja ya, misalnya “45rb” atau “45.000”.";
  }
  const untuk = p.untuk.replace(/\s+/g, " ").trim().slice(0, 60);
  return untuk ? `Berapa nominal untuk “${untuk}”?` : "Berapa nominalnya?";
}

export function kodeSah(v: unknown): v is KodeTidakDikenali {
  return v === "bukan_uang" || v === "tidak_jelas";
}
