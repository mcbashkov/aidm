/**
 * Kesiapan Catatan (PERINTAH-AGEN-PREMIUM §1.4, Batch 4) — murni, deterministik,
 * bisa dijelaskan. Tidak ada angka 0–100: yang keluar adalah NAMA TINGKAT,
 * "N dari 6 bulan terakhir aktif", dan checklist "apa yang kurang". Angka skor
 * mengundang pembacaan "skor kredit", dan AIDM bukan penilai kredit.
 *
 * Satu-satunya masukan dari database adalah baris `daily_rollups` (tanggal
 * sudah WIB — rollup_delta di 0012 memakai Asia/Jakarta), profil, dan jumlah
 * kasbon menggantung. Modul ini TANPA impor runtime supaya bisa diuji langsung
 * oleh Node (scripts/kesiapan-test.mjs) seperti parser fallback.
 *
 * Definisi hari aktif SAMA dengan `ringkasDariRollups().hariAktif`
 * (lib/laporan/server.ts): baris rollup dengan jml_transaksi > 0 — hanya
 * transaksi confirmed bernominal. Pelunasan kasbon IKUT terhitung (ia catatan
 * nyata yang membuat baris rollup), berbeda dari `misi_sinyal_harian` v0032
 * yang mengecualikannya: misi memberi IDMX dan tidak boleh dipanen lewat
 * ketukan "Tandai lunas"; kesiapan tidak memberi apa pun selain informasi.
 */

export type Tingkat = "baru" | "rutin" | "siap3" | "siap6";

export const LABEL_TINGKAT: Record<Tingkat, string> = {
  baru: "Baru mulai",
  rutin: "Mulai rutin",
  siap3: "Siap 3 bulan",
  siap6: "Siap 6 bulan",
};

/** Bulan kalender dihitung aktif bila hari aktifnya ≥ ini. */
export const HARI_AKTIF_PER_BULAN = 8;
/** Tingkat dihitung atas 12 bulan kalender terakhir termasuk bulan berjalan. */
export const JENDELA_BULAN = 12;
/** "N dari 6 bulan terakhir" — 6 bulan kalender termasuk bulan berjalan. */
export const JENDELA_6 = 6;
/** Kasbon aktif lebih tua dari ini dianggap menggantung (informasi, bukan syarat). */
export const KASBON_MENGGANTUNG_HARI = 60;

export interface RollupHari {
  /** YYYY-MM-DD, tanggal WIB (kolom `daily_rollups.tanggal`). */
  tanggal: string;
  total_masuk: number;
  total_keluar: number;
  jml_transaksi: number;
}

export interface MasukanKesiapan {
  /** Hari ini WIB, YYYY-MM-DD. */
  today: string;
  rollups: ReadonlyArray<RollupHari>;
  /** nama_usaha, kota, dan kategori terisi semua. */
  profilLengkap: boolean;
  /** Jumlah kasbon aktif yang lebih tua dari KASBON_MENGGANTUNG_HARI. */
  kasbonMenggantung: number;
}

export interface ItemChecklist {
  kunci:
    | "profil"
    | "masuk_bulan_ini"
    | "keluar_bulan_ini"
    | "bulan_ini_aktif"
    | "kasbon_menggantung";
  label: string;
  terpenuhi: boolean;
  /** true = informasi saja, tidak memengaruhi tingkat. */
  info: boolean;
}

export interface HasilKesiapan {
  tingkat: Tingkat;
  label: string;
  /** Bulan aktif di 12 bulan terakhir (termasuk bulan berjalan). */
  bulanAktif12: number;
  /** Bulan aktif di 6 bulan terakhir (termasuk bulan berjalan) — "N dari 6". */
  bulanAktif6: number;
  /** YYYY-MM yang aktif di jendela 12 bulan, urut naik. */
  bulanAktif: string[];
  hariAktifBulanIni: number;
  checklist: ItemChecklist[];
  /** Syarat beli Berkas 6 bulan: tingkat ≥ siap3. */
  berkas6Boleh: boolean;
  /** Syarat beli Berkas 12 bulan: ≥6 bulan aktif di 12 bulan terakhir. */
  berkas12Boleh: boolean;
}

/* ── Aritmetika bulan atas string, tanpa objek Date: tidak ada zona waktu yang
      bisa menggeser tanggal WIB yang sudah benar dari database. ─────────── */

function bulanDari(tanggal: string): string {
  return tanggal.slice(0, 7);
}

/** Bulan `n` langkah sebelum `bulan` (YYYY-MM). n=0 → bulan itu sendiri. */
export function geserBulan(bulan: string, n: number): string {
  const [y, m] = bulan.split("-").map(Number);
  const idx = y * 12 + (m - 1) - n;
  const yy = Math.floor(idx / 12);
  const mm = (idx % 12) + 1;
  return `${yy}-${String(mm).padStart(2, "0")}`;
}

export function hitungKesiapan(masukan: MasukanKesiapan): HasilKesiapan {
  const bulanIni = bulanDari(masukan.today);
  // Jendela 12 bulan: bulanIni, bulanIni-1, …, bulanIni-11.
  const jendela12 = new Set<string>();
  for (let i = 0; i < JENDELA_BULAN; i++) jendela12.add(geserBulan(bulanIni, i));
  const jendela6 = new Set<string>();
  for (let i = 0; i < JENDELA_6; i++) jendela6.add(geserBulan(bulanIni, i));
  // Enam bulan SEBELUM bulan berjalan — syarat siap6.
  const enamSebelum: string[] = [];
  for (let i = 1; i <= JENDELA_6; i++) enamSebelum.push(geserBulan(bulanIni, i));

  // Hari aktif per bulan. Baris dengan jml_transaksi = 0 (sisa penghapusan)
  // bukan hari aktif; baris di luar jendela diabaikan.
  const hariPerBulan = new Map<string, number>();
  let masukBulanIni = false;
  let keluarBulanIni = false;
  for (const r of masukan.rollups) {
    const b = bulanDari(r.tanggal);
    if (!jendela12.has(b)) continue;
    if (r.jml_transaksi > 0) {
      hariPerBulan.set(b, (hariPerBulan.get(b) ?? 0) + 1);
    }
    if (b === bulanIni) {
      if (r.total_masuk > 0) masukBulanIni = true;
      if (r.total_keluar > 0) keluarBulanIni = true;
    }
  }

  const aktif = (b: string) => (hariPerBulan.get(b) ?? 0) >= HARI_AKTIF_PER_BULAN;
  const bulanAktif = [...jendela12].filter(aktif).sort();
  const bulanAktif12 = bulanAktif.length;
  const bulanAktif6 = bulanAktif.filter((b) => jendela6.has(b)).length;
  const hariAktifBulanIni = hariPerBulan.get(bulanIni) ?? 0;

  // Tingkat = yang TERTINGGI terpenuhi. `rutin` adalah "sudah pernah aktif
  // tapi belum siap3" — termasuk tiga bulan aktif yang tersebar di luar enam
  // bulan terakhir, kasus yang tidak ditutup tabel §1.4 bila dibaca harfiah.
  let tingkat: Tingkat;
  if (enamSebelum.every(aktif)) tingkat = "siap6";
  else if (bulanAktif6 >= 3) tingkat = "siap3";
  else if (bulanAktif12 >= 1) tingkat = "rutin";
  else tingkat = "baru";

  const checklist: ItemChecklist[] = [
    {
      kunci: "profil",
      label: "Profil usaha lengkap (nama usaha, kota, bidang)",
      terpenuhi: masukan.profilLengkap,
      info: false,
    },
    {
      kunci: "masuk_bulan_ini",
      label: "Pemasukan tercatat bulan ini",
      terpenuhi: masukBulanIni,
      info: false,
    },
    {
      kunci: "keluar_bulan_ini",
      label: "Pengeluaran tercatat bulan ini",
      terpenuhi: keluarBulanIni,
      info: false,
    },
    {
      kunci: "bulan_ini_aktif",
      label: `Bulan ini sudah ${HARI_AKTIF_PER_BULAN} hari mencatat`,
      terpenuhi: hariAktifBulanIni >= HARI_AKTIF_PER_BULAN,
      info: false,
    },
    {
      kunci: "kasbon_menggantung",
      label: `Tidak ada kasbon menggantung lebih dari ${KASBON_MENGGANTUNG_HARI} hari`,
      terpenuhi: masukan.kasbonMenggantung === 0,
      info: true,
    },
  ];

  const peringkat: Record<Tingkat, number> = { baru: 0, rutin: 1, siap3: 2, siap6: 3 };
  return {
    tingkat,
    label: LABEL_TINGKAT[tingkat],
    bulanAktif12,
    bulanAktif6,
    bulanAktif,
    hariAktifBulanIni,
    checklist,
    berkas6Boleh: peringkat[tingkat] >= peringkat.siap3,
    berkas12Boleh: bulanAktif12 >= 6,
  };
}

/** Label pintu "Buat <label>" per peran (§1.2). Nama internal tetap
 *  "Berkas Pengajuan"; yang berubah hanya yang dilihat pengguna. */
export function labelBerkas(earnerType: string | null | undefined): string {
  if (earnerType === "ojol") return "Riwayat Pendapatan";
  if (earnerType === "freelance") return "Bukti Penghasilan";
  return "Berkas Usaha";
}
