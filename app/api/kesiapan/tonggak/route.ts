import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { jsonPribadi } from "@/lib/api/respons";
import { hapusCacheKesiapan } from "@/lib/kesiapan/server";

export const runtime = "nodejs";

/**
 * POST /api/kesiapan/tonggak {tingkat: "siap3"|"siap6"} — toast tonggak sudah
 * tampil, sekali seumur akun (0034). Idempoten: baris yang sudah ada diabaikan.
 * Menandai siap6 juga menandai siap3: bila tingkat turun lagi ke siap3,
 * pengguna tidak perlu diberi tahu hal yang sudah pernah dilampauinya.
 */
export async function POST(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  }
  let tingkat = "";
  try {
    const body = (await req.json()) as { tingkat?: unknown };
    tingkat = typeof body.tingkat === "string" ? body.tingkat : "";
  } catch {
    /* body kosong → ditolak di bawah */
  }
  if (tingkat !== "siap3" && tingkat !== "siap6") {
    return jsonPribadi({ error: "tingkat harus siap3 atau siap6." }, { status: 400 });
  }
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }
  const baris = (tingkat === "siap6" ? ["siap3", "siap6"] : ["siap3"]).map(
    (t) => ({ user_id: uid, tingkat: t }),
  );
  const { error } = await supa
    .from("kesiapan_tonggak")
    .upsert(baris, { onConflict: "user_id,tingkat", ignoreDuplicates: true });
  if (error) {
    return jsonPribadi({ error: "Gagal menandai." }, { status: 500 });
  }
  hapusCacheKesiapan(uid);
  return jsonPribadi({ ok: true });
}
