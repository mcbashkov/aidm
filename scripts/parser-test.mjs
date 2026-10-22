/**
 * Runner test suite parser pencatatan (tests/parser-cases.json), plus korpus
 * kasbon terpisah (tests/parser-kasbon.json, Batch 2). Korpus 200 sengaja
 * TIDAK ditambah: angkanya pembanding historis dan gerbang M6, dan menambah
 * kasus ke dalamnya akan membuat 200/200 hari ini tidak bisa dibandingkan
 * dengan 200/200 kemarin.
 *
 * Menguji parser FALLBACK (deterministik — jalur yang menjaga §7.2 tetap
 * hidup saat LLM gagal, dan satu-satunya yang bisa diuji di CI tanpa API
 * key). Jalankan: `node scripts/parser-test.mjs` (Node ≥22.18, type
 * stripping bawaan; fallback.ts sengaja hanya punya type-import).
 *
 * Kelulusan per kasus = SEMUA benar: jumlah entri, dan per entri jenis +
 * amount + payment_method + occurred_at + kategori ∈ kategori_ok, plus
 * kecocokan boolean pertanyaan & tidak_dikenali. Target: ≥95%.
 */

import { readFileSync } from "node:fs";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
// Alias `@/` + ekstensi .ts seperti bundler Next (scripts/hook-ts.mjs), supaya
// fallback.ts boleh mengimpor modul murni lain (lib/parse/platform, Batch 10).
register("./hook-ts.mjs", import.meta.url);
const { parseFallback } = await import(
  new URL(join(root, "lib/parse/fallback.ts"), "file://").href
);

const TODAY = "2026-08-12";
const cases = JSON.parse(
  readFileSync(join(root, "tests/parser-cases.json"), "utf8"),
);
const casesKasbon = JSON.parse(
  readFileSync(join(root, "tests/parser-kasbon.json"), "utf8"),
);
// Korpus ojol (Batch 10): platform per pendapatan & sub pengeluaran kendaraan.
const casesOjol = JSON.parse(
  readFileSync(join(root, "tests/parser-ojol.json"), "utf8"),
);
// Korpus jasa (Batch 11): uang muka/DP pada pemasukan jasa.
const casesJasa = JSON.parse(
  readFileSync(join(root, "tests/parser-jasa.json"), "utf8"),
);

/** Pasangkan entri hasil ↔ harapan dengan permutasi terbaik (n kecil). */
function cocokkanEntri(hasil, harapan) {
  if (hasil.length !== harapan.length) return null;
  const n = harapan.length;
  const used = new Array(n).fill(false);
  const salah = [];

  function entriCocok(h, e) {
    const masalah = [];
    if (h.jenis !== e.jenis) masalah.push(`jenis ${h.jenis}≠${e.jenis}`);
    const amtOk =
      e.amount === null ? h.amount === null : h.amount === e.amount;
    if (!amtOk) masalah.push(`amount ${h.amount}≠${e.amount}`);
    if (h.paymentMethod !== e.payment_method)
      masalah.push(`metode ${h.paymentMethod}≠${e.payment_method}`);
    if (h.occurredAt !== e.occurred_at)
      masalah.push(`tanggal ${h.occurredAt}≠${e.occurred_at}`);
    if (!e.kategori_ok.includes(h.kategori))
      masalah.push(`kategori ${h.kategori}∉[${e.kategori_ok}]`);
    // Field kasbon diperiksa HANYA bila harapannya menyebut — korpus 200
    // tidak menyebutnya, jadi skornya tidak bisa berubah karena field ini.
    if (e.status_bayar !== undefined && h.statusBayar !== e.status_bayar)
      masalah.push(`status_bayar ${h.statusBayar}≠${e.status_bayar}`);
    if (e.pihak !== undefined && h.pihak !== e.pihak)
      masalah.push(`pihak ${h.pihak}≠${e.pihak}`);
    // sub_kategori (Batch 10) diperiksa HANYA bila harapannya menyebut kunci
    // itu (termasuk null = "tidak boleh terisi") — korpus 200 & kasbon tidak.
    if ("sub_kategori" in e && (h.subKategori ?? null) !== e.sub_kategori)
      masalah.push(`sub_kategori ${h.subKategori ?? null}≠${e.sub_kategori}`);
    return masalah;
  }

  // Greedy exact-first, lalu catat masalah pasangan sisa urutan asli.
  for (let i = 0; i < n; i++) {
    let matched = false;
    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      if (entriCocok(hasil[i], harapan[j]).length === 0) {
        used[j] = true;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const j = harapan.findIndex((_, k) => !used[k]);
      used[j] = true;
      salah.push(...entriCocok(hasil[i], harapan[j]));
    }
  }
  return salah;
}

function nilai(cases) {
let lulus = 0;
const gagal = [];
const perPersona = new Map();

for (const c of cases) {
  const earner = ["dagang", "ojol", "freelance", "online", "lainnya"].includes(
    c.persona,
  )
    ? c.persona
    : undefined;
  const r = parseFallback(c.text, { today: c.today ?? TODAY, earner });
  const e = c.expect;
  const masalah = [];

  if (e.tidak_dikenali) {
    if (r.entries.length !== 0 || r.tidakDikenali === null) {
      masalah.push(
        `harap tidak_dikenali, dapat ${r.entries.length} entri` +
          (r.pertanyaan ? " + pertanyaan" : ""),
      );
    }
  } else {
    const cocok = cocokkanEntri(r.entries, e.entries);
    if (cocok === null) {
      masalah.push(`jumlah entri ${r.entries.length}≠${e.entries.length}`);
    } else {
      masalah.push(...cocok);
    }
    const adaTanya = r.pertanyaan !== null;
    if (adaTanya !== e.pertanyaan) {
      masalah.push(`pertanyaan ${adaTanya}≠${e.pertanyaan}`);
    }
    if (r.tidakDikenali !== null) masalah.push("tidak_dikenali tak terduga");
  }

  const stat = perPersona.get(c.persona) ?? { lulus: 0, total: 0 };
  stat.total++;
  if (masalah.length === 0) {
    lulus++;
    stat.lulus++;
  } else {
    gagal.push({ id: c.id, text: c.text, masalah, hasil: r });
  }
  perPersona.set(c.persona, stat);
}
return { lulus, gagal, perPersona };
}

const { lulus, gagal, perPersona } = nilai(cases);
const skor = lulus / cases.length;
console.log(`\n━━ Skor parser fallback: ${lulus}/${cases.length} = ${(skor * 100).toFixed(1)}% (target ≥95%) ━━`);
for (const [p, s] of [...perPersona.entries()].sort()) {
  console.log(`  ${p.padEnd(10)} ${s.lulus}/${s.total}`);
}

const tampil = Number(process.env.SHOW_FAILURES ?? "15");
if (gagal.length > 0) {
  console.log(`\nGagal (${gagal.length}, tampil maks ${tampil}):`);
  for (const g of gagal.slice(0, tampil)) {
    console.log(`  ✗ [${g.id}] "${g.text}"`);
    for (const m of g.masalah) console.log(`      ${m}`);
    if (process.env.VERBOSE) {
      console.log(`      hasil: ${JSON.stringify(g.hasil)}`);
    }
  }
}

const kasbon = nilai(casesKasbon);
const skorKasbon = kasbon.lulus / casesKasbon.length;
console.log(
  `\n━━ Korpus kasbon: ${kasbon.lulus}/${casesKasbon.length} = ${(skorKasbon * 100).toFixed(1)}% (target ≥95%) ━━`,
);
for (const g of kasbon.gagal.slice(0, tampil)) {
  console.log(`  ✗ [${g.id}] "${g.text}"`);
  for (const m of g.masalah) console.log(`      ${m}`);
  if (process.env.VERBOSE) {
    console.log(`      hasil: ${JSON.stringify(g.hasil)}`);
  }
}

const ojol = nilai(casesOjol);
const skorOjol = ojol.lulus / casesOjol.length;
console.log(
  `\n━━ Korpus ojol: ${ojol.lulus}/${casesOjol.length} = ${(skorOjol * 100).toFixed(1)}% (target ≥95%) ━━`,
);
for (const g of ojol.gagal.slice(0, tampil)) {
  console.log(`  ✗ [${g.id}] "${g.text}"`);
  for (const m of g.masalah) console.log(`      ${m}`);
  if (process.env.VERBOSE) {
    console.log(`      hasil: ${JSON.stringify(g.hasil)}`);
  }
}

const jasa = nilai(casesJasa);
const skorJasa = jasa.lulus / casesJasa.length;
console.log(
  `\n━━ Korpus jasa: ${jasa.lulus}/${casesJasa.length} = ${(skorJasa * 100).toFixed(1)}% (target ≥95%) ━━`,
);
for (const g of jasa.gagal.slice(0, tampil)) {
  console.log(`  ✗ [${g.id}] "${g.text}"`);
  for (const m of g.masalah) console.log(`      ${m}`);
  if (process.env.VERBOSE) {
    console.log(`      hasil: ${JSON.stringify(g.hasil)}`);
  }
}

process.exit(skor >= 0.95 && skorKasbon >= 0.95 && skorOjol >= 0.95 && skorJasa >= 0.95 ? 0 : 1);
