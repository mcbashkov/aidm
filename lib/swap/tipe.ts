/**
 * Bentuk data fitur Tukar yang dilewatkan server → klien.
 *
 * Dipisah dari `lib/swap/config.ts` supaya komponen klien bisa mengimpor
 * tipenya tanpa ikut menarik fungsi yang membaca `process.env` sisi server.
 */

/** Jawaban GET /api/swap/config. */
export interface SwapConfig {
  configured: true;
  burnChainId: number;
  claimChainId: number;
  idmx: `0x${string}`;
  initiator: `0x${string}`;
  claim: `0x${string}`;
}

/** Satu baris dari GET /api/swap/vouchers. */
export interface SwapVoucherKlien {
  nonce: string;
  user: `0x${string}`;
  /** Wei — WAJIB dipakai apa adanya saat memanggil kontrak. */
  idmxBurned: string;
  /** Satuan token, hanya untuk ditampilkan. */
  idmx: number;
  /** Detik Unix, satuan yang ditandatangani dan diminta kontrak. */
  deadline: string;
  deadlineIso: string;
  signature: `0x${string}`;
  status: "signed" | "claimed";
  burnTxUrl: string;
  claimTxUrl: string | null;
  createdAt: string;
}

/** Satu kaki jawaban GET /api/swap/keadaan — selalu berstatus & bertanggal. */
export type KakiKeadaan<T> =
  | ({ status: "ok"; pada: number } & T)
  | { status: "gagal"; pada: number; galat: string };

/** Angka wei dikirim sebagai string digit — JSON tidak punya bigint. */
export type KakiOpbnb = KakiKeadaan<{
  saldoIdmx: string;
  minSwap: string;
  sisaJatahMinggu: string;
  izin: string;
  jeda: boolean;
}>;

export type KakiBsc = KakiKeadaan<{ kurs: string; fee: string; jeda: boolean }>;

/** Jawaban GET /api/swap/keadaan (Batch 8). */
export interface KeadaanSwapRespons {
  pada: number;
  alamat: `0x${string}`;
  burnChainId: number;
  claimChainId: number;
  opbnb: KakiOpbnb;
  bsc: KakiBsc;
}
