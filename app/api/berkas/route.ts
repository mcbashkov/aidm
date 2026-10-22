import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { jsonPribadi } from "@/lib/api/respons";
import { KATALOG, labelBerkasPeran } from "@/lib/langganan/katalog";
import { BERKAS_COLUMNS, tuntaskanSegel, type BerkasRow } from "@/lib/berkas/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/berkas — dokumen milik pengguna, terbaru dulu. Segel yang
 *  menggantung dituntaskan di sini (pola GET /api/laporan/segel/:period). */
export async function GET() {
  const uid = currentUserId();
  if (!uid) return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }
  try {
    const [{ data: u }, { data, error }] = await Promise.all([
      supa.from("users").select("earner_type").eq("id", uid).maybeSingle(),
      supa
        .from("berkas_pengajuan")
        .select(BERKAS_COLUMNS)
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (error) throw error;
    const earner = (u as { earner_type: string | null } | null)?.earner_type ?? null;
    const items = [];
    for (let b of (data ?? []) as BerkasRow[]) {
      if (b.status === "pending_segel") b = await tuntaskanSegel(supa, b);
      items.push({
        id: b.id,
        kode: b.kode,
        label: labelBerkasPeran(earner, KATALOG[b.kode].bulan as 6 | 12),
        nomorDokumen: b.nomor_dokumen,
        kodeVerifikasi: b.kode_verifikasi,
        periodeAwal: b.periode_awal.slice(0, 7),
        periodeAkhir: b.periode_akhir.slice(0, 7),
        status: b.status,
        bisaUnduh: Boolean(b.path_pdf) && b.status !== "gagal",
        createdAt: b.created_at,
      });
    }
    return jsonPribadi({ items });
  } catch {
    return jsonPribadi({ error: "Daftar berkas belum bisa dibaca." }, { status: 500 });
  }
}
