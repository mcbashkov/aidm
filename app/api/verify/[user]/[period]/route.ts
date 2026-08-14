import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  attestationAddress,
  explorerTxUrl,
  sealChain,
} from "@/lib/chains/attestation";

export const runtime = "nodejs";

const RE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/verify/:user/:period — endpoint PUBLIK verifikasi segel untuk
 * bank/koperasi (§11; dimajukan dari Fase 3 karena PDF §7.3 memuat blok
 * verifikasi yang perlu bisa dicek).
 *
 * TANPA auth — dan karena itu yang keluar HANYA bukti kriptografis: hash,
 * tx, waktu, alamat kontrak. TIDAK ADA satu pun angka keuangan, nama usaha,
 * atau canonical_json di respons ini; data itu milik pemilik laporan dan
 * hanya lewat PDF yang ia serahkan sendiri (§7.5 privasi).
 */
export async function GET(
  _req: Request,
  { params }: { params: { user: string; period: string } },
) {
  const { user, period } = params;
  if (!RE_UUID.test(user) || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Format tidak dikenal." }, { status: 400 });
  }

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Layanan verifikasi belum dikonfigurasi." },
      { status: 501 },
    );
  }

  try {
    const { data } = await supa
      .from("report_seals")
      .select("report_hash, tx_hash, sealed_at, status")
      .eq("user_id", user)
      .eq("period_key", period)
      .eq("is_latest", true)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(1);
    const baris = data?.[0];
    if (!baris) {
      return NextResponse.json(
        { error: "Tidak ada segel terkonfirmasi untuk periode ini." },
        { status: 404 },
      );
    }

    const chain = sealChain();
    return NextResponse.json({
      period,
      report_hash: baris.report_hash,
      tx_hash: baris.tx_hash,
      sealed_at: baris.sealed_at,
      chain: { name: chain.name, id: chain.id },
      contract: attestationAddress(),
      explorer_tx: baris.tx_hash ? explorerTxUrl(baris.tx_hash) : null,
      // Kalimat baku §7.5 ikut di API supaya integrator tidak menulis klaim
      // yang lebih besar daripada yang dibuktikan segel.
      note: "Verifikasi ini membuktikan laporan tidak berubah sejak disegel. Verifikasi ini bukan audit dan bukan penilaian kelayakan kredit.",
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal membaca segel." },
      { status: 500 },
    );
  }
}
