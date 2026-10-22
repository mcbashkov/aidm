/**
 * PDF invoice & kuitansi (PERINTAH-AGEN-PREMIUM §Batch 11) — pola
 * lib/berkas/render.tsx, A4, Helvetica, tanpa library baru. Dokumen kerja
 * antara pengguna dan kliennya: dirender saat diminta, tidak disimpan, tidak
 * dinotarisasi. Tanpa e-Meterai (tempat meterai dikosongkan untuk ditempel
 * sendiri bila diperlukan). Tanpa kata token/wallet/chain.
 */

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatRupiah } from "@/lib/transactions";
import { Footer, WARNA, gaya as s } from "@/lib/berkas/render";
import { NAMA_BULAN as BULAN } from "@/lib/berkas/label";
import { terbilangRupiah } from "@/lib/invoice/terbilang";
import type { InvoiceRow } from "@/lib/invoice/server";

const q = StyleSheet.create({
  judul: { fontSize: 24, fontFamily: "Helvetica-Bold", letterSpacing: 2 },
  stempel: { position: "absolute", top: 36, right: 40, borderWidth: 2, borderColor: WARNA.emas, color: WARNA.emas, paddingHorizontal: 10, paddingVertical: 4, fontSize: 14, fontFamily: "Helvetica-Bold", transform: "rotate(-8deg)" },
  dua: { flexDirection: "row", gap: 24, marginTop: 18 },
  kolom: { flex: 1 },
  label: { fontSize: 8.5, color: WARNA.muted, marginBottom: 2 },
  nilai: { fontSize: 10.5 },
  kolUraian: { flex: 1 },
  kolNominal: { width: 120, textAlign: "right" },
  total: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  totalKotak: { width: 240, borderTopWidth: 1, borderTopColor: WARNA.ink, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  terbilang: { marginTop: 6, fontSize: 9, color: WARNA.muted, fontStyle: "italic" },
  ttd: { marginTop: 40, flexDirection: "row", justifyContent: "flex-end" },
  ttdKotak: { width: 200, alignItems: "center" },
  meterai: { width: 70, height: 46, borderWidth: 0.5, borderColor: WARNA.garis, borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginBottom: 6 },
});

export interface PihakUsaha {
  namaUsaha: string;
  kota: string | null;
}

function tanggalPanjang(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

export function InvoicePdf({ inv, usaha }: { inv: InvoiceRow; usaha: PihakUsaha }) {
  const terbit = inv.created_at.slice(0, 10);
  return (
    <Document title={`Invoice ${inv.nomor}`} author="AIDM" language="id">
      <Page size="A4" style={s.page}>
        {inv.status === "lunas" ? <Text style={q.stempel}>LUNAS</Text> : null}
        {inv.status === "batal" ? <Text style={[q.stempel, { color: WARNA.danger, borderColor: WARNA.danger }]}>BATAL</Text> : null}
        <Text style={q.judul}>INVOICE</Text>
        <Text style={[s.subJudul, s.mono]}>{inv.nomor}</Text>

        <View style={q.dua}>
          <View style={q.kolom}>
            <Text style={q.label}>Dari</Text>
            <Text style={[q.nilai, { fontFamily: "Helvetica-Bold" }]}>{usaha.namaUsaha}</Text>
            {usaha.kota ? <Text style={q.nilai}>{usaha.kota}</Text> : null}
          </View>
          <View style={q.kolom}>
            <Text style={q.label}>Kepada</Text>
            <Text style={[q.nilai, { fontFamily: "Helvetica-Bold" }]}>{inv.klien}</Text>
          </View>
          <View style={q.kolom}>
            <Text style={q.label}>Tanggal terbit</Text>
            <Text style={q.nilai}>{tanggalPanjang(terbit)}</Text>
            <Text style={[q.label, { marginTop: 6 }]}>Jatuh tempo</Text>
            <Text style={q.nilai}>{inv.jatuh_tempo ? tanggalPanjang(inv.jatuh_tempo) : "—"}</Text>
          </View>
        </View>

        <View style={[s.barisKepala, { marginTop: 26 }]}>
          <Text style={[s.th, q.kolUraian]}>Uraian</Text>
          <Text style={[s.th, q.kolNominal]}>Nominal</Text>
        </View>
        <View style={s.baris}>
          <Text style={q.kolUraian}>{inv.uraian}</Text>
          <Text style={q.kolNominal}>{formatRupiah(Number(inv.nominal))}</Text>
        </View>
        <View style={q.total}>
          <View style={q.totalKotak}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Total</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{formatRupiah(Number(inv.nominal))}</Text>
          </View>
        </View>
        <Text style={[q.terbilang, { textAlign: "right" }]}>{terbilangRupiah(Number(inv.nominal))}</Text>

        <View style={[s.kotak, { marginTop: 26 }]}>
          <Text style={s.catatan}>
            Pembayaran dapat dilakukan ke rekening/metode yang disepakati dengan {usaha.namaUsaha}. Mohon cantumkan nomor invoice pada keterangan pembayaran.
            {inv.status === "lunas" && inv.lunas_at ? ` Dinyatakan LUNAS pada ${tanggalPanjang(inv.lunas_at.slice(0, 10))}.` : ""}
          </Text>
        </View>

        <View style={q.ttd}>
          <View style={q.ttdKotak}>
            <Text style={s.catatan}>{usaha.kota ?? "……………"}, {tanggalPanjang(terbit)}</Text>
            <View style={{ height: 54 }} />
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{usaha.namaUsaha}</Text>
          </View>
        </View>
        <Footer nomor={`${inv.nomor} · dibuat dengan AIDM`} />
      </Page>
    </Document>
  );
}

export function KuitansiPdf({ inv, usaha }: { inv: InvoiceRow; usaha: PihakUsaha }) {
  const tanggal = (inv.lunas_at ?? inv.created_at).slice(0, 10);
  const nomor = inv.nomor.replace(/^INV-/, "KW-");
  return (
    <Document title={`Kuitansi ${nomor}`} author="AIDM" language="id">
      <Page size="A4" style={s.page}>
        <Text style={q.judul}>KUITANSI</Text>
        <Text style={[s.subJudul, s.mono]}>{nomor}</Text>

        <View style={{ marginTop: 26 }}>
          <View style={s.barisKV}><Text style={s.kunci}>Telah terima dari</Text><Text style={[s.nilai, { fontFamily: "Helvetica-Bold" }]}>{inv.klien}</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Uang sejumlah</Text><Text style={[s.nilai, { fontFamily: "Helvetica-Bold" }]}>{formatRupiah(Number(inv.nominal))}</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Terbilang</Text><Text style={[s.nilai, { fontStyle: "italic" }]}>{terbilangRupiah(Number(inv.nominal))}</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Untuk pembayaran</Text><Text style={s.nilai}>{inv.uraian} (Invoice {inv.nomor})</Text></View>
          <View style={s.barisKV}><Text style={s.kunci}>Tanggal</Text><Text style={s.nilai}>{tanggalPanjang(tanggal)}</Text></View>
        </View>

        <View style={q.ttd}>
          <View style={q.ttdKotak}>
            <Text style={s.catatan}>{usaha.kota ?? "……………"}, {tanggalPanjang(tanggal)}</Text>
            <Text style={[s.catatan, { marginTop: 2 }]}>Penerima,</Text>
            <View style={{ height: 10 }} />
            <View style={q.meterai}><Text style={[s.catatan, { fontSize: 7 }]}>tempat meterai</Text><Text style={[s.catatan, { fontSize: 7 }]}>(bila diperlukan)</Text></View>
            <View style={{ height: 24 }} />
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{usaha.namaUsaha}</Text>
          </View>
        </View>

        <Text style={[s.catatan, { marginTop: 30 }]}>
          Kuitansi ini diterbitkan dari catatan pengguna di aplikasi AIDM (PT IDM Film Sejahtera) atas pembayaran invoice yang telah ditandai lunas. AIDM tidak menyediakan e-Meterai.
        </Text>
        <Footer nomor={`${nomor} · dibuat dengan AIDM`} />
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(inv: InvoiceRow, usaha: PihakUsaha): Promise<Buffer> {
  return renderToBuffer(<InvoicePdf inv={inv} usaha={usaha} />);
}

export function renderKuitansiPdf(inv: InvoiceRow, usaha: PihakUsaha): Promise<Buffer> {
  return renderToBuffer(<KuitansiPdf inv={inv} usaha={usaha} />);
}
