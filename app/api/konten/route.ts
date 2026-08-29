import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { statusLangganan, pakaiKuota } from "@/lib/langganan/server";
import { premiumAktif, KUOTA_BULANAN } from "@/lib/langganan";
import { BATAS_TOPIK, formatSah } from "@/lib/konten";
import { buatKonten } from "@/lib/konten/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/konten — Generator Konten (§7.8), fitur Premium.
 *
 * Urutan penjagaan disengaja: langganan → pagar kuota → baru model dipanggil.
 * Membalik urutannya berarti membayar model untuk permintaan yang memang tidak
 * berhak dilayani.
 */
export async function POST(req: Request) {
  const uid = currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let format = "";
  let topik = "";
  try {
    const body = (await req.json()) as { format?: unknown; topik?: unknown };
    if (typeof body.format === "string") format = body.format;
    if (typeof body.topik === "string") topik = body.topik.trim();
  } catch {
    /* ditolak di bawah */
  }
  if (!formatSah(format)) {
    return NextResponse.json({ error: "Format konten tidak dikenal." }, { status: 400 });
  }
  if (topik.length < 3) {
    return NextResponse.json(
      { error: "Tulis dulu mau konten tentang apa." },
      { status: 400 },
    );
  }
  topik = topik.slice(0, BATAS_TOPIK);

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }

  try {
    const langganan = await statusLangganan(supa, uid);
    if (!premiumAktif(langganan)) {
      return NextResponse.json(
        {
          code: "PREMIUM_DIPERLUKAN",
          message: "Generator Konten ada di paket Premium.",
        },
        { status: 402 },
      );
    }

    const kuota = await pakaiKuota(supa, uid, "konten");
    if (!kuota.boleh) {
      return NextResponse.json(
        {
          code: "KUOTA_BULANAN",
          message: `Kamu sudah membuat ${KUOTA_BULANAN.konten} konten bulan ini. Kuotanya pulih awal bulan depan.`,
        },
        { status: 429 },
      );
    }

    const { data: profil } = await supa
      .from("users")
      .select("nama_usaha, kota, gaya_bahasa, categories:kategori_id(nama)")
      .eq("id", uid)
      .maybeSingle();
    const katRel = profil?.categories as
      | { nama?: string }
      | { nama?: string }[]
      | null;
    const kategori = Array.isArray(katRel) ? katRel[0]?.nama : katRel?.nama;

    const hasil = await buatKonten(format, topik, {
      namaUsaha: profil?.nama_usaha ?? null,
      kategori: kategori ?? null,
      kota: profil?.kota ?? null,
      gaya: profil?.gaya_bahasa ?? null,
    });

    if (!hasil.ok) {
      const pesan =
        hasil.alasan === "unconfigured"
          ? "Generator konten belum dikonfigurasi di server ini."
          : hasil.alasan === "timeout"
            ? "Pembuatan konten kelamaan. Coba lagi ya."
            : "Kontennya belum bisa dibuat. Coba ubah topiknya sedikit.";
      return NextResponse.json(
        { error: pesan },
        { status: hasil.alasan === "unconfigured" ? 501 : 502 },
      );
    }

    // Disimpan supaya pengguna bisa membukanya lagi tanpa memakai jatah kedua.
    const { data: baris } = await supa
      .from("content_generations")
      .insert({
        user_id: uid,
        format,
        input: { topik },
        output: hasil.hasil as unknown as Record<string, unknown>,
      })
      .select("id, created_at")
      .single();

    return NextResponse.json({
      id: baris?.id ?? null,
      createdAt: baris?.created_at ?? new Date().toISOString(),
      hasil: hasil.hasil,
      sisaKuota: kuota.sisa,
    });
  } catch (err) {
    console.error(`[konten] gagal (uid=${uid}):`, err);
    return NextResponse.json(
      { error: "Terjadi gangguan. Coba lagi sebentar lagi." },
      { status: 500 },
    );
  }
}

/** GET /api/konten — riwayat konten milik sendiri (10 terakhir). */
export async function GET() {
  const uid = currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }

  const { data, error } = await supa
    .from("content_generations")
    .select("id, format, input, output, created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("[konten] baca riwayat gagal:", error);
    return NextResponse.json({ error: "Riwayat belum bisa dibaca." }, { status: 503 });
  }
  return NextResponse.json({ items: data ?? [] });
}
