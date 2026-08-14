/**
 * Uji kanonikalisasi & hash segel (§17.2 / AC §7.5) — murni offline, tanpa
 * API key, jalan di CI. Membuktikan tiga hal yang menjadi dasar kepercayaan
 * segel on-chain:
 *   1. DETERMINISTIK — data sama → hash sama, berapa kali pun, dari urutan
 *      masukan apa pun.
 *   2. SENSITIF — SATU angka berubah → hash berbeda total (uji regresi wajib).
 *   3. TERTUTUP — field di luar daftar §17.2 (raw_input, catatan, identitas)
 *      mustahil menyusup ke payload yang di-hash.
 *
 * Jalankan: pnpm test:canonical
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { susunKanonik, hashKanonik, hashLaporan, stableStringify } = await import(
  new URL(join(root, "lib/laporan/kanonik.ts"), "file://").href
);

let lulus = 0;
const gagal = [];
function cek(nama, kondisi, detail = "") {
  if (kondisi) {
    lulus++;
    console.log(`  ✓ ${nama}`);
  } else {
    gagal.push(`${nama}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${nama}${detail ? ` — ${detail}` : ""}`);
  }
}

const DASAR = {
  user_id: "a3c1b0aa-0000-4000-8000-000000000001",
  period_key: "2026-07",
  generated_at: "2026-08-14",
  total_masuk: 1_300_000,
  total_keluar: 35_000,
  jml_transaksi: 3,
  hari_aktif: 1,
  masuk_terverifikasi: 450_000,
  rincian_kategori: [
    { jenis: "masuk", slug: "penjualan", total: 1_300_000, jml: 2 },
    { jenis: "keluar", slug: "bahan_baku", total: 35_000, jml: 1 },
  ],
};

console.log("\n── 1. Determinisme ──");
{
  const a = hashLaporan(DASAR);
  const b = hashLaporan(structuredClone(DASAR));
  cek("data sama → hash sama", a.hash === b.hash);
  cek("hash = sha256 hex 64 karakter", /^[0-9a-f]{64}$/.test(a.hash), a.hash);

  // Urutan penulisan kunci objek diacak — hasil kanonik wajib identik.
  const acak = {
    rincian_kategori: [...DASAR.rincian_kategori].reverse(),
    masuk_terverifikasi: DASAR.masuk_terverifikasi,
    user_id: DASAR.user_id,
    hari_aktif: DASAR.hari_aktif,
    total_keluar: DASAR.total_keluar,
    generated_at: DASAR.generated_at,
    jml_transaksi: DASAR.jml_transaksi,
    period_key: DASAR.period_key,
    total_masuk: DASAR.total_masuk,
  };
  cek(
    "urutan kunci & urutan kategori masukan diacak → kanonik identik byte-per-byte",
    susunKanonik(acak) === susunKanonik(DASAR),
  );

  const kanonik = susunKanonik(DASAR);
  cek("tanpa spasi/newline (§17.2)", !/[\s]/.test(kanonik));
  cek(
    "kunci terurut alfabetis di level teratas",
    kanonik.indexOf('"generated_at"') < kanonik.indexOf('"hari_aktif"') &&
      kanonik.indexOf('"hari_aktif"') < kanonik.indexOf('"jml_transaksi"') &&
      kanonik.indexOf('"sisa"') < kanonik.indexOf('"total_masuk"') &&
      kanonik.indexOf('"total_masuk"') < kanonik.indexOf('"user_id"'),
  );
  cek(
    "sisa dihitung fungsi (masuk − keluar), bukan dipercaya dari pemanggil",
    kanonik.includes('"sisa":1265000'),
  );
}

console.log("\n── 2. Sensitivitas — regresi wajib AC §7.5 ──");
{
  const dasar = hashLaporan(DASAR).hash;
  const ubahSatu = hashLaporan({ ...DASAR, total_masuk: 1_300_001 }).hash;
  cek("SATU rupiah berubah → hash berbeda", dasar !== ubahSatu);

  // "Berbeda total": hamming distance bit di atas ambang acak yang wajar.
  const bitBeda = [...Buffer.from(dasar, "hex")]
    .map((b, i) => b ^ Buffer.from(ubahSatu, "hex")[i])
    .reduce((s, x) => s + x.toString(2).replace(/0/g, "").length, 0);
  cek(`avalanche: ${bitBeda}/256 bit berubah (>80)`, bitBeda > 80, String(bitBeda));

  cek(
    "periode berbeda → hash berbeda",
    dasar !== hashLaporan({ ...DASAR, period_key: "2026-06" }).hash,
  );
  cek(
    "tanggal generate berbeda → hash berbeda (bukti keberadaan pada waktu)",
    dasar !== hashLaporan({ ...DASAR, generated_at: "2026-08-15" }).hash,
  );
  cek(
    "satu kategori bertambah → hash berbeda",
    dasar !==
      hashLaporan({
        ...DASAR,
        rincian_kategori: [
          ...DASAR.rincian_kategori,
          { jenis: "keluar", slug: "transportasi", total: 10_000, jml: 1 },
        ],
      }).hash,
  );
}

console.log("\n── 3. Payload tertutup (audit §7.5) ──");
{
  // Field liar dititipkan di masukan — TIDAK BOLEH lolos ke kanonik.
  const disusupi = {
    ...DASAR,
    raw_input: "jual 3 nasi goreng 45rb",
    nama_usaha: "Warung Bu Sari",
    catatan: "rahasia",
  };
  const kanonik = susunKanonik(disusupi);
  cek("raw_input tidak pernah ikut", !kanonik.includes("raw_input"));
  cek("nama usaha tidak pernah ikut", !kanonik.includes("Warung"));
  cek("catatan bebas tidak pernah ikut", !kanonik.includes("rahasia"));
  cek(
    "field kategori pun dipetik eksplisit",
    !susunKanonik({
      ...DASAR,
      rincian_kategori: [
        { jenis: "masuk", slug: "penjualan", total: 1000, jml: 1, catatan: "bocor" },
      ],
    }).includes("bocor"),
  );
}

console.log("\n── 4. Masukan tidak sah ditolak keras ──");
{
  const tolak = (nama, ubah) => {
    try {
      susunKanonik({ ...DASAR, ...ubah });
      cek(nama, false, "tidak melempar error");
    } catch {
      cek(nama, true);
    }
  };
  tolak("nominal float ditolak (bukan dibulatkan diam-diam)", {
    total_masuk: 1_300_000.5,
  });
  tolak("period_key bukan YYYY-MM ditolak", { period_key: "Agustus 2026" });
  tolak("generated_at bukan YYYY-MM-DD ditolak", { generated_at: "14/08/2026" });
  tolak("jml kategori float ditolak", {
    rincian_kategori: [{ jenis: "masuk", slug: "penjualan", total: 1000, jml: 1.5 }],
  });
}

console.log("\n── 5. stableStringify — perilaku terkunci ──");
{
  cek(
    "objek bersarang ikut terurut",
    stableStringify({ b: { d: 1, c: 2 }, a: 3 }) === '{"a":3,"b":{"c":2,"d":1}}',
  );
  cek("array mempertahankan urutan", stableStringify([3, 1, 2]) === "[3,1,2]");
  cek("null aman", stableStringify(null) === "null");

  // VEKTOR EMAS: hash acuan untuk data DASAR, DIKUNCI SEBAGAI LITERAL. Kalau
  // assertion ini pecah, serialisasi berubah — hash lama yang sudah tertanam
  // di chain tidak akan cocok lagi saat diverifikasi ulang. Perubahan di sini
  // WAJIB diperlakukan sebagai versi skema kanonik baru, bukan bugfix.
  const EMAS =
    "b80e5575f9f7bb5faa774b54d46f65953f1f7b3b26c238fb630f173effef57ab";
  const kini = hashLaporan(DASAR).hash;
  cek(`vektor emas stabil: ${EMAS.slice(0, 16)}…`, kini === EMAS, kini);
}

console.log(`\n━━ ${lulus} lulus, ${gagal.length} gagal ━━`);
process.exit(gagal.length === 0 ? 0 : 1);
