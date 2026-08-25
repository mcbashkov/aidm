/**
 * Pembacaan environment dengan aturan proyek ini: **konfigurasi dideteksi dari
 * "string tidak kosong"**, bukan dari ada/tidaknya variabel.
 *
 * Aturan itu tertulis di kepala `.env.local.example` dan sengaja dipilih: field
 * yang belum siap dibiarkan KOSONG, bukan dihapus, supaya berkas env tetap jadi
 * daftar lengkap apa saja yang ada. Konsekuensinya `??` adalah operator yang
 * salah untuk cadangan env — `""` bukan nullish, jadi
 *
 *     process.env.MISSION_RELAYER_PRIVATE_KEY ?? process.env.SEAL_RELAYER_PRIVATE_KEY
 *
 * mengembalikan `""` dan cadangannya tidak pernah terpakai. Kegagalannya diam:
 * fitur menjawab "belum dikonfigurasi" padahal kunci cadangannya ada di sana.
 * Persis itu yang terjadi pada klaim misi — `MISSION_RELAYER_PRIVATE_KEY`
 * kosong (sesuai anjuran berkas env) membuat `isKlaimConfigured()` false
 * walaupun `SEAL_RELAYER_PRIVATE_KEY` terisi.
 */

/** Nilai env pertama yang tidak kosong (setelah trim), atau `undefined`. */
export function envPertama(...nama: string[]): string | undefined {
  for (const n of nama) {
    const v = process.env[n]?.trim();
    if (v) return v;
  }
  return undefined;
}
