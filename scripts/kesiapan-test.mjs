/**
 * Uji unit Kesiapan Catatan (lib/kesiapan/hitung.ts) — murni, jalan di CI
 * tanpa database. Jalankan: `pnpm test:kesiapan` (Node ≥22.18, type stripping).
 *
 * Setiap kasus menyusun baris `daily_rollups` buatan dan memeriksa tingkat,
 * "N dari 6", checklist, dan syarat beli. Tanggal adalah string WIB persis
 * seperti yang disimpan database — tidak ada Date, tidak ada zona waktu.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { hitungKesiapan, geserBulan, labelBerkas } = await import(
  new URL(join(root, "lib/kesiapan/hitung.ts"), "file://").href
);

let lulus = 0;
const gagal = [];
function cek(nama, kondisi, detail = "") {
  if (kondisi) { lulus++; console.log(`  ✓ ${nama}`); }
  else { gagal.push(nama); console.log(`  ✗ ${nama}${detail ? ` — ${detail}` : ""}`); }
}

/** n hari aktif di bulan YYYY-MM (tanggal 1..n), masuk & keluar terisi. */
function bulanAktif(bulan, n = 8, opsi = {}) {
  const rows = [];
  for (let d = 1; d <= n; d++) {
    rows.push({
      tanggal: `${bulan}-${String(d).padStart(2, "0")}`,
      total_masuk: opsi.masuk ?? 50_000,
      total_keluar: opsi.keluar ?? 20_000,
      jml_transaksi: opsi.jml ?? 2,
    });
  }
  return rows;
}
const dasar = { today: "2026-10-22", profilLengkap: true, kasbonMenggantung: 0 };
const T = (rollups, ekstra = {}) => hitungKesiapan({ ...dasar, rollups, ...ekstra });

console.log("── geserBulan ──");
cek("geser 0 = bulan sendiri", geserBulan("2026-10", 0) === "2026-10");
cek("geser lintas tahun", geserBulan("2026-01", 1) === "2025-12" && geserBulan("2026-03", 14) === "2025-01");

console.log("── tingkat ──");
let r = T([]);
cek("1. akun baru → baru, 0 dari 6, checklist kosong", r.tingkat === "baru" && r.bulanAktif6 === 0 && r.checklist.filter((c) => !c.info).every((c) => c.kunci === "profil" ? c.terpenuhi : !c.terpenuhi), JSON.stringify(r));
r = T(bulanAktif("2026-10", 7));
cek("2. 7 hari aktif bulan ini → masih baru (batas 8)", r.tingkat === "baru" && r.hariAktifBulanIni === 7, r.tingkat);
r = T(bulanAktif("2026-10", 8));
cek("3. 8 hari aktif bulan ini → rutin, checklist bulan ini terpenuhi", r.tingkat === "rutin" && r.checklist.find((c) => c.kunci === "bulan_ini_aktif").terpenuhi, r.tingkat);
r = T([...bulanAktif("2026-10"), ...bulanAktif("2026-09")]);
cek("4. 2 bulan aktif → rutin, 2 dari 6", r.tingkat === "rutin" && r.bulanAktif6 === 2, `${r.tingkat} ${r.bulanAktif6}`);
r = T([...bulanAktif("2026-10"), ...bulanAktif("2026-09"), ...bulanAktif("2026-08")]);
cek("5. 3 bulan berturut termasuk bulan ini → siap3, berkas6 boleh", r.tingkat === "siap3" && r.berkas6Boleh && !r.berkas12Boleh, r.tingkat);
r = T([...bulanAktif("2026-10"), ...bulanAktif("2026-08"), ...bulanAktif("2026-05")]);
cek("6. 3 bulan aktif dengan bulan kosong di tengah (dalam 6) → siap3", r.tingkat === "siap3" && r.bulanAktif6 === 3, `${r.tingkat} ${r.bulanAktif6}`);
r = T([...bulanAktif("2026-03"), ...bulanAktif("2026-02"), ...bulanAktif("2026-01")]);
cek("7. 3 bulan aktif tapi 7–9 bulan lalu → rutin (bukan siap3), 0 dari 6", r.tingkat === "rutin" && r.bulanAktif6 === 0 && r.bulanAktif12 === 3, `${r.tingkat} ${r.bulanAktif6}/${r.bulanAktif12}`);
r = T(["2026-09", "2026-08", "2026-07", "2026-06", "2026-05", "2026-04"].flatMap((b) => bulanAktif(b)));
cek("8. 6 bulan sebelumnya semua aktif, bulan ini belum → siap6, berkas12 boleh", r.tingkat === "siap6" && r.berkas12Boleh && r.hariAktifBulanIni === 0, r.tingkat);
r = T(["2026-09", "2026-08", "2026-07", "2026-06", "2026-04"].flatMap((b) => bulanAktif(b)));
cek("9. 6 bulan sebelumnya aktif kecuali satu → siap3 (bukan siap6)", r.tingkat === "siap3", r.tingkat);
r = T(["2026-10", "2026-09", "2026-08", "2026-07", "2026-06", "2026-05"].flatMap((b) => bulanAktif(b)));
cek("10. 6 bulan termasuk bulan ini aktif, April tidak → siap3; 6 dari 6; berkas12 boleh", r.tingkat === "siap3" && r.bulanAktif6 === 6 && r.berkas12Boleh, `${r.tingkat} ${r.bulanAktif6}`);

console.log("── batas & sumber data ──");
r = hitungKesiapan({ ...dasar, today: "2026-10-01", rollups: bulanAktif("2026-09", 30) });
cek("11. batas bulan WIB: 30 Sep aktif, hari ini 1 Okt → September bulan lalu, bulan ini 0 hari", r.hariAktifBulanIni === 0 && r.bulanAktif12 === 1 && r.tingkat === "rutin", JSON.stringify([r.hariAktifBulanIni, r.bulanAktif12]));
r = T(bulanAktif("2026-10", 8, { jml: 0, masuk: 0, keluar: 0 }));
cek("12. baris rollup dengan jml_transaksi 0 (sisa penghapusan) bukan hari aktif", r.tingkat === "baru" && r.hariAktifBulanIni === 0, r.tingkat);
r = T([...bulanAktif("2026-10", 7), { tanggal: "2026-10-22", total_masuk: 45_000, total_keluar: 0, jml_transaksi: 1 }]);
cek("13. hari pelunasan kasbon (baris rollup masuk 1 transaksi) ikut dihitung → genap 8 → rutin", r.tingkat === "rutin" && r.hariAktifBulanIni === 8, `${r.tingkat} ${r.hariAktifBulanIni}`);
r = T(["2026-10", "2026-08", "2026-06", "2026-04", "2026-02", "2025-12"].flatMap((b) => bulanAktif(b)));
cek("14. 6 bulan aktif selang-seling dalam 12 → berkas12 boleh; 3 dari 6 → siap3", r.berkas12Boleh && r.tingkat === "siap3", `${r.tingkat} ${r.bulanAktif12}`);
r = T(["2026-10", "2026-08", "2026-06", "2026-04", "2026-02", "2025-10"].flatMap((b) => bulanAktif(b)));
cek("15. bulan ke-13 (Okt 2025) di luar jendela → hanya 5 bulan, berkas12 tidak boleh", !r.berkas12Boleh && r.bulanAktif12 === 5, `${r.bulanAktif12}`);

console.log("── checklist ──");
r = T(bulanAktif("2026-10", 3, { keluar: 0 }), { profilLengkap: false, kasbonMenggantung: 2 });
const c = Object.fromEntries(r.checklist.map((x) => [x.kunci, x]));
cek("16. profil tidak lengkap → item profil tidak terpenuhi", !c.profil.terpenuhi);
cek("17. ada pemasukan, tanpa pengeluaran bulan ini → masuk ✓, keluar ✗", c.masuk_bulan_ini.terpenuhi && !c.keluar_bulan_ini.terpenuhi);
cek("18. kasbon menggantung → item kasbon tidak terpenuhi, bertanda info, tingkat tidak terpengaruh", !c.kasbon_menggantung.terpenuhi && c.kasbon_menggantung.info && r.tingkat === "baru");
cek("19. urutan checklist sesuai §1.4", r.checklist.map((x) => x.kunci).join(",") === "profil,masuk_bulan_ini,keluar_bulan_ini,bulan_ini_aktif,kasbon_menggantung");

console.log("── label ──");
cek("20. label per peran", labelBerkas("ojol") === "Riwayat Pendapatan" && labelBerkas("freelance") === "Bukti Penghasilan" && labelBerkas("dagang") === "Berkas Usaha" && labelBerkas(null) === "Berkas Usaha");

console.log(`\n━━ ${lulus} lulus, ${gagal.length} gagal ━━`);
process.exit(gagal.length === 0 ? 0 : 1);
