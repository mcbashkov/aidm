/**
 * Satu bentuk hasil untuk semua panggilan API dari klien.
 *
 * `ok` membedakan sukses/gagal, `demo` menandai server belum dikonfigurasi
 * (401 tanpa sesi / 501 tanpa Supabase), `offline` menandai jaringan putus.
 * Ketiganya sengaja dipisah: layar boleh jatuh ke data contoh saat server
 * memang belum ada, tapi TIDAK BOLEH menampilkan data contoh kepada pengguna
 * sungguhan yang cuma kehilangan sinyal — angka palsu di buku usaha lebih
 * berbahaya daripada layar kosong.
 */

export type ApiHasil<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; demo: boolean; offline: boolean };

export async function panggil<T>(
  input: string,
  init?: RequestInit,
): Promise<ApiHasil<T>> {
  try {
    const res = await fetch(input, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const body = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: body.error ?? `HTTP ${res.status}`,
        demo: res.status === 401 || res.status === 501,
        offline: false,
      };
    }
    return { ok: true, data: body };
  } catch {
    return { ok: false, status: 0, error: "offline", demo: false, offline: true };
  }
}
