/**
 * Uji unit Pajak OP (lib/pajak/hitung.ts) — murni, tanpa database.
 * Jalankan: `pnpm test:pajak` (Node ≥22.18, type stripping).
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { hitungPajak, pengingatSetoran, geserBulan, BATAS_BEBAS_IDR } = await import(
  new URL(join(root, "lib/pajak/hitung.ts"), "file://").href
);

let lulus = 0;
const gagal = [];
function cek(nama, kondisi, detail = "") {
  if (kondisi) { lulus++; console.log(`  ✓ ${nama}`); }
  else { gagal.push(nama); console.log(`  ✗ ${nama}${detail ? ` — ${detail}` : ""}`); }
}
const jt = (n) => n * 1_000_000;

console.log("── tanpa catatan ──");
{
  const h = hitungPajak(2026, []);
  cek("1. 12 baris, semua nol, tidak melewati", h.bulanan.length === 12 && h.omzetTahun === 0 && !h.melewati && h.bulanMelewati === null && h.totalSetoran === 0);
  cek("2. batas bebas Rp500 juta", h.batasBebas === BATAS_BEBAS_IDR && BATAS_BEBAS_IDR === 500_000_000);
}

console.log("── di bawah batas ──");
{
  const h = hitungPajak(2026, [{ bulan: "2026-01", omzet: jt(100) }, { bulan: "2026-06", omzet: jt(400) }]);
  cek("3. kumulatif tepat 500 juta → belum melewati (sampai dengan 500 juta bebas)", h.omzetTahun === jt(500) && !h.melewati && h.totalSetoran === 0, JSON.stringify(h.bulanan[5]));
  cek("4. bulan kosong di tengah tetap ada dengan omzet 0", h.bulanan[2].omzet === 0 && h.bulanan[2].kumulatif === jt(100));
}

console.log("── melewati batas ──");
{
  const h = hitungPajak(2026, [
    { bulan: "2026-01", omzet: jt(200) },
    { bulan: "2026-02", omzet: jt(200) },
    { bulan: "2026-03", omzet: jt(200) },
    { bulan: "2026-04", omzet: jt(50) },
  ]);
  cek("5. melewati di Maret (kumulatif 600 juta)", h.melewati && h.bulanMelewati === "2026-03", h.bulanMelewati);
  cek("6. Jan/Feb tidak kena, setoran 0", !h.bulanan[0].kenaPph && !h.bulanan[1].kenaPph && h.bulanan[1].setoran === 0);
  cek("7. Maret: dasar kena = selisih 100 juta, setoran 500.000", h.bulanan[2].dasarKena === jt(100) && h.bulanan[2].setoran === 500_000, JSON.stringify(h.bulanan[2]));
  cek("8. April: seluruh 50 juta kena, setoran 250.000, jatuh tempo 2026-05-15", h.bulanan[3].dasarKena === jt(50) && h.bulanan[3].setoran === 250_000 && h.bulanan[3].jatuhTempo === "2026-05-15");
  cek("9. Mei tanpa omzet: kena tetapi setoran 0, jatuh tempo null", h.bulanan[4].omzet === 0 && h.bulanan[4].setoran === 0 && h.bulanan[4].jatuhTempo === null);
  cek("10. total setoran 750.000", h.totalSetoran === 750_000, String(h.totalSetoran));
  cek("11. omzet tahun lain diabaikan", hitungPajak(2026, [{ bulan: "2025-12", omzet: jt(900) }]).omzetTahun === 0);
  cek("12. dua baris bulan sama dijumlahkan", hitungPajak(2026, [{ bulan: "2026-01", omzet: 10 }, { bulan: "2026-01", omzet: 5 }]).bulanan[0].omzet === 15);
}

console.log("── pengingat tanggal 15 ──");
{
  const h = hitungPajak(2026, [{ bulan: "2026-01", omzet: jt(600) }, { bulan: "2026-02", omzet: jt(10) }]);
  const p = pengingatSetoran(h, "2026-02-10");
  cek("13. 10 Feb: pengingat setoran Januari 500.000, jatuh tempo 2026-02-15, sisa 5 hari", p && p.bulanPajak === "2026-01" && p.setoran === 500_000 && p.jatuhTempo === "2026-02-15" && p.sisaHari === 5, JSON.stringify(p));
  cek("14. 16 Feb: tidak ada pengingat (lewat tanggal 15)", pengingatSetoran(h, "2026-02-16") === null);
  cek("15. 15 Mar: pengingat Februari 50.000, sisa 0 hari", pengingatSetoran(h, "2026-03-15")?.setoran === 50_000 && pengingatSetoran(h, "2026-03-15")?.sisaHari === 0);
  cek("16. 5 Jan: bulan pajak Desember tahun lalu → null untuk hasil tahun ini", pengingatSetoran(h, "2026-01-05") === null);
  cek("17. geserBulan lintas tahun", geserBulan("2026-01", -1) === "2025-12" && geserBulan("2025-12", 1) === "2026-01");
}

console.log(`\n━━ ${lulus} lulus, ${gagal.length} gagal ━━`);
if (gagal.length) process.exit(1);
