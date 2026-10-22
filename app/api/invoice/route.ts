import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { hapusCacheKesiapan } from "@/lib/kesiapan/server";
import { jsonPribadi } from "@/lib/api/respons";
import { GalatInvoice, buatInvoice, daftarInvoice, keKlien } from "@/lib/invoice/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/invoice — invoice milik sesi (100 terakhir). Gratis. */
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
    return jsonPribadi({ items: await daftarInvoice(supa, uid) });
  } catch {
    return jsonPribadi({ error: "Daftar invoice belum bisa dibaca." }, { status: 500 });
  }
}

/**
 * POST /api/invoice {klien, uraian, nominal, jatuhTempo?} — terbitkan invoice
 * + piutang di tabel kasbon (Batch 11). Nominal rupiah bulat.
 */
export async function POST(req: Request) {
  const uid = currentUserId();
  if (!uid) return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  let b: { klien?: unknown; uraian?: unknown; nominal?: unknown; jatuhTempo?: unknown } = {};
  try {
    b = (await req.json()) as typeof b;
  } catch {
    /* ditolak di bawah */
  }
  if (typeof b.klien !== "string" || typeof b.uraian !== "string" || typeof b.nominal !== "number") {
    return jsonPribadi({ error: "klien, uraian, dan nominal wajib diisi." }, { status: 400 });
  }
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }
  hapusCacheKesiapan(uid);
  try {
    const inv = await buatInvoice(supa, {
      userId: uid,
      klien: b.klien,
      uraian: b.uraian,
      nominal: b.nominal,
      jatuhTempo: typeof b.jatuhTempo === "string" && b.jatuhTempo ? b.jatuhTempo : null,
    });
    return jsonPribadi({ invoice: keKlien(inv) });
  } catch (err) {
    if (err instanceof GalatInvoice) return jsonPribadi({ error: err.message, kode: err.kode }, { status: 400 });
    console.error(`[invoice] buat gagal (uid=${uid}):`, err);
    return jsonPribadi({ error: "Invoice belum bisa dibuat. Coba lagi ya." }, { status: 500 });
  }
}
