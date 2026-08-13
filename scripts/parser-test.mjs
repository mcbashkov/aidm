/**
 * Runner test suite parser pencatatan (tests/parser-cases.json).
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
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { parseFallback } = await import(
  new URL(join(root, "lib/parse/fallback.ts"), "file://").href
);

const TODAY = "2026-08-12";
const cases = JSON.parse(
  readFileSync(join(root, "tests/parser-cases.json"), "utf8"),
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

process.exit(skor >= 0.95 ? 0 : 1);
