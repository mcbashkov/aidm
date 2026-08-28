import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { pekanIso } from "@/lib/missions/server";
import { todayWib } from "@/lib/wib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

/**
 * POST /api/missions/lihat-laporan — menandai misi "Buka Laporan minggu ini".
 *
 * Ini satu-satunya misi yang TIDAK bisa diturunkan dari data sumber. Tiga misi
 * pencatatan lain dibaca ulang dari tabel `transactions` setiap kali layar
 * dibuka, sehingga menghapus transaksi otomatis menurunkan progresnya (AC
 * §7.6). Membaca laporan tidak meninggalkan jejak seperti itu — ia peristiwa,
 * dan peristiwa harus dicatat saat terjadi atau hilang selamanya.
 *
 * Karena itu ia memakai `mission_events`, tabel yang memang untuk itu, berikut
 * indeks uniknya dari 0016: `(user_id, mission_id, progress->>'period_key')`.
 * Idempotensinya ditegakkan DATABASE — membuka Laporan lima kali sehari
 * menghasilkan satu baris, bukan lima, tanpa endpoint ini perlu memeriksa
 * apa pun lebih dulu.
 *
 * Yang dicatat hanyalah "pengguna ini membuka Laporan pada pekan ini". Tidak
 * ada periode laporan yang dilihat, tidak ada angka, tidak ada durasi — misi
 * ini membayar kebiasaan membaca, dan itu tidak menuntut kita mengumpulkan
 * lebih dari satu bit per pekan.
 */
export async function POST() {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
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
    const { data: misi } = await supa
      .from("missions")
      .select("id")
      .eq("code", "open_report_weekly")
      .eq("aktif", true)
      .maybeSingle();
    // Misi dinonaktifkan admin → diam saja. Layar Laporan tidak boleh
    // menampilkan galat gara-gara sebuah misi sedang dimatikan.
    if (!misi) return NextResponse.json({ ok: true, dicatat: false });

    const periodKey = pekanIso(todayWib());
    const { error } = await supa.from("mission_events").insert({
      user_id: uid,
      mission_id: misi.id,
      progress: { period_key: periodKey },
      completed_at: new Date().toISOString(),
    });

    // 23505 = sudah tercatat pekan ini. Itu jalur kerja normal, bukan galat.
    const kode = (error as { code?: string } | null)?.code;
    if (error && kode !== "23505") {
      console.error(`[misi] catat buka laporan gagal (sqlstate=${kode ?? "-"}):`, error);
      return NextResponse.json({ error: "Gagal mencatat." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, dicatat: !error, periodKey });
  } catch (err) {
    console.error("[misi] catat buka laporan gagal:", err);
    return NextResponse.json({ error: "Gagal mencatat." }, { status: 500 });
  }
}
