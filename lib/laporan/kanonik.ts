/**
 * Kanonikalisasi laporan untuk hash segel on-chain (§17.2 / §7.5).
 *
 * Fungsi di berkas ini MURNI — tanpa DB, tanpa jaringan, tanpa waktu implisit.
 * Kemurnian itu bukan gaya: AC §7.5 menuntut "hash yang sama untuk data yang
 * sama, deterministik lintas server & waktu", dan satu-satunya cara
 * membuktikannya adalah membuat seluruh masukan eksplisit lalu mengujinya
 * berulang (scripts/canonical-test.mjs, jalan di CI tanpa API key).
 *
 * Aturan §17.2 yang ditegakkan di sini:
 *   - Kunci terurut alfabetis di SEMUA level.
 *   - Semua nominal integer rupiah — non-integer DITOLAK keras, bukan
 *     dibulatkan diam-diam: pembulatan diam-diam berarti dua server dengan
 *     pembulatan berbeda menghasilkan hash berbeda untuk data yang sama.
 *   - Tanggal `YYYY-MM-DD` zona WIB.
 *   - Tanpa spasi/newline.
 *   - Field HANYA dari daftar §17.2 — `raw_input`, catatan bebas, dan data
 *     identitas selain `user_id` mustahil ikut karena field dipetik satu per
 *     satu, bukan dari spread objek.
 */

import { createHash } from "crypto";

/** Baris kategori kanonik — kunci alfabetis: jenis, jml, slug, total. */
export interface KanonikKategori {
  jenis: "masuk" | "keluar";
  jml: number;
  slug: string;
  total: number;
}

/** Masukan kanonikalisasi — semua eksplisit, tidak ada yang diambil dari env
 *  atau jam sistem. `generated_at` disuntik pemanggil (tanggal WIB). */
export interface KanonikInput {
  user_id: string;
  period_key: string;
  generated_at: string; // YYYY-MM-DD (WIB)
  total_masuk: number;
  total_keluar: number;
  jml_transaksi: number;
  hari_aktif: number;
  masuk_terverifikasi: number;
  rincian_kategori: KanonikKategori[];
}

const RE_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const RE_PERIODE = /^\d{4}-\d{2}$/;

function integerAtauGagal(nilai: number, nama: string): number {
  if (!Number.isSafeInteger(nilai)) {
    throw new Error(
      `Kanonikalisasi: ${nama} harus integer rupiah (dapat ${nilai}).`,
    );
  }
  return nilai;
}

/**
 * JSON.stringify dengan kunci terurut alfabetis di semua level. Ditulis
 * sendiri (bukan pakai library) supaya perilakunya terkunci di repo ini —
 * hash yang sudah tertanam di chain tidak boleh berubah gara-gara minor bump
 * dependensi mengubah detail serialisasi.
 */
export function stableStringify(nilai: unknown): string {
  if (nilai === null || typeof nilai !== "object") {
    return JSON.stringify(nilai);
  }
  if (Array.isArray(nilai)) {
    return `[${nilai.map((v) => stableStringify(v)).join(",")}]`;
  }
  const kunci = Object.keys(nilai as Record<string, unknown>).sort();
  const isi = kunci.map(
    (k) => `${JSON.stringify(k)}:${stableStringify((nilai as Record<string, unknown>)[k])}`,
  );
  return `{${isi.join(",")}}`;
}

/**
 * Susun string kanonik §17.2. Melempar error bila masukan menyalahi aturan —
 * laporan yang tidak bisa dikanonikalisasi TIDAK BOLEH disegel.
 */
export function susunKanonik(input: KanonikInput): string {
  if (!RE_PERIODE.test(input.period_key)) {
    throw new Error(`Kanonikalisasi: period_key bukan YYYY-MM (${input.period_key}).`);
  }
  if (!RE_TANGGAL.test(input.generated_at)) {
    throw new Error(`Kanonikalisasi: generated_at bukan YYYY-MM-DD (${input.generated_at}).`);
  }

  const total_masuk = integerAtauGagal(input.total_masuk, "total_masuk");
  const total_keluar = integerAtauGagal(input.total_keluar, "total_keluar");

  // rincian_kategori terurut (§17.2): jenis dulu, lalu slug — leksikografis,
  // bukan urutan besaran, supaya urutan tidak berubah saat nominal berubah.
  const rincian = [...input.rincian_kategori]
    .map((r) => ({
      jenis: r.jenis,
      jml: integerAtauGagal(r.jml, `rincian[${r.slug}].jml`),
      slug: r.slug,
      total: integerAtauGagal(r.total, `rincian[${r.slug}].total`),
    }))
    .sort((a, b) =>
      a.jenis !== b.jenis
        ? a.jenis.localeCompare(b.jenis)
        : a.slug.localeCompare(b.slug),
    );

  // Field dipetik eksplisit — menambah field baru = keputusan sadar yang
  // mengubah hash, dan wajib dicatat sebagai versi skema kanonik baru.
  return stableStringify({
    generated_at: input.generated_at,
    hari_aktif: integerAtauGagal(input.hari_aktif, "hari_aktif"),
    jml_transaksi: integerAtauGagal(input.jml_transaksi, "jml_transaksi"),
    masuk_terverifikasi: integerAtauGagal(
      input.masuk_terverifikasi,
      "masuk_terverifikasi",
    ),
    period_key: input.period_key,
    rincian_kategori: rincian,
    sisa: total_masuk - total_keluar,
    total_masuk,
    total_keluar,
    user_id: input.user_id,
  });
}

/** SHA-256 hex (tanpa awalan 0x) dari string kanonik — bentuk yang disimpan
 *  di `report_seals.report_hash`; versi bytes32 on-chain tinggal `0x${hex}`. */
export function hashKanonik(kanonik: string): string {
  return createHash("sha256").update(kanonik, "utf8").digest("hex");
}

/** Jalan pintas: susun + hash sekali jalan. */
export function hashLaporan(input: KanonikInput): {
  kanonik: string;
  hash: string;
} {
  const kanonik = susunKanonik(input);
  return { kanonik, hash: hashKanonik(kanonik) };
}
