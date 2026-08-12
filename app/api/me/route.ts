import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDailyFree } from "@/lib/credits";

export const runtime = "nodejs";

function currentUserId(): string | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  return readSessionValue(raw)?.uid ?? null;
}

/** Profil + saldo kredit + (placeholder) saldo IDMX/IDM (§11 GET /api/me). */
export async function GET() {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ authenticated: false });
  }
  try {
    const supa = createSupabaseAdminClient();
    // Kredit gratis harian (§7.1 alur #4) — idempoten per hari WIB.
    const credits = await ensureDailyFree(supa, uid);
    const [{ data: user }, { data: wallet }] = await Promise.all([
      supa
        .from("users")
        .select(
          "id, role, earner_type, nama_usaha, kategori_id, sub_kategori, kota, provinsi, email, phone",
        )
        .eq("id", uid)
        .single(),
      supa
        .from("wallets")
        .select("address, external_address, chain_default")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    // Saldo token dibaca on-chain di milestone selanjutnya (M4/M5).
    return NextResponse.json({
      authenticated: true,
      user,
      wallet,
      credits,
      idmx: 0,
      idm: 0,
    });
  } catch {
    return NextResponse.json({ authenticated: true, unconfigured: true });
  }
}

/** Update peran/kategori/kota (§11 PATCH /api/me). */
export async function PATCH(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let patch: Record<string, unknown> = {};
  try {
    patch = (await req.json()) as Record<string, unknown>;
  } catch {
    /* kosong */
  }

  const update: Record<string, unknown> = {};
  if (patch.role === "calon" || patch.role === "umkm") update.role = patch.role;
  // v3.0 (§7.1): peran penghasilan menggantikan `role` di UI. Nilai divalidasi
  // di sini karena kolomnya punya CHECK constraint — nilai asing akan ditolak
  // Postgres dan menggagalkan seluruh update, bukan cuma field ini.
  if (
    typeof patch.earner_type === "string" &&
    ["dagang", "ojol", "freelance", "online", "lainnya"].includes(
      patch.earner_type,
    )
  ) {
    update.earner_type = patch.earner_type;
  }
  if (typeof patch.nama_usaha === "string")
    update.nama_usaha = patch.nama_usaha.slice(0, 120);
  if (typeof patch.kota === "string") update.kota = patch.kota;
  if (typeof patch.provinsi === "string") update.provinsi = patch.provinsi;
  if (typeof patch.sub_kategori === "string")
    update.sub_kategori = patch.sub_kategori;

  try {
    const supa = createSupabaseAdminClient();
    if (typeof patch.kategori_slug === "string") {
      const { data: cat } = await supa
        .from("categories")
        .select("id")
        .eq("slug", patch.kategori_slug)
        .maybeSingle();
      if (cat) update.kategori_id = cat.id;
    }
    if (Object.keys(update).length > 0) {
      await supa.from("users").update(update).eq("id", uid);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }
}
