/**
 * Taksonomi galat klaim misi (§7.6) — dipakai server DAN klien.
 *
 * Alasan berkas ini ada: 500 adalah pernyataan "kami tidak tahu apa yang
 * terjadi". Memakainya untuk kondisi yang sebenarnya kita pahami — jatah habis,
 * sudah diklaim, dompet belum siap — membuat pengguna membaca "Coba lagi ya"
 * lalu mencoba lagi ke dinding yang sama. Setiap kondisi yang bisa diprediksi
 * wajib punya kode dan kalimatnya sendiri.
 *
 * `bisaDicobaLagi` sengaja tinggal DI SINI, bukan di komponen: tombol Klaim
 * memutuskan hidup-matinya dari tabel yang sama yang dipakai server untuk
 * menolak. Kalau keduanya menyimpan daftarnya masing-masing, cepat atau lambat
 * keduanya berbeda pendapat — dan yang terlihat pengguna adalah tombol yang
 * mengundang ketukan yang pasti ditolak.
 *
 * Berkas ini WAJIB tetap murni: tanpa impor `next/server`, tanpa env, tanpa
 * akses DB. Ia ikut ke bundel browser lewat komponen Misi.
 */

export type KodeGalatKlaim =
  | "WALLET_NOT_READY"
  | "WALLET_LOOKUP_FAILED"
  | "ALREADY_CLAIMED"
  | "DAILY_QUOTA_EXCEEDED"
  | "MONTHLY_QUOTA_EXCEEDED"
  | "MISSION_NOT_COMPLETE"
  | "MISSION_UNKNOWN"
  | "CLAIM_NOT_CONFIGURED"
  | "CLAIM_STORAGE_REJECTED"
  | "RELAYER_UNAVAILABLE"
  | "CHAIN_TIMEOUT"
  | "UNEXPECTED";

export interface DefGalatKlaim {
  status: number;
  message: string;
  /** Boleh ditawarkan ulang ke pengguna? Hanya untuk kondisi yang benar-benar
   *  bisa berubah dalam hitungan detik tanpa ia melakukan apa pun. */
  bisaDicobaLagi: boolean;
}

export const GALAT_KLAIM: Record<KodeGalatKlaim, DefGalatKlaim> = {
  WALLET_NOT_READY: {
    status: 409,
    message: "Dompetmu masih disiapkan. Tunggu sebentar ya.",
    bisaDicobaLagi: true,
  },
  // Privy tidak bisa DITANYA — berbeda dari "Privy menjawab, dompetnya memang
  // belum ada". Menyamakan keduanya membuat gangguan penyedia auth tampak
  // seperti akun yang belum siap selamanya, dan pengguna menunggu sesuatu yang
  // tidak sedang terjadi.
  WALLET_LOOKUP_FAILED: {
    status: 503,
    message: "Belum bisa memastikan dompetmu. Coba lagi sebentar lagi.",
    bisaDicobaLagi: true,
  },
  ALREADY_CLAIMED: {
    status: 409,
    message: "Misi ini sudah kamu klaim.",
    bisaDicobaLagi: false,
  },
  DAILY_QUOTA_EXCEEDED: {
    status: 429,
    message: "Jatah IDMX hari ini sudah penuh. Balik lagi besok.",
    bisaDicobaLagi: false,
  },
  MONTHLY_QUOTA_EXCEEDED: {
    status: 429,
    message: "Jatah misi bulanan sudah penuh. Balik lagi bulan depan.",
    bisaDicobaLagi: false,
  },
  MISSION_NOT_COMPLETE: {
    status: 400,
    message: "Misinya belum selesai.",
    bisaDicobaLagi: false,
  },
  MISSION_UNKNOWN: {
    status: 400,
    message: "Misi ini tidak dikenal atau sedang tidak aktif.",
    bisaDicobaLagi: false,
  },
  CLAIM_NOT_CONFIGURED: {
    status: 501,
    message: "Klaim on-chain belum aktif di server ini.",
    bisaDicobaLagi: false,
  },
  // 22003 & kerabatnya: nilai ditolak penyimpanan. Sesudah migrasi 0021 ini
  // seharusnya mustahil, jadi kemunculannya = cacat server, bukan keadaan
  // pengguna. Tetap dicatat sebagai error lengkap dengan SQLSTATE-nya, tapi
  // TIDAK dijawab 500: klaimnya batal utuh, tidak ada yang tergantung, dan
  // percobaan berikutnya memakai nonce baru yang mungkin lolos.
  CLAIM_STORAGE_REJECTED: {
    status: 503,
    message: "Klaim belum bisa disimpan. Rewardmu aman, coba lagi sebentar lagi.",
    bisaDicobaLagi: true,
  },
  RELAYER_UNAVAILABLE: {
    status: 503,
    message: "Jaringan lagi sibuk. Rewardmu aman, kami proses otomatis.",
    bisaDicobaLagi: true,
  },
  CHAIN_TIMEOUT: {
    status: 503,
    message: "Jaringan lagi lambat. Rewardmu aman, coba lagi sebentar lagi.",
    bisaDicobaLagi: true,
  },
  UNEXPECTED: {
    status: 500,
    message: "Gagal mengklaim misi. Coba lagi ya.",
    bisaDicobaLagi: true,
  },
};

/** Bentuk badan respons galat klaim di kabel. */
export interface BadanGalatKlaim {
  code: KodeGalatKlaim;
  message: string;
}

/** Kode dari respons yang tidak dikenal (versi klien lebih tua dari server,
 *  atau galat dari lapisan lain) diperlakukan sebagai tak terduga. */
export function kodeKlaimDikenal(v: unknown): v is KodeGalatKlaim {
  return typeof v === "string" && v in GALAT_KLAIM;
}

/**
 * Boleh menawarkan tombol Klaim lagi? Default `true` untuk kode yang tidak
 * dikenal: kegagalan yang tidak kita pahami tidak boleh mengunci pengguna dari
 * reward yang memang haknya.
 */
export function bisaDicobaLagi(kode: unknown): boolean {
  return kodeKlaimDikenal(kode) ? GALAT_KLAIM[kode].bisaDicobaLagi : true;
}

/**
 * Peta SQLSTATE Postgres → kode klaim. Hanya galat yang artinya kita pahami
 * yang dipetakan; sisanya sengaja dibiarkan jatuh ke UNEXPECTED supaya tetap
 * berisik di log alih-alih disamarkan jadi pesan ramah yang salah.
 */
export function kodeDariSqlstate(sqlstate: string | undefined): KodeGalatKlaim {
  switch (sqlstate) {
    case "23505": // unique_violation — indeks (user, misi, periode) 0017.
      return "ALREADY_CLAIMED";
    case "23503": // foreign_key_violation — baris misi/user lenyap di tengah.
      return "MISSION_UNKNOWN";
    case "22003": // numeric_value_out_of_range — bug nonce yang dicabut 0021.
    case "22P02": // invalid_text_representation
    case "23514": // check_violation — mis. CHECK bentuk kanonik nonce.
      return "CLAIM_STORAGE_REJECTED";
    default:
      return "UNEXPECTED";
  }
}
