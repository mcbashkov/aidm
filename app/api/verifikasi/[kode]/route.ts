import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { explorerTxUrl } from "@/lib/chains/attestation";
import { normalisasiKode } from "@/lib/berkas/nomor";
import { BERKAS_COLUMNS, tuntaskanSegel, type BerkasRow } from "@/lib/berkas/server";
import {
  DOKUMEN_PAJAK_COLUMNS,
  labelDokumenPajak,
  tuntaskanSegelPajak,
  type DokumenPajakRow,
} from "@/lib/pajak/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/verifikasi/:kode — PUBLIK, tanpa sesi, TANPA data keuangan.
 * Yang dibuka: nomor dokumen, periode, nama usaha, sidik jari SHA-256, tanggal
 * terbit, status notarisasi. Pencocokan "cocok/tidak cocok" terjadi di
 * browser pembaca (hash dihitung dengan crypto.subtle; berkas tidak diunggah).
 */
export async function GET(_req: Request, { params }: { params: { kode: string } }) {
  const kode = normalisasiKode(params.kode ?? "");
  if (!kode) return NextResponse.json({ error: "Kode tidak dikenal." }, { status: 404 });
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Layanan verifikasi belum dikonfigurasi." }, { status: 501 });
  }
  try {
    const { data } = await supa
      .from("berkas_pengajuan")
      .select(BERKAS_COLUMNS)
      .eq("kode_verifikasi", kode)
      .in("status", ["dibuat", "pending_segel", "confirmed"])
      .maybeSingle();
    let b = data as BerkasRow | null;
    if (!b || !b.sha256) {
      // Dokumen pajak (0038, Batch 9) memakai ruang kode yang sama.
      const { data: dp } = await supa
        .from("dokumen_pajak")
        .select(DOKUMEN_PAJAK_COLUMNS)
        .eq("kode_verifikasi", kode)
        .in("status", ["dibuat", "pending_segel", "confirmed"])
        .maybeSingle();
      let d = dp as DokumenPajakRow | null;
      if (!d || !d.sha256) {
        return NextResponse.json({ error: "Dokumen dengan kode ini tidak ditemukan." }, { status: 404 });
      }
      if (d.status === "pending_segel") d = await tuntaskanSegelPajak(supa, d);
      const { data: u2 } = await supa.from("users").select("nama_usaha, kota").eq("id", d.user_id).maybeSingle();
      const usaha2 = u2 as { nama_usaha: string | null; kota: string | null } | null;
      return NextResponse.json(
        {
          nomor_dokumen: d.nomor_dokumen,
          jenis: d.jenis,
          label: labelDokumenPajak(d.jenis, d.tahun_pajak),
          tahun_pajak: d.tahun_pajak,
          periode_awal: `${d.tahun_pajak}-01`,
          periode_akhir: `${d.tahun_pajak}-12`,
          nama_usaha: usaha2?.nama_usaha ?? null,
          kota: usaha2?.kota ?? null,
          sha256: d.sha256,
          tanggal_terbit: d.created_at.slice(0, 10),
          notarisasi: {
            status: d.status === "confirmed" ? "tercatat" : d.status === "pending_segel" ? "menunggu" : "belum",
            tx_hash: d.status === "confirmed" ? d.tx_hash : null,
            explorer_tx: d.status === "confirmed" && d.tx_hash ? explorerTxUrl(d.tx_hash) : null,
          },
          note: "Halaman ini membuktikan dokumen tidak berubah sejak diterbitkan. Bukan audit, bukan pemeriksaan pajak, bukan penilaian pinjaman.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (b.status === "pending_segel") b = await tuntaskanSegel(supa, b);
    const { data: u } = await supa.from("users").select("nama_usaha, kota").eq("id", b.user_id).maybeSingle();
    const usaha = u as { nama_usaha: string | null; kota: string | null } | null;
    return NextResponse.json(
      {
        nomor_dokumen: b.nomor_dokumen,
        periode_awal: b.periode_awal.slice(0, 7),
        periode_akhir: b.periode_akhir.slice(0, 7),
        nama_usaha: usaha?.nama_usaha ?? null,
        kota: usaha?.kota ?? null,
        sha256: b.sha256,
        tanggal_terbit: b.created_at.slice(0, 10),
        notarisasi: {
          status: b.status === "confirmed" ? "tercatat" : b.status === "pending_segel" ? "menunggu" : "belum",
          tx_hash: b.status === "confirmed" ? b.tx_hash : null,
          explorer_tx: b.status === "confirmed" && b.tx_hash ? explorerTxUrl(b.tx_hash) : null,
        },
        note: "Halaman ini membuktikan dokumen tidak berubah sejak diterbitkan. Bukan audit, bukan penilaian pinjaman.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Gagal membaca dokumen." }, { status: 500 });
  }
}
