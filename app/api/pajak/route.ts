import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { jsonPribadi } from "@/lib/api/respons";
import { todayWib } from "@/lib/wib";
import { ringkasanPajak } from "@/lib/pajak/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pajak?tahun=YYYY — Modul Pajak OP (Batch 9). Gratis: omzet tahun
 * ini vs batas bebas Rp500 juta per bulan, bendera wajib pajak OP, dan
 * pengingat setoran. Premium (`pajak`, termasuk Plus): setoran per bulan
 * dibaca dari `hasil.bulanan[].setoran` — angkanya tetap dikirim karena ia
 * aritmetika atas catatan pengguna sendiri; yang dikunci adalah dokumen.
 * Bukan nasihat pajak.
 */
export async function GET(req: Request) {
  const uid = currentUserId();
  if (!uid) return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  const tahunParam = new URL(req.url).searchParams.get("tahun");
  const tahunIni = Number(todayWib().slice(0, 4));
  const tahun = tahunParam ? Number(tahunParam) : tahunIni;
  if (!Number.isInteger(tahun) || tahun < 2020 || tahun > tahunIni) {
    return jsonPribadi({ error: "Tahun pajak tidak dikenal." }, { status: 400 });
  }
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }
  try {
    return jsonPribadi(await ringkasanPajak(supa, uid, tahun));
  } catch (err) {
    console.error(`[pajak] ringkasan gagal (uid=${uid}):`, err);
    return jsonPribadi({ error: "Ringkasan pajak belum bisa dihitung." }, { status: 500 });
  }
}
