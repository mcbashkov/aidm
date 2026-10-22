import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { jsonPribadi } from "@/lib/api/respons";
import { ambilKesiapan } from "@/lib/kesiapan/server";

export const runtime = "nodejs";
// Data milik satu pengguna: tidak boleh dirender statis maupun di-cache
// bersama (lib/api/respons.ts). Cache per hari ada di dalam proses server.
export const dynamic = "force-dynamic";

/**
 * GET /api/kesiapan — Kesiapan Catatan (§1.4): tingkat, "N dari 6 bulan
 * terakhir aktif", checklist "apa yang kurang", syarat beli Berkas, dan
 * tonggak toast yang belum tampil. Tidak ada angka 0–100, tidak ada kata
 * "layak": ini kelengkapan catatan, bukan kelayakan kredit. Gratis.
 */
export async function GET() {
  const uid = currentUserId();
  if (!uid) {
    return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
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
  try {
    return jsonPribadi(await ambilKesiapan(supa, uid));
  } catch {
    return jsonPribadi(
      { error: "Kesiapan catatan belum bisa dihitung." },
      { status: 500 },
    );
  }
}
