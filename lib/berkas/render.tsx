/**
 * PDF "Berkas Pengajuan" (PERINTAH-AGEN-PREMIUM §1.5) — pola lib/laporan/pdf.tsx:
 * @react-pdf/renderer, A4, Helvetica bawaan, tanpa library PDF baru.
 *
 * Dokumen ini dibawa ke bank. Dua aturan dari pdf.tsx berlaku penuh — tanpa
 * kata "laba" dalam bentuk apa pun (angkanya arus kas), dan tanpa klaim
 * kelayakan — ditambah aturan §0.2: NOL kata token/kripto/wallet/chain di
 * sini. Segel disebut "notarisasi hash kriptografis".
 *
 * Hash SHA-256 dihitung atas BYTE PDF ini, jadi ia tidak bisa dicetak di
 * dalam dokumen yang sedang di-hash (sirkular). Halaman penutup menyatakan
 * di mana hash itu dicatat (URL verifikasi + kode); hash-nya sendiri hidup di
 * database dan di notarisasi, dan pembaca mencocokkannya di halaman publik.
 */

import {
  Document,
  Page,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { formatRupiah } from "@/lib/transactions";
import type { DataBerkas } from "@/lib/berkas/data";
import { NAMA_BULAN as BULAN, labelBulan, labelRentang } from "@/lib/berkas/label";

export interface BerkasPdfInput {
  data: DataBerkas;
  /** "Berkas Usaha 6 Bulan" / "Riwayat Pendapatan 12 Bulan" (§1.2). */
  label: string;
  nomorDokumen: string;
  kodeVerifikasi: string;
  /** YYYY-MM-DD WIB */
  tanggalTerbit: string;
  urlVerifikasi: string;
  /** true = hanya sampul, dengan tanda air PRATINJAU; tidak disimpan. */
  pratinjau: boolean;
}

const WARNA = {
  ink: "#211C15",
  muted: "#6B6154",
  garis: "#E4DED2",
  emas: "#B8860B",
  danger: "#C0392B",
  tandaAir: "#C9BFA8",
};

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 56, fontSize: 9.5, fontFamily: "Helvetica", color: WARNA.ink },
  judul: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  subJudul: { fontSize: 11, color: WARNA.muted, marginTop: 4 },
  bagianJudul: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8, color: WARNA.emas },
  bagian: { marginBottom: 16 },
  barisKV: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: WARNA.garis },
  kunci: { width: 130, color: WARNA.muted },
  nilai: { flex: 1 },
  baris: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: WARNA.garis },
  barisKepala: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: WARNA.ink },
  barisTotal: { flexDirection: "row", paddingVertical: 5, borderTopWidth: 1, borderTopColor: WARNA.ink, fontFamily: "Helvetica-Bold" },
  th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: WARNA.muted },
  kolBulan: { flex: 1.6 },
  kolAngka: { flex: 1.3, textAlign: "right" },
  kolKecil: { flex: 0.8, textAlign: "right" },
  kolTgl: { width: 62 },
  kolKet: { flex: 1 },
  kolUang: { width: 86, textAlign: "right" },
  kotak: { borderWidth: 0.5, borderColor: WARNA.garis, borderRadius: 4, padding: 10, marginTop: 6 },
  catatan: { fontSize: 8.5, color: WARNA.muted, lineHeight: 1.4 },
  mono: { fontFamily: "Courier", fontSize: 9 },
  footer: { position: "absolute", left: 40, right: 40, bottom: 28, fontSize: 8, color: WARNA.muted, flexDirection: "row", justifyContent: "space-between" },
  tandaAir: { position: "absolute", top: 330, left: 60, fontSize: 64, fontFamily: "Helvetica-Bold", color: WARNA.tandaAir, opacity: 0.45, transform: "rotate(-28deg)" },
  kosong: { marginTop: 10, color: WARNA.muted, fontStyle: "italic" },
});

function tanggalPanjang(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

/** QR sebagai kotak-kotak SVG — tanpa gambar raster, tanpa dependensi render. */
function Qr({ teks, ukuran }: { teks: string; ukuran: number }) {
  const qr = QRCode.create(teks, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const sel = ukuran / n;
  const kotak: { x: number; y: number }[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) kotak.push({ x: c * sel, y: r * sel });
    }
  }
  return (
    <Svg width={ukuran} height={ukuran} viewBox={`0 0 ${ukuran} ${ukuran}`}>
      <Rect x={0} y={0} width={ukuran} height={ukuran} fill="#FFFFFF" />
      {kotak.map((k, i) => (
        <Rect key={i} x={k.x} y={k.y} width={sel} height={sel} fill={WARNA.ink} />
      ))}
    </Svg>
  );
}

function Footer({ nomor }: { nomor: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{nomor}</Text>
      <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
    </View>
  );
}

function GrafikPemasukan({ data }: { data: DataBerkas }) {
  const lebar = 515;
  const tinggi = 110;
  const maks = Math.max(1, ...data.bulanan.map((b) => b.masuk));
  const n = data.bulanan.length;
  const celah = 8;
  const lebarBatang = (lebar - celah * (n + 1)) / n;
  return (
    <View style={{ marginTop: 8 }}>
      <Svg width={lebar} height={tinggi + 18} viewBox={`0 0 ${lebar} ${tinggi + 18}`}>
        <Rect x={0} y={tinggi} width={lebar} height={0.5} fill={WARNA.garis} />
        {data.bulanan.map((b, i) => {
          const h = Math.round((b.masuk / maks) * (tinggi - 6));
          const x = celah + i * (lebarBatang + celah);
          return (
            <Rect key={b.bulan} x={x} y={tinggi - h} width={lebarBatang} height={h} fill={WARNA.emas} />
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", marginTop: 2 }}>
        {data.bulanan.map((b) => (
          <Text key={b.bulan} style={{ flex: 1, fontSize: 7.5, color: WARNA.muted, textAlign: "center" }}>
            {BULAN[Number(b.bulan.slice(5)) - 1].slice(0, 3)}
          </Text>
        ))}
      </View>
      <Text style={[s.catatan, { marginTop: 4 }]}>Pemasukan per bulan (batang tertinggi = {formatRupiah(maks)}).</Text>
    </View>
  );
}

export function BerkasPdf({ input }: { input: BerkasPdfInput }) {
  const { data, label, nomorDokumen, kodeVerifikasi, tanggalTerbit, urlVerifikasi, pratinjau } = input;
  const periode = labelRentang(data.periodeAwal, data.periodeAkhir);

  const sampul = (
    <Page size="A4" style={s.page}>
      {pratinjau ? <Text style={s.tandaAir}>PRATINJAU</Text> : null}
      <View style={{ marginBottom: 22 }}>
        <Text style={s.judul}>{label}</Text>
        <Text style={s.subJudul}>Periode {periode}</Text>
      </View>

      <View style={s.bagian}>
        <View style={s.barisKV}><Text style={s.kunci}>Nama usaha</Text><Text style={s.nilai}>{data.usaha.nama}</Text></View>
        <View style={s.barisKV}><Text style={s.kunci}>Nama pemilik</Text><Text style={s.nilai}>—</Text></View>
        <View style={s.barisKV}><Text style={s.kunci}>Kota / kabupaten</Text><Text style={s.nilai}>{data.usaha.kota ?? "—"}</Text></View>
        <View style={s.barisKV}><Text style={s.kunci}>Bidang usaha</Text><Text style={s.nilai}>{data.usaha.kategori ?? "—"}</Text></View>
        <View style={s.barisKV}><Text style={s.kunci}>Tanggal terbit</Text><Text style={s.nilai}>{tanggalPanjang(tanggalTerbit)}</Text></View>
        <View style={s.barisKV}><Text style={s.kunci}>Nomor dokumen</Text><Text style={[s.nilai, s.mono]}>{nomorDokumen}</Text></View>
        <View style={s.barisKV}><Text style={s.kunci}>Kode verifikasi</Text><Text style={[s.nilai, s.mono]}>{kodeVerifikasi}</Text></View>
      </View>

      <View style={[s.kotak, { flexDirection: "row", alignItems: "center" }]}>
        <Qr teks={urlVerifikasi} ukuran={92} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Periksa keaslian dokumen</Text>
          <Text style={s.catatan}>Pindai kode ini atau buka {urlVerifikasi}. Halaman itu menampilkan nomor dokumen, periode, nama usaha, dan sidik jari (hash SHA-256) berkas ini — tanpa isi catatan keuangan.</Text>
        </View>
      </View>

      <View style={[s.kotak, { marginTop: 14 }]}>
        <Text style={s.catatan}>
          Dokumen ini disusun otomatis dari catatan harian pengguna di aplikasi AIDM (PT IDM Film Sejahtera).
          AIDM tidak mengajukan, menilai, atau memperantarai pinjaman. Penerimaan dokumen adalah wewenang penilai.
        </Text>
      </View>
      <Footer nomor={nomorDokumen} />
    </Page>
  );

  if (pratinjau) {
    return (
      <Document title={`${label} — ${periode} (pratinjau)`} author="AIDM" language="id">
        {sampul}
      </Document>
    );
  }

  return (
    <Document title={`${label} — ${periode}`} author="AIDM" language="id">
      {sampul}

      {/* ── Ringkasan periode ─────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <Text style={s.bagianJudul}>Ringkasan periode {periode}</Text>
        <View style={s.barisKepala}>
          <Text style={[s.th, s.kolBulan]}>Bulan</Text>
          <Text style={[s.th, s.kolAngka]}>Pemasukan</Text>
          <Text style={[s.th, s.kolAngka]}>Pengeluaran</Text>
          <Text style={[s.th, s.kolAngka]}>Sisa uang</Text>
          <Text style={[s.th, s.kolKecil]}>Hari aktif</Text>
          <Text style={[s.th, s.kolKecil]}>Transaksi</Text>
        </View>
        {data.bulanan.map((b) => (
          <View key={b.bulan} style={s.baris}>
            <Text style={s.kolBulan}>{labelBulan(b.bulan)}</Text>
            <Text style={s.kolAngka}>{formatRupiah(b.masuk)}</Text>
            <Text style={s.kolAngka}>{formatRupiah(b.keluar)}</Text>
            <Text style={[s.kolAngka, b.sisa < 0 ? { color: WARNA.danger } : {}]}>{formatRupiah(b.sisa)}</Text>
            <Text style={s.kolKecil}>{b.hariAktif}</Text>
            <Text style={s.kolKecil}>{b.jmlTransaksi}</Text>
          </View>
        ))}
        <View style={s.barisTotal}>
          <Text style={s.kolBulan}>Total</Text>
          <Text style={s.kolAngka}>{formatRupiah(data.total.masuk)}</Text>
          <Text style={s.kolAngka}>{formatRupiah(data.total.keluar)}</Text>
          <Text style={[s.kolAngka, data.total.sisa < 0 ? { color: WARNA.danger } : {}]}>{formatRupiah(data.total.sisa)}</Text>
          <Text style={s.kolKecil}>{data.total.hariAktif}</Text>
          <Text style={s.kolKecil}>{data.total.jmlTransaksi}</Text>
        </View>
        <Text style={[s.catatan, { marginTop: 8 }]}>
          Sisa uang = pemasukan dikurangi seluruh pengeluaran yang dicatat pada bulan itu, termasuk pengeluaran pribadi dan pembelian alat. Hari aktif = jumlah hari dengan minimal satu catatan.
        </Text>
        <GrafikPemasukan data={data} />
        <Footer nomor={nomorDokumen} />
      </Page>

      {/* ── Rincian per bulan — satu halaman per bulan, bulan kosong tetap ada ── */}
      {data.bulanan.map((b) => {
        const baris = data.rincian[b.bulan] ?? [];
        return (
          <Page key={b.bulan} size="A4" style={s.page}>
            <Text style={s.bagianJudul}>Rincian {labelBulan(b.bulan)}</Text>
            {baris.length === 0 ? (
              <Text style={s.kosong}>Tidak ada catatan pada bulan ini.</Text>
            ) : (
              <>
                <View style={s.barisKepala} fixed>
                  <Text style={[s.th, s.kolTgl]}>Tanggal</Text>
                  <Text style={[s.th, s.kolKet]}>Keterangan</Text>
                  <Text style={[s.th, s.kolUang]}>Masuk</Text>
                  <Text style={[s.th, s.kolUang]}>Keluar</Text>
                </View>
                {baris.map((t, i) => (
                  <View key={i} style={s.baris} wrap={false}>
                    <Text style={s.kolTgl}>{t.tanggal.slice(8, 10)}/{t.tanggal.slice(5, 7)}</Text>
                    <Text style={s.kolKet}>{t.keterangan}</Text>
                    <Text style={s.kolUang}>{t.masuk ? formatRupiah(t.masuk) : ""}</Text>
                    <Text style={s.kolUang}>{t.keluar ? formatRupiah(t.keluar) : ""}</Text>
                  </View>
                ))}
                <View style={s.barisTotal}>
                  <Text style={s.kolTgl}></Text>
                  <Text style={s.kolKet}>Jumlah bulan ini</Text>
                  <Text style={s.kolUang}>{formatRupiah(b.masuk)}</Text>
                  <Text style={s.kolUang}>{formatRupiah(b.keluar)}</Text>
                </View>
              </>
            )}
            <Footer nomor={nomorDokumen} />
          </Page>
        );
      })}

      {/* ── Penutup ─────────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <Text style={s.bagianJudul}>Pernyataan</Text>
        <Text style={{ lineHeight: 1.5 }}>
          Dokumen ini disusun otomatis dari catatan harian pengguna di aplikasi AIDM (PT IDM Film Sejahtera).
          AIDM tidak mengajukan, menilai, atau memperantarai pinjaman. Keaslian dokumen dapat diperiksa di {urlVerifikasi}.
        </Text>

        <Text style={[s.bagianJudul, { marginTop: 22 }]}>Dokumen pendamping yang biasanya diminta</Text>
        {["e-KTP pemilik usaha", "Kartu Keluarga (KK)", "NIB, atau Surat Keterangan Usaha (SKU) dari kelurahan/desa", "NPWP, bila ada"].map((d) => (
          <Text key={d} style={{ marginBottom: 3 }}>  •  {d}</Text>
        ))}
        <Text style={[s.catatan, { marginTop: 6 }]}>
          Daftar ini informasi umum; tiap lembaga bisa meminta dokumen lain. AIDM tidak menyimpan nomor dokumen-dokumen tersebut.
        </Text>

        <Text style={[s.bagianJudul, { marginTop: 22 }]}>Notarisasi hash kriptografis</Text>
        <View style={s.kotak}>
          <View style={s.barisKV}><Text style={s.kunci}>Nomor dokumen</Text><Text style={[s.nilai, s.mono]}>{nomorDokumen}</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Kode verifikasi</Text><Text style={[s.nilai, s.mono]}>{kodeVerifikasi}</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Tanggal terbit</Text><Text style={s.nilai}>{tanggalPanjang(tanggalTerbit)}</Text></View>
          <Text style={[s.catatan, { marginTop: 8 }]}>
            Sidik jari SHA-256 dari berkas PDF ini dicatat di {urlVerifikasi} dan dinotarisasi secara kriptografis pada tanggal terbit.
            Sidik jari tidak dicetak di dalam berkas karena ia dihitung dari seluruh isi berkas ini. Untuk memeriksa: buka halaman verifikasi, pilih berkas PDF ini di perangkat Anda — sidik jarinya dihitung di perangkat Anda sendiri dan dicocokkan; berkas tidak dikirim ke mana pun.
            Notarisasi ini membuktikan dokumen tidak berubah sejak diterbitkan. Ia bukan audit dan bukan penilaian pinjaman.
          </Text>
        </View>
        <Footer nomor={nomorDokumen} />
      </Page>
    </Document>
  );
}

export function renderBerkasPdf(input: BerkasPdfInput): Promise<Buffer> {
  return renderToBuffer(<BerkasPdf input={input} />);
}
