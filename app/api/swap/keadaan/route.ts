import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { jsonPribadi } from "@/lib/api/respons";
import { isSwapConfigured } from "@/lib/swap/config";
import { keadaanSwapServer } from "@/lib/swap/server-baca";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/**
 * GET /api/swap/keadaan — kedua kaki kontrak Tukar dibaca di server (Batch 8):
 * opBNB (saldo IDMX, minimum, sisa jatah mingguan, izin, jeda) dan BSC (kurs,
 * fee, jeda). Cache 10 detik per alamat; status per kaki; `pada` epoch ms.
 *
 * Alamat diambil dari dompet milik sesi, bukan dari query: saldo dan jatah
 * adalah data pribadi pemilik dompet.
 */
export async function GET() {
  const uid = currentUserId();
  if (!uid) {
    return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  }
  if (!isSwapConfigured()) {
    return jsonPribadi(
      { error: "Fitur Tukar belum dikonfigurasi di server ini." },
      { status: 501 },
    );
  }
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }
  const { data: w } = await supa
    .from("wallets")
    .select("address")
    .eq("user_id", uid)
    .maybeSingle();
  const alamat = w?.address as string | undefined;
  if (!alamat || !/^0x[0-9a-fA-F]{40}$/.test(alamat)) {
    return jsonPribadi({ error: "Dompet belum ada." }, { status: 404 });
  }
  return jsonPribadi(await keadaanSwapServer(alamat as `0x${string}`));
}
