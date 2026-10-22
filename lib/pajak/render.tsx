/**
 * Dua PDF Modul Pajak OP (PERINTAH-AGEN-PREMIUM §Batch 9), pola
 * lib/berkas/render.tsx: @react-pdf/renderer, A4, Helvetica, tanpa library
 * baru. Dibaca petugas/konsultan pajak → aturan §0.2 berlaku penuh: nol kata
 * token/kripto/wallet/chain; notarisasi disebut "notarisasi hash kriptografis".
 *
 *   1. Rincian Peredaran Bruto per Bulan — "bahan pengisian SPT", BUKAN
 *      formulir resmi (format resmi belum diverifikasi; judulnya menyatakan
 *      itu). Disimpan di bucket privat `berkas`, hash dinotarisasi.
 *   2. Surat Pernyataan Omzet di Bawah Rp500 Juta — template dengan nama &
 *      NPWP yang diketik pengguna saat membuat. NPWP TIDAK disimpan: PDF ini
 *      tidak pernah menyentuh bucket maupun database; yang disimpan hanya
 *      hash + metadata. Tanda tangan dikosongkan.
 *
 * Setiap halaman memuat kalimat "Bukan nasihat pajak…" (perintah).
 */

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatRupiah } from "@/lib/transactions";
import { Footer, Qr, WARNA, gaya as s } from "@/lib/berkas/render";
import { NAMA_BULAN as BULAN, labelBulan } from "@/lib/berkas/label";
import { KALIMAT_BUKAN_NASIHAT, type HasilPajak } from "@/lib/pajak/hitung";
import type { RekapBuktiPotong } from "@/lib/invoice/server";

const p = StyleSheet.create({
  kolBulan: { flex: 1.3 },
  kolUang: { flex: 1.5, textAlign: "right" },
  kolKet: { flex: 1.4, textAlign: "right", color: WARNA.muted },
  tengah: { textAlign: "center" },
  judulSurat: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 30 },
  paragraf: { lineHeight: 1.6, marginTop: 10, fontSize: 10.5 },
  isian: { flexDirection: "row", paddingVertical: 3 },
  isianK: { width: 110 },
  isianV: { flex: 1, fontFamily: "Helvetica-Bold" },
  ttd: { marginTop: 36, alignItems: "flex-end" },
  ttdKotak: { width: 200, alignItems: "center" },
});

function tanggalPanjang(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

export interface ProfilPajak {
  namaUsaha: string;
  kota: string | null;
  kategori: string | null;
}

export interface RincianPdfInput {
  hasil: HasilPajak;
  profil: ProfilPajak;
  /** Batch 11: rekap bukti potong per klien tahun pajak ini (bila ada). */
  buktiPotong?: RekapBuktiPotong;
  nomorDokumen: string;
  kodeVerifikasi: string;
  tanggalTerbit: string; // YYYY-MM-DD WIB
  urlVerifikasi: string;
}

function KalimatNasihat() {
  return (
    <Text style={[s.catatan, { marginTop: 10, fontFamily: "Helvetica-Bold" }]}>{KALIMAT_BUKAN_NASIHAT}</Text>
  );
}

export function RincianPdf({ input }: { input: RincianPdfInput }) {
  const { hasil, profil, nomorDokumen, kodeVerifikasi, tanggalTerbit, urlVerifikasi, buktiPotong } = input;
  return (
    <Document title={`Rincian Peredaran Bruto per Bulan — Tahun Pajak ${hasil.tahun}`} author="AIDM" language="id">
      <Page size="A4" style={s.page}>
        <View style={{ marginBottom: 18 }}>
          <Text style={s.judul}>Rincian Peredaran Bruto per Bulan</Text>
          <Text style={s.subJudul}>Bahan pengisian SPT Tahunan PPh Orang Pribadi · Tahun Pajak {hasil.tahun}</Text>
        </View>

        <View style={s.bagian}>
          <View style={s.barisKV}><Text style={s.kunci}>Nama usaha</Text><Text style={s.nilai}>{profil.namaUsaha}</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Kota / kabupaten</Text><Text style={s.nilai}>{profil.kota ?? "—"}</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Bidang usaha</Text><Text style={s.nilai}>{profil.kategori ?? "—"}</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Tanggal terbit</Text><Text style={s.nilai}>{tanggalPanjang(tanggalTerbit)}</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Nomor dokumen</Text><Text style={[s.nilai, s.mono]}>{nomorDokumen}</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Kode verifikasi</Text><Text style={[s.nilai, s.mono]}>{kodeVerifikasi}</Text></View>
        </View>

        <Text style={s.bagianJudul}>Peredaran bruto per bulan</Text>
        <View style={s.barisKepala}>
          <Text style={[s.th, p.kolBulan]}>Bulan</Text>
          <Text style={[s.th, p.kolUang]}>Peredaran bruto</Text>
          <Text style={[s.th, p.kolUang]}>Kumulatif</Text>
          <Text style={[s.th, p.kolKet]}>Keterangan</Text>
          <Text style={[s.th, p.kolUang]}>Dasar PPh Final</Text>
          <Text style={[s.th, p.kolUang]}>PPh 0,5%</Text>
        </View>
        {hasil.bulanan.map((b) => (
          <View key={b.bulan} style={s.baris}>
            <Text style={p.kolBulan}>{labelBulan(b.bulan)}</Text>
            <Text style={p.kolUang}>{formatRupiah(b.omzet)}</Text>
            <Text style={p.kolUang}>{formatRupiah(b.kumulatif)}</Text>
            <Text style={p.kolKet}>{b.kenaPph ? "Kena PPh Final" : "Bebas (≤ Rp500 juta)"}</Text>
            <Text style={p.kolUang}>{b.kenaPph ? formatRupiah(b.dasarKena) : "—"}</Text>
            <Text style={p.kolUang}>{b.setoran > 0 ? formatRupiah(b.setoran) : "—"}</Text>
          </View>
        ))}
        <View style={s.barisTotal}>
          <Text style={p.kolBulan}>Total</Text>
          <Text style={p.kolUang}>{formatRupiah(hasil.omzetTahun)}</Text>
          <Text style={p.kolUang}></Text>
          <Text style={p.kolKet}>{hasil.melewati ? `Melewati batas sejak ${labelBulan(hasil.bulanMelewati ?? "")}` : "Di bawah batas bebas"}</Text>
          <Text style={p.kolUang}></Text>
          <Text style={p.kolUang}>{formatRupiah(hasil.totalSetoran)}</Text>
        </View>

        <View style={[s.kotak, { marginTop: 14 }]}>
          <Text style={s.catatan}>
            Peredaran bruto = seluruh pemasukan usaha yang dicatat dan dikonfirmasi pengguna di aplikasi AIDM pada bulan itu (tanggal WIB).
            Dasar hukum yang dirujuk: PP 20/2026 — bagian peredaran bruto sampai dengan Rp500.000.000 dalam satu tahun pajak tidak dikenai PPh;
            di atasnya dikenai PPh Final 0,5% atas bagian yang melebihi, disetor paling lambat tanggal 15 bulan berikutnya.
            Tabel ini bahan pengisian, bukan formulir resmi, dan hanya untuk wajib pajak orang pribadi — tidak berlaku untuk badan (CV/PT).
          </Text>
          <KalimatNasihat />
        </View>
        <Footer nomor={nomorDokumen} />
      </Page>

      <Page size="A4" style={s.page}>
        {buktiPotong && buktiPotong.jml > 0 ? (
          <View style={{ marginBottom: 22 }}>
            <Text style={s.bagianJudul}>Bukti potong PPh per klien · Tahun Pajak {hasil.tahun}</Text>
            <View style={s.barisKepala}>
              <Text style={[s.th, { flex: 2 }]}>Klien / pemotong</Text>
              <Text style={[s.th, s.kolKecil]}>Pembayaran</Text>
              <Text style={[s.th, s.kolKecil]}>Dipotong</Text>
              <Text style={[s.th, p.kolUang]}>Bruto</Text>
              <Text style={[s.th, p.kolUang]}>Potongan PPh</Text>
            </View>
            {buktiPotong.perKlien.map((k) => (
              <View key={k.klien} style={s.baris}>
                <Text style={{ flex: 2 }}>{k.klien}</Text>
                <Text style={s.kolKecil}>{k.jml}</Text>
                <Text style={s.kolKecil}>{k.terpotong}</Text>
                <Text style={p.kolUang}>{formatRupiah(k.bruto)}</Text>
                <Text style={p.kolUang}>{k.potongan > 0 ? formatRupiah(k.potongan) : "—"}</Text>
              </View>
            ))}
            <View style={s.barisTotal}>
              <Text style={{ flex: 2 }}>Total</Text>
              <Text style={s.kolKecil}>{buktiPotong.jml}</Text>
              <Text style={s.kolKecil}></Text>
              <Text style={p.kolUang}>{formatRupiah(buktiPotong.totalBruto)}</Text>
              <Text style={p.kolUang}>{formatRupiah(buktiPotong.totalPotongan)}</Text>
            </View>
            <Text style={[s.catatan, { marginTop: 6 }]}>
              Dicatat pengguna per pembayaran klien (status dipotong/nihil, nominal, nomor bukti potong bila ada). Potongan PPh yang sudah dipungut pihak lain
              dapat diperhitungkan dalam SPT — cocokkan dengan bukti potong aslinya.
            </Text>
          </View>
        ) : null}
        <Text style={s.bagianJudul}>Pernyataan</Text>
        <Text style={{ lineHeight: 1.5 }}>
          Dokumen ini disusun otomatis dari catatan harian pengguna di aplikasi AIDM (PT IDM Film Sejahtera).
          AIDM tidak menghitung, menetapkan, menyetor, atau melaporkan pajak atas nama siapa pun, dan tidak mengirim data ke DJP.
          Angka di dalamnya adalah catatan pengguna sendiri. Keaslian dokumen dapat diperiksa di {urlVerifikasi}.
        </Text>
        <KalimatNasihat />

        <Text style={[s.bagianJudul, { marginTop: 22 }]}>Notarisasi hash kriptografis</Text>
        <View style={[s.kotak, { flexDirection: "row", alignItems: "center" }]}>
          <Qr teks={urlVerifikasi} ukuran={92} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={s.barisKV}><Text style={s.kunci}>Nomor dokumen</Text><Text style={[s.nilai, s.mono]}>{nomorDokumen}</Text></View>
            <View style={s.barisKV}><Text style={s.kunci}>Kode verifikasi</Text><Text style={[s.nilai, s.mono]}>{kodeVerifikasi}</Text></View>
            <View style={s.barisKV}><Text style={s.kunci}>Tanggal terbit</Text><Text style={s.nilai}>{tanggalPanjang(tanggalTerbit)}</Text></View>
          </View>
        </View>
        <Text style={[s.catatan, { marginTop: 8 }]}>
          Sidik jari SHA-256 dari berkas PDF ini dicatat di {urlVerifikasi} dan dinotarisasi secara kriptografis pada tanggal terbit.
          Untuk memeriksa: buka halaman verifikasi, pilih berkas PDF ini di perangkat Anda — sidik jarinya dihitung di perangkat Anda sendiri dan dicocokkan; berkas tidak dikirim ke mana pun.
          Notarisasi membuktikan dokumen tidak berubah sejak diterbitkan; ia bukan audit dan bukan pemeriksaan pajak.
        </Text>
        <Footer nomor={nomorDokumen} />
      </Page>
    </Document>
  );
}

export interface PernyataanPdfInput {
  tahun: number;
  omzetTahun: number;
  /** Diketik pengguna saat membuat; tidak pernah disimpan. */
  nama: string;
  /** Diketik pengguna saat membuat; tidak pernah disimpan. */
  npwp: string;
  profil: ProfilPajak;
  nomorDokumen: string;
  kodeVerifikasi: string;
  tanggalTerbit: string;
  urlVerifikasi: string;
}

export function PernyataanPdf({ input }: { input: PernyataanPdfInput }) {
  const { tahun, omzetTahun, nama, npwp, profil, nomorDokumen, kodeVerifikasi, tanggalTerbit, urlVerifikasi } = input;
  return (
    <Document title={`Surat Pernyataan Omzet — Tahun Pajak ${tahun}`} author="AIDM" language="id">
      <Page size="A4" style={s.page}>
        <Text style={p.judulSurat}>SURAT PERNYATAAN</Text>
        <Text style={[p.tengah, { color: WARNA.muted, marginTop: 4 }]}>Peredaran Bruto Usaha di Bawah Rp500.000.000 · Tahun Pajak {tahun}</Text>

        <Text style={[p.paragraf, { marginTop: 28 }]}>Yang bertanda tangan di bawah ini:</Text>
        <View style={{ marginTop: 6, marginLeft: 16 }}>
          <View style={p.isian}><Text style={p.isianK}>Nama</Text><Text style={p.isianV}>: {nama}</Text></View>
          <View style={p.isian}><Text style={p.isianK}>NPWP</Text><Text style={p.isianV}>: {npwp}</Text></View>
          <View style={p.isian}><Text style={p.isianK}>Nama usaha</Text><Text style={p.isianV}>: {profil.namaUsaha}</Text></View>
          <View style={p.isian}><Text style={p.isianK}>Kota / kabupaten</Text><Text style={p.isianV}>: {profil.kota ?? "—"}</Text></View>
          <View style={p.isian}><Text style={p.isianK}>Bidang usaha</Text><Text style={p.isianV}>: {profil.kategori ?? "—"}</Text></View>
        </View>

        <Text style={p.paragraf}>
          dengan ini menyatakan bahwa peredaran bruto dari usaha saya sebagai wajib pajak orang pribadi dalam Tahun Pajak {tahun}{" "}
          adalah sebesar <Text style={{ fontFamily: "Helvetica-Bold" }}>{formatRupiah(omzetTahun)}</Text>, berdasarkan catatan harian saya di aplikasi AIDM,
          yaitu <Text style={{ fontFamily: "Helvetica-Bold" }}>di bawah Rp500.000.000 (lima ratus juta rupiah)</Text>. Sesuai PP 20/2026, bagian peredaran bruto
          sampai dengan jumlah tersebut dalam satu tahun pajak tidak dikenai Pajak Penghasilan.
        </Text>
        <Text style={p.paragraf}>
          Demikian pernyataan ini saya buat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya. Apabila di kemudian hari pernyataan ini
          ternyata tidak benar, saya bersedia bertanggung jawab sesuai ketentuan yang berlaku.
        </Text>

        <View style={p.ttd}>
          <View style={p.ttdKotak}>
            <Text>{profil.kota ?? "……………"}, {tanggalPanjang(tanggalTerbit)}</Text>
            <Text style={{ color: WARNA.muted, marginTop: 4 }}>Yang menyatakan,</Text>
            <View style={{ height: 64 }} />
            <Text style={{ fontFamily: "Helvetica-Bold" }}>( {nama} )</Text>
          </View>
        </View>

        <View style={[s.kotak, { marginTop: 30, flexDirection: "row", alignItems: "center" }]}>
          <Qr teks={urlVerifikasi} ukuran={64} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.catatan}>
              Nomor dokumen <Text style={s.mono}>{nomorDokumen}</Text> · kode verifikasi <Text style={s.mono}>{kodeVerifikasi}</Text>.
              Template disusun aplikasi AIDM (PT IDM Film Sejahtera); isi pernyataan adalah tanggung jawab yang menyatakan. AIDM tidak menyimpan NPWP
              dan nama yang tertulis di sini — berkas ini hanya ada di perangkat Anda; sidik jari SHA-256-nya dicatat di {urlVerifikasi} dan dinotarisasi
              secara kriptografis pada tanggal terbit.
            </Text>
            <KalimatNasihat />
          </View>
        </View>
        <Footer nomor={nomorDokumen} />
      </Page>
    </Document>
  );
}

export function renderRincianPdf(input: RincianPdfInput): Promise<Buffer> {
  return renderToBuffer(<RincianPdf input={input} />);
}

export function renderPernyataanPdf(input: PernyataanPdfInput): Promise<Buffer> {
  return renderToBuffer(<PernyataanPdf input={input} />);
}
