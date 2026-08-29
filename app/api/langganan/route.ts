import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import {
  mulaiMasaCoba,
  pemakaianBulanIni,
  statusLangganan,
} from "@/lib/langganan/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/langganan — status + pemakaian bulan ini.
 * POST /api/langganan — mulai masa coba 7 hari (sekali seumur akun).
 *
 * Pemakaian ikut dikembalikan karena layar /premium menampilkannya sebagai
 * keterangan kecil. Ia BUKAN penghitung yang dipamerkan: kuota adalah pagar
 * anti-abuse, dan pengguna normal tidak boleh pernah memikirkannya.
 */
export async function GET() {
  const uid = currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }

  try {
    const [langganan, pemakaian] = await Promise.all([
      statusLangganan(supa, uid),
      pemakaianBulanIni(supa, uid),
    ]);
    return NextResponse.json({ langganan, pemakaian });
  } catch (err) {
    // TIDAK menjawab "tidak aktif" saat pembacaan gagal — itu akan menyodorkan
    // ajakan berlangganan kepada orang yang sudah membayar.
    console.error("[langganan] baca status gagal:", err);
    return NextResponse.json(
      { error: "Status langganan belum bisa dibaca. Coba lagi sebentar lagi." },
      { status: 503 },
    );
  }
}

export async function POST() {
  const uid = currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }

  try {
    const sebelum = await statusLangganan(supa, uid);
    if (sebelum.cobaDipakai) {
      return NextResponse.json(
        {
          code: "COBA_SUDAH_DIPAKAI",
          message: "Masa coba gratis sudah pernah dipakai di akun ini.",
        },
        { status: 409 },
      );
    }
    const langganan = await mulaiMasaCoba(supa, uid);
    return NextResponse.json({ langganan });
  } catch (err) {
    console.error("[langganan] mulai masa coba gagal:", err);
    return NextResponse.json(
      { error: "Masa coba belum bisa dimulai. Coba lagi sebentar lagi." },
      { status: 500 },
    );
  }
}
