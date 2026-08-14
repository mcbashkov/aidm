import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { bolehSegel, rentangTanggal } from "@/lib/laporan/periode";
import {
  ambilRollups,
  breakdownKategori,
  bulanTercatat,
  ringkasDariRollups,
  ringkasSebelumnya,
  seriesDariRollups,
  statusSegel,
} from "@/lib/laporan/server";
import type { LaporanResponse } from "@/lib/laporan/types";

export const runtime = "nodejs";

/**
 * GET /api/laporan?period=2026-08 (§11).
 *
 * Mengembalikan ringkasan, deret harian, rincian kategori, status segel, dan
 * progres valuasi untuk satu periode. **Nol biaya AI** (§7.3): semuanya
 * aritmetika SQL — membuka Laporan tidak boleh memotong Kredit AI, jadi tidak
 * ada satu pun pemanggilan model di jalur ini.
 */
export async function GET(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const period = new URL(req.url).searchParams.get("period") ?? "30d";
  // Format tak dikenal ditolak, bukan diam-diam jadi "semua" — laporan tanpa
  // batas periode akan tampil seolah itu angka bulan ini.
  if (!/^\d{4}-\d{2}$/.test(period) && period !== "30d" && period !== "today") {
    return NextResponse.json({ error: "Periode tidak dikenal." }, { status: 400 });
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
    const rentang = rentangTanggal(period);
    const [rollups, kategori, sebelumnya, segel, bulan] = await Promise.all([
      ambilRollups(supa, uid, rentang),
      breakdownKategori(supa, uid, rentang),
      ringkasSebelumnya(supa, uid, period),
      statusSegel(supa, uid, period),
      bulanTercatat(supa, uid),
    ]);

    const body: LaporanResponse = {
      period,
      kini: ringkasDariRollups(rollups),
      sebelumnya,
      series: seriesDariRollups(rollups),
      masuk: kategori.masuk,
      keluar: kategori.keluar,
      segel,
      bolehSegel: bolehSegel(period),
      bulanTercatat: bulan,
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Gagal menyusun laporan. Coba lagi ya." },
      { status: 500 },
    );
  }
}
