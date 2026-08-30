/**
 * Satu bentuk hasil untuk semua panggilan API dari klien.
 *
 * `ok` membedakan sukses/gagal, `demo` menandai server belum dikonfigurasi
 * (401 tanpa sesi / 501 tanpa Supabase), `offline` menandai jaringan putus.
 * `kode` membawa kode mesin dari endpoint yang punya taksonomi galat (mis.
 * klaim misi) — layar memakainya untuk memutuskan, `error` untuk menampilkan.
 * Endpoint lama yang hanya mengirim `{ error }` tetap bekerja apa adanya.
 * Ketiganya sengaja dipisah: layar boleh jatuh ke data contoh saat server
 * memang belum ada, tapi TIDAK BOLEH menampilkan data contoh kepada pengguna
 * sungguhan yang cuma kehilangan sinyal — angka palsu di buku usaha lebih
 * berbahaya daripada layar kosong.
 */

export type ApiHasil<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      error: string;
      kode?: string;
      demo: boolean;
      offline: boolean;
    };

/**
 * Batas tunggu satu permintaan.
 *
 * `fetch` TIDAK punya timeout bawaan. Tanpa batas ini, satu permintaan yang
 * menggantung membuat pemanggilnya menunggu selamanya — dan layar yang
 * menandai "sedang memuat" dari `data === null` tidak punya jalan keluar sama
 * sekali. Itu persis yang terjadi pada kartu Wallet: `/api/me` menggantung 21
 * detik, `me` tetap null, dan "Menyiapkan…" bertahan tanpa akhir sementara
 * saldo di baris sebelahnya sudah tampil.
 *
 * 12 detik dipilih dari data: `/api/me` di produksi menjawab 0,9–3,1 detik
 * pada jalur hangat dan ~21 detik saat tersendat. Ambangnya harus jauh di atas
 * yang pertama dan di bawah yang kedua — pengguna lebih baik diberi tahu dan
 * diberi tombol daripada dibiarkan menatap shimmer.
 */
const BATAS_MS = 12_000;

export async function panggil<T>(
  input: string,
  init?: RequestInit,
): Promise<ApiHasil<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      // Pemanggil boleh membawa sinyalnya sendiri (mis. pembatalan saat
      // unmount); kalau tidak, batas di atas yang berlaku.
      signal: init?.signal ?? AbortSignal.timeout(BATAS_MS),
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const body = (await res.json().catch(() => ({}))) as T & {
      error?: string;
      code?: string;
      message?: string;
    };
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        // `message` (taksonomi baru) didahulukan; `error` bentuk lama.
        error: body.message ?? body.error ?? `HTTP ${res.status}`,
        kode: typeof body.code === "string" ? body.code : undefined,
        demo: res.status === 401 || res.status === 501,
        offline: false,
      };
    }
    return { ok: true, data: body };
  } catch (err) {
    // Putus sambungan dan tersendat BUKAN hal yang sama, dan kalimatnya di
    // layar berbeda. `navigator.onLine` dibaca DI SINI, pada saat kegagalan —
    // bukan saat render — supaya pesannya cocok dengan sebabnya.
    const offline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    const timeout = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      status: 0,
      error: offline
        ? "offline"
        : timeout
          ? "Server lama sekali menjawab. Coba lagi ya."
          : "Sambungan bermasalah. Coba lagi ya.",
      demo: false,
      offline,
    };
  }
}
