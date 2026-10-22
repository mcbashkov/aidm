import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { jsonPribadi, HEADER_DATA_PRIBADI } from "@/lib/api/respons";
import { idSah } from "@/lib/kasbon/server";
import { DOKUMEN_PAJAK_COLUMNS, urlUnduhPajak, type DokumenPajakRow } from "@/lib/pajak/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/pajak/dokumen/:id/unduh — 302 ke signed URL 10 menit (rincian saja). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const uid = currentUserId();
  if (!uid) return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  if (!idSah(params.id)) return jsonPribadi({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }
  const { data } = await supa
    .from("dokumen_pajak")
    .select(DOKUMEN_PAJAK_COLUMNS)
    .eq("id", params.id)
    .eq("user_id", uid)
    .maybeSingle();
  const d = data as DokumenPajakRow | null;
  if (!d || !d.path_pdf || d.status === "gagal") {
    return jsonPribadi({ error: "Dokumen tidak ditemukan." }, { status: 404 });
  }
  const url = await urlUnduhPajak(supa, d);
  if (!url) return jsonPribadi({ error: "Tautan unduh belum bisa dibuat." }, { status: 500 });
  return NextResponse.redirect(url, { status: 302, headers: HEADER_DATA_PRIBADI });
}
