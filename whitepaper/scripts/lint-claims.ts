/**
 * Menggagalkan build kalau berkas markdown memuat klaim terlarang.
 *
 * Aturannya hidup di `data/forbidden-phrases.json`, bukan di sini — supaya
 * daftar bisa ditambah tanpa menyentuh skrip. Ini bukan gaya bahasa: setiap
 * pola punya alasan yang tertulis di sebelahnya, dan sebagian besar berasal
 * dari keputusan yang sudah dibayar mahal.
 *
 * Ingatan tidak menskalakan. Seorang penulis yang tidak pernah membaca
 * PROGRESS.md tetap akan menulis "siap diajukan ke bank" karena kalimat itu
 * terdengar bagus — dan hanya alat yang bisa menghentikannya.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

type Aturan = { id: string; pola: string[]; kecuali?: string[]; regex?: boolean; alasan: string };
const { aturan }: { aturan: Aturan[] } = JSON.parse(
  readFileSync("data/forbidden-phrases.json", "utf8"),
);

function berkasMd(dir: string, keluar: string[] = []): string[] {
  let isi: string[];
  try { isi = readdirSync(dir); } catch { return keluar; }
  for (const f of isi) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) berkasMd(p, keluar);
    else if (/\.mdx?$/.test(f)) keluar.push(p);
  }
  return keluar;
}

const berkas = [...berkasMd("docs"), ...berkasMd("i18n"), ...berkasMd("src/pages")];
const temuan: string[] = [];

for (const p of berkas) {
  const baris = readFileSync(p, "utf8").split("\n");
  baris.forEach((b, i) => {
    const rendah = b.toLowerCase();
    for (const a of aturan) {
      for (const pola of a.pola) {
        const cocok = a.regex
          ? new RegExp(pola, "i").test(b)
          : rendah.includes(pola.toLowerCase());
        if (!cocok) continue;
        // `kecuali` diperiksa pada BARIS yang sama: "sudah diaudit" boleh
        // muncul selama kata "internal" atau "pra-" menemaninya.
        if (a.kecuali?.some((k) => rendah.includes(k.toLowerCase()))) continue;
        temuan.push(`${p}:${i + 1}  [${a.id}]  "${b.trim().slice(0, 90)}"\n      → ${a.alasan}`);
      }
    }
  });
}

if (temuan.length) {
  console.error(`✗ lint-claims GAGAL — ${temuan.length} klaim terlarang:`);
  temuan.forEach((t) => console.error("  " + t));
  process.exit(1);
}
console.log(`✓ lint-claims: ${berkas.length} berkas markdown bersih`);
