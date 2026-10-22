import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { HEADER_DATA_PRIBADI, jsonPribadi } from "@/lib/api/respons";
import { idSah } from "@/lib/kasbon/server";
import { ambilInvoice } from "@/lib/invoice/server";
import { renderInvoicePdf, renderKuitansiPdf } from "@/lib/invoice/render";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/invoice/:id/pdf?jenis=invoice|kuitansi — dirender saat diminta,
 * tidak disimpan. Kuitansi hanya untuk invoice yang sudah lunas (409).
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const uid = currentUserId();
  if (!uid) return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  if (!idSah(params.id)) return jsonPribadi({ error: "Invoice tidak ditemukan." }, { status: 404 });
  const jenis = new URL(req.url).searchParams.get("jenis") ?? "invoice";
  if (jenis !== "invoice" && jenis !== "kuitansi") {
    return jsonPribadi({ error: "jenis harus invoice atau kuitansi." }, { status: 400 });
  }
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }
  try {
    const inv = await ambilInvoice(supa, uid, params.id);
    if (!inv) return jsonPribadi({ error: "Invoice tidak ditemukan." }, { status: 404 });
    if (jenis === "kuitansi" && inv.status !== "lunas") {
      return jsonPribadi({ error: "Kuitansi hanya untuk invoice yang sudah lunas.", kode: "BELUM_LUNAS" }, { status: 409 });
    }
    const { data: u } = await supa.from("users").select("nama_usaha, kota").eq("id", uid).maybeSingle();
    const usaha = { namaUsaha: (u as { nama_usaha: string | null } | null)?.nama_usaha?.trim() || "Usaha tanpa nama", kota: (u as { kota: string | null } | null)?.kota ?? null };
    const pdf = jenis === "kuitansi" ? await renderKuitansiPdf(inv, usaha) : await renderInvoicePdf(inv, usaha);
    const nama = jenis === "kuitansi" ? inv.nomor.replace(/^INV-/, "KW-") : inv.nomor;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        ...HEADER_DATA_PRIBADI,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nama}.pdf"`,
      },
    });
  } catch (err) {
    console.error(`[invoice] pdf gagal (uid=${uid}):`, err);
    return jsonPribadi({ error: "PDF belum bisa dibuat. Coba lagi ya." }, { status: 500 });
  }
}
