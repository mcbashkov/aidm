/**
 * Dokumen PDF laporan keuangan (§7.3 "Isi PDF") — berkas yang dibawa pemilik
 * usaha ke bank/koperasi. Strukturnya mengikuti kebutuhan penilai KUR.
 *
 * Dua aturan yang TIDAK boleh dilanggar di berkas ini:
 *   1. Istilah "laba bersih" dilarang sebelum harga modal ada (§7.3) — yang
 *      dihitung baru laba KOTOR, dan penilai kredit akan memakai angkanya
 *      untuk keputusan nyata.
 *   2. Blok verifikasi wajib memuat kalimat baku bahwa segel BUKAN audit dan
 *      BUKAN penilaian kelayakan kredit (§7.5). Tanpa itu, dokumen ini bisa
 *      dibaca sebagai klaim yang tidak pernah kita buat.
 *
 * Font: Helvetica bawaan PDF. Bukan Fraunces/Plus Jakarta Sans seperti di
 * aplikasi — menyematkan font kustom menambah ±300 KB ke tiap berkas dan
 * memaksa render menunggu pemuatan font, sementara dokumen ini dinilai dari
 * isinya, bukan dari identitas mereknya.
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatPersen, formatRupiah } from "@/lib/transactions";
import { formatTanggalWib, labelPeriode } from "@/lib/laporan/periode";
import type { BarisKategori, Ringkasan, SealState } from "@/lib/laporan/types";

export interface BarisBulanan {
  bulan: string; // 'YYYY-MM'
  masuk: number;
  keluar: number;
  jmlTransaksi: number;
  hariAktif: number;
}

export interface LaporanPdfData {
  usaha: { nama: string; jenis: string; kota: string | null };
  period: string;
  dicetakPada: string; // tanggal WIB 'YYYY-MM-DD'
  kini: Ringkasan;
  masuk: BarisKategori[];
  keluar: BarisKategori[];
  bulanan: BarisBulanan[];
  segel: SealState;
  kontrak: { alamat: string | null; explorer: string; jaringan: string };
}

const WARNA = {
  ink: "#211C15",
  muted: "#6B6154",
  garis: "#E4DED2",
  emas: "#B8860B",
  danger: "#C0392B",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 52,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: WARNA.ink,
    lineHeight: 1.45,
  },
  kop: {
    borderBottomWidth: 2,
    borderBottomColor: WARNA.ink,
    paddingBottom: 10,
    marginBottom: 16,
  },
  judul: { fontSize: 17, fontFamily: "Helvetica-Bold" },
  subJudul: { fontSize: 9.5, color: WARNA.muted, marginTop: 3 },
  bagian: { marginBottom: 16 },
  bagianJudul: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 7,
  },
  kotakRingkas: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: WARNA.garis,
    borderRadius: 4,
  },
  selRingkas: {
    flex: 1,
    padding: 9,
    borderRightWidth: 1,
    borderRightColor: WARNA.garis,
  },
  selRingkasAkhir: { flex: 1, padding: 9 },
  labelKecil: { fontSize: 8, color: WARNA.muted },
  angkaBesar: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  baris: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: WARNA.garis,
    paddingVertical: 4,
  },
  barisKepala: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: WARNA.ink,
    paddingBottom: 4,
    marginBottom: 1,
  },
  th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: WARNA.muted },
  kolKiri: { flex: 2 },
  kolKanan: { flex: 1.4, textAlign: "right" },
  kolSempit: { flex: 1, textAlign: "right" },
  kotakVerifikasi: {
    borderWidth: 1,
    borderColor: WARNA.garis,
    borderRadius: 4,
    padding: 10,
    backgroundColor: "#FAF7F0",
  },
  mono: { fontFamily: "Courier", fontSize: 8 },
  catatanBaku: { fontSize: 8, color: WARNA.muted, marginTop: 6 },
  // Footer wajib (§7.3) dipasang sebagai <Text fixed> langsung, BUKAN <View
  // fixed> berisi teks: pembungkus flex yang dipatok ke tiap halaman tidak ikut
  // ter-render oleh react-pdf, dan kalimat wajibnya diam-diam hilang dari
  // dokumen — ketahuan hanya karena PDF hasilnya benar-benar dibuka & dibaca.
  footerTeks: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: WARNA.muted,
    borderTopWidth: 1,
    borderTopColor: WARNA.garis,
    paddingTop: 6,
  },
});

function labelBulan(bulan: string): string {
  return labelPeriode(bulan);
}

/** Rata-rata omzet per bulan (§7.3 "rata-rata omzet bulanan") — pembaginya
 *  hanya bulan yang BENAR-BENAR punya catatan; membagi dengan bulan kosong
 *  menyeret rata-rata turun dan membuat usaha tampak lebih kecil dari nyatanya. */
function rataOmzet(bulanan: BarisBulanan[]): number {
  const berisi = bulanan.filter((b) => b.jmlTransaksi > 0);
  if (berisi.length === 0) return 0;
  return Math.round(
    berisi.reduce((t, b) => t + b.masuk, 0) / berisi.length,
  );
}

function TabelKategori({
  judul,
  baris,
}: {
  judul: string;
  baris: BarisKategori[];
}) {
  return (
    <View style={s.bagian}>
      <Text style={s.bagianJudul}>{judul}</Text>
      {baris.length === 0 ? (
        <Text style={{ color: WARNA.muted }}>Tidak ada data di periode ini.</Text>
      ) : (
        <>
          <View style={s.barisKepala}>
            <Text style={[s.th, s.kolKiri]}>Kategori</Text>
            <Text style={[s.th, s.kolKanan]}>Nominal</Text>
            <Text style={[s.th, s.kolSempit]}>Porsi</Text>
          </View>
          {baris.map((b) => (
            <View key={b.slug} style={s.baris}>
              <Text style={s.kolKiri}>{b.nama}</Text>
              <Text style={s.kolKanan}>{formatRupiah(b.total)}</Text>
              <Text style={s.kolSempit}>{formatPersen(b.persen)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export function LaporanPdf({ data }: { data: LaporanPdfData }) {
  const { kini, usaha, segel, kontrak } = data;
  const rata = rataOmzet(data.bulanan);
  const tersegel = segel.status === "tersegel";

  return (
    <Document
      title={`Laporan Keuangan ${usaha.nama} — ${labelPeriode(data.period)}`}
      author="AIDM"
      language="id"
    >
      <Page size="A4" style={s.page}>
        {/* ── Kop (§7.3) ─────────────────────────────────────────────────── */}
        <View style={s.kop}>
          <Text style={s.judul}>Laporan Keuangan Usaha</Text>
          <Text style={s.subJudul}>
            {usaha.nama}
            {usaha.jenis ? ` · ${usaha.jenis}` : ""}
            {usaha.kota ? ` · ${usaha.kota}` : ""}
          </Text>
          <Text style={s.subJudul}>
            Periode {labelPeriode(data.period)} · Dicetak{" "}
            {formatTanggalWib(data.dicetakPada)}
          </Text>
        </View>

        {/* ── Ringkasan ──────────────────────────────────────────────────── */}
        <View style={s.bagian}>
          <Text style={s.bagianJudul}>Ringkasan periode</Text>
          <View style={s.kotakRingkas}>
            <View style={s.selRingkas}>
              <Text style={s.labelKecil}>Pemasukan</Text>
              <Text style={s.angkaBesar}>{formatRupiah(kini.masuk)}</Text>
            </View>
            <View style={s.selRingkas}>
              <Text style={s.labelKecil}>Pengeluaran</Text>
              <Text style={s.angkaBesar}>{formatRupiah(kini.keluar)}</Text>
            </View>
            <View style={s.selRingkasAkhir}>
              <Text style={s.labelKecil}>Sisa (laba kotor)</Text>
              <Text
                style={[
                  s.angkaBesar,
                  kini.sisa < 0 ? { color: WARNA.danger } : {},
                ]}
              >
                {formatRupiah(kini.sisa)}
              </Text>
            </View>
          </View>

          <View style={[s.kotakRingkas, { marginTop: 8 }]}>
            <View style={s.selRingkas}>
              <Text style={s.labelKecil}>Rata-rata omzet per bulan</Text>
              <Text style={s.angkaBesar}>{formatRupiah(rata)}</Text>
            </View>
            <View style={s.selRingkas}>
              <Text style={s.labelKecil}>Hari aktif tercatat</Text>
              <Text style={s.angkaBesar}>{kini.hariAktif} hari</Text>
            </View>
            <View style={s.selRingkasAkhir}>
              <Text style={s.labelKecil}>Jumlah transaksi</Text>
              <Text style={s.angkaBesar}>{kini.jmlTransaksi}</Text>
            </View>
          </View>

          <Text style={s.catatanBaku}>
            Sisa dihitung sebagai pemasukan dikurangi pengeluaran (laba kotor).
            Harga pokok penjualan belum diperhitungkan.
          </Text>
        </View>

        {/* ── Arus kas per bulan ─────────────────────────────────────────── */}
        <View style={s.bagian}>
          <Text style={s.bagianJudul}>Arus kas per bulan</Text>
          {data.bulanan.length === 0 ? (
            <Text style={{ color: WARNA.muted }}>Belum ada catatan bulanan.</Text>
          ) : (
            <>
              <View style={s.barisKepala}>
                <Text style={[s.th, s.kolKiri]}>Bulan</Text>
                <Text style={[s.th, s.kolKanan]}>Pemasukan</Text>
                <Text style={[s.th, s.kolKanan]}>Pengeluaran</Text>
                <Text style={[s.th, s.kolKanan]}>Sisa</Text>
                <Text style={[s.th, s.kolSempit]}>Hari</Text>
              </View>
              {data.bulanan.map((b) => (
                <View key={b.bulan} style={s.baris}>
                  <Text style={s.kolKiri}>{labelBulan(b.bulan)}</Text>
                  <Text style={s.kolKanan}>{formatRupiah(b.masuk)}</Text>
                  <Text style={s.kolKanan}>{formatRupiah(b.keluar)}</Text>
                  <Text style={s.kolKanan}>
                    {formatRupiah(b.masuk - b.keluar)}
                  </Text>
                  <Text style={s.kolSempit}>{b.hariAktif}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <TabelKategori judul="Rincian pemasukan per kategori" baris={data.masuk} />
        <TabelKategori
          judul="Rincian pengeluaran per kategori"
          baris={data.keluar}
        />

        {/* ── Porsi terverifikasi ────────────────────────────────────────── */}
        <View style={s.bagian}>
          <Text style={s.bagianJudul}>Porsi pemasukan terverifikasi</Text>
          <Text>
            {formatRupiah(kini.masukTerverifikasi)} dari{" "}
            {formatRupiah(kini.masuk)} ({formatPersen(kini.rasioTerverifikasi)})
            diterima lewat QRIS, transfer bank, atau dompet elektronik.
          </Text>
          <Text style={s.catatanBaku}>
            Transaksi non-tunai meninggalkan jejak di sistem pembayaran sehingga
            lebih mudah ditelusuri lembaga keuangan.
          </Text>
        </View>

        {/* ── Blok verifikasi (§7.3 / §7.5) ──────────────────────────────── */}
        <View style={s.bagian}>
          <Text style={s.bagianJudul}>Verifikasi</Text>
          <View style={s.kotakVerifikasi}>
            {tersegel ? (
              <>
                <Text style={s.labelKecil}>Hash laporan (SHA-256)</Text>
                <Text style={s.mono}>{segel.hash}</Text>
                <Text style={[s.labelKecil, { marginTop: 5 }]}>
                  Disegel pada
                </Text>
                <Text>
                  {segel.sealedAt
                    ? formatTanggalWib(segel.sealedAt.slice(0, 10))
                    : "-"}
                </Text>
                <Text style={[s.labelKecil, { marginTop: 5 }]}>
                  Kontrak {kontrak.jaringan}
                </Text>
                <Text style={s.mono}>{kontrak.alamat ?? "-"}</Text>
                {segel.txHash ? (
                  <>
                    <Text style={[s.labelKecil, { marginTop: 5 }]}>
                      Transaksi on-chain
                    </Text>
                    <Text style={s.mono}>
                      {kontrak.explorer}/tx/{segel.txHash}
                    </Text>
                  </>
                ) : null}
              </>
            ) : (
              <Text style={{ color: WARNA.muted }}>
                Laporan periode ini belum disegel ke blockchain. Segel hanya
                bisa dilakukan setelah periodenya berakhir.
              </Text>
            )}
            <Text style={s.catatanBaku}>
              Verifikasi ini membuktikan laporan tidak berubah sejak disegel.
              Verifikasi ini bukan audit dan bukan penilaian kelayakan kredit.
            </Text>
          </View>
        </View>

        <Text style={s.footerTeks} fixed>
          Laporan ini disusun mandiri oleh pemilik usaha melalui aplikasi AIDM.
        </Text>
        {/* Nomor halaman sengaja tidak dipasang: prop `render` dinamis
            react-pdf 4.6 tidak menghasilkan teks apa pun lewat renderToBuffer
            (diuji, hasilnya elemen kosong). Lebih baik tidak ada daripada
            penanda halaman yang tampak ada di kode tapi hilang di berkas.
            §7.3 tidak mewajibkannya. */}
      </Page>
    </Document>
  );
}

export function renderLaporanPdf(data: LaporanPdfData): Promise<Buffer> {
  return renderToBuffer(<LaporanPdf data={data} />);
}
