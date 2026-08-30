import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bacaNominalJawaban } from "@/lib/parse/fallback";
import {
  currentUserId,
  getKategoriMaps,
  rowToTx,
  TX_COLUMNS,
  type TxRow,
} from "@/lib/catat/server";

export const runtime = "nodejs";

/** Batas kewarasan nominal — selaras dengan validasi parser. */
const AMOUNT_MAX = 10_000_000_000;

/**
 * POST /api/catat/konfirmasi (§11): {draft_id, jawaban} → lengkapi draft
 * jadi confirmed (§7.2 alur #6). Rollup harian terisi otomatis oleh trigger
 * saat status berpindah draft → confirmed.
 */
export async function POST(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let draftId = "";
  let jawaban = "";
  try {
    const body = (await req.json()) as { draft_id?: string; jawaban?: string };
    draftId = (body.draft_id ?? "").trim();
    jawaban = (body.jawaban ?? "").trim().slice(0, 200);
  } catch {
    /* body kosong */
  }
  if (!draftId || !jawaban) {
    return NextResponse.json(
      { error: "draft_id dan jawaban wajib diisi" },
      { status: 400 },
    );
  }

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }

  try {
    // Hanya draft MILIK user ini (otorisasi per-baris di lapisan API).
    const { data: draft } = await supa
      .from("transactions")
      .select(TX_COLUMNS)
      .eq("id", draftId)
      .eq("user_id", uid)
      .eq("status", "draft")
      .maybeSingle();
    if (!draft) {
      return NextResponse.json(
        { error: "Draft tidak ditemukan." },
        { status: 404 },
      );
    }

    const nominal = bacaNominalJawaban(jawaban);
    if (nominal === null || nominal <= 0 || nominal > AMOUNT_MAX) {
      // Bukan error — angka belum tertangkap; tanya ulang, jangan mengarang.
      // BENTUK, bukan kalimat — kalimatnya disusun lib/catat/pesan.ts, sama
      // dengan seluruh teks lain yang dilihat pengguna di jalur Catat.
      return NextResponse.json({
        ok: false,
        pertanyaan: { jenis: "nominal_tidak_terbaca" },
      });
    }

    const { data: updated, error } = await supa
      .from("transactions")
      .update({ amount: nominal, status: "confirmed" })
      .eq("id", draftId)
      .eq("user_id", uid)
      .eq("status", "draft")
      .select(TX_COLUMNS)
      .maybeSingle();
    if (error || !updated) {
      return NextResponse.json(
        { error: "Gagal melengkapi draft." },
        { status: 500 },
      );
    }

    const maps = await getKategoriMaps(supa);
    return NextResponse.json({
      ok: true,
      entry: rowToTx(updated as TxRow, maps.byId),
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi gangguan. Coba lagi ya." },
      { status: 500 },
    );
  }
}
