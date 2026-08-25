import { jsonPribadi } from "@/lib/api/respons";
import { cookies } from "next/headers";
import { readSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDailyFree } from "@/lib/credits";
import { saldoIdmx } from "@/lib/token/saldo";

export const runtime = "nodejs";
// Data milik satu pengguna: tidak boleh pernah dirender statis maupun
// disimpan lapisan mana pun. `force-dynamic` mencegah Next membekukannya saat
// build, `revalidate = 0` mencegah cache data Next menyajikan salinan, dan
// header `private, no-store` (lewat jsonPribadi) menutup sisanya di browser
// serta perantara.
export const dynamic = "force-dynamic";
export const revalidate = 0;


function currentUserId(): string | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  return readSessionValue(raw)?.uid ?? null;
}

/** Profil + saldo kredit + (placeholder) saldo IDMX/IDM (§11 GET /api/me). */
export async function GET() {
  const uid = currentUserId();
  if (!uid) {
    return jsonPribadi({ authenticated: false });
  }
  try {
    const supa = createSupabaseAdminClient();
    // Kredit gratis harian (§7.1 alur #4) — idempoten per hari WIB.
    const credits = await ensureDailyFree(supa, uid);
    const [{ data: user }, { data: wallet }] = await Promise.all([
      supa
        .from("users")
        .select(
          "id, role, earner_type, nama_usaha, kategori_id, sub_kategori, kota, provinsi, email, phone, gaya_bahasa, categories:kategori_id(slug)",
        )
        .eq("id", uid)
        .single(),
      supa
        .from("wallets")
        .select("address, external_address, chain_default")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    // Slug kategori (dipakai onboarding untuk prefill chip §3) — relasi bisa
    // balik sebagai objek atau array tergantung driver, sama seperti di
    // /api/research/[id]/stream.
    const kategoriRel = (user as { categories?: unknown } | null)?.categories as
      | { slug?: string }
      | { slug?: string }[]
      | null
      | undefined;
    const kategori_slug = Array.isArray(kategoriRel)
      ? kategoriRel[0]?.slug
      : kategoriRel?.slug;
    const { categories: _categories, ...userRest } = (user ?? {}) as Record<
      string,
      unknown
    >;

    // Saldo IDMX dibaca on-chain (§9). `null` = belum bisa dipastikan, dan itu
    // BUKAN hal yang sama dengan nol — lihat lib/token/saldo.ts.
    //
    // Tidak ada `idm` di sini dengan sengaja: IDM Reborn hidup di BSC dan tidak
    // pernah menyentuh opBNB (Opsi B §9), jadi kartu wallet aplikasi hanya
    // berbicara tentang IDMX. Saldo IDM dilihat pengguna di wallet BSC-nya.
    const idmx = wallet?.address ? await saldoIdmx(wallet.address) : null;

    return jsonPribadi({
      authenticated: true,
      user: user ? { ...userRest, kategori_slug } : user,
      wallet,
      credits,
      idmx,
    });
  } catch {
    return jsonPribadi({ authenticated: true, unconfigured: true });
  }
}

/** Update peran/kategori/kota (§11 PATCH /api/me). */
export async function PATCH(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
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
  // Gaya bahasa ikut masuk prompt model (lib/agent/system-prompt.ts), jadi
  // daftar putihnya ditegakkan di sini SEBELUM menyentuh database — bukan
  // hanya mengandalkan CHECK constraint. Dua lapis, karena nilai yang lolos
  // ke prompt adalah permukaan serangan, bukan sekadar data yang jelek.
  if (
    typeof patch.gaya_bahasa === "string" &&
    ["santai", "netral", "formal"].includes(patch.gaya_bahasa)
  ) {
    update.gaya_bahasa = patch.gaya_bahasa;
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
    return jsonPribadi({ ok: true });
  } catch {
    return jsonPribadi(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }
}
