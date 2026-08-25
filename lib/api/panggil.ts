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

export async function panggil<T>(
  input: string,
  init?: RequestInit,
): Promise<ApiHasil<T>> {
  try {
    const res = await fetch(input, {
      ...init,
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
  } catch {
    return { ok: false, status: 0, error: "offline", demo: false, offline: true };
  }
}
