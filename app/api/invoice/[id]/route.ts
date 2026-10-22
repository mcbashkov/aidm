import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { hapusCacheKesiapan } from "@/lib/kesiapan/server";
import { jsonPribadi } from "@/lib/api/respons";
import { idSah } from "@/lib/kasbon/server";
import type { PaymentMethod } from "@/lib/transactions";
import { GalatInvoice, batalkanInvoice, keKlien, lunasiInvoice } from "@/lib/invoice/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METODE: readonly PaymentMethod[] = ["tunai", "qris", "transfer", "ewallet"];

/**
 * PATCH /api/invoice/:id — {aksi: "lunas", catat, metode} | {aksi: "batal"}.
 * Lunas memakai pelunasan kasbon piutang-nya (RPC 0031): transaksi pemasukan
 * `jasa` lahir di sana bila `catat` true. Batal menutup piutangnya.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const uid = currentUserId();
  if (!uid) return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  if (!idSah(params.id)) return jsonPribadi({ error: "Invoice tidak ditemukan." }, { status: 404 });
  let b: { aksi?: unknown; catat?: unknown; metode?: unknown } = {};
  try {
    b = (await req.json()) as typeof b;
  } catch {
    /* ditolak di bawah */
  }
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }
  hapusCacheKesiapan(uid);
  try {
    if (b.aksi === "lunas") {
      if (typeof b.catat !== "boolean") {
        return jsonPribadi({ error: "catat (true/false) wajib diisi." }, { status: 400 });
      }
      const metode = typeof b.metode === "string" && (METODE as readonly string[]).includes(b.metode) ? (b.metode as PaymentMethod) : "transfer";
      const inv = await lunasiInvoice(supa, { userId: uid, id: params.id, catat: b.catat, metode });
      return jsonPribadi({ invoice: keKlien(inv) });
    }
    if (b.aksi === "batal") {
      const inv = await batalkanInvoice(supa, uid, params.id);
      return jsonPribadi({ invoice: keKlien(inv) });
    }
    return jsonPribadi({ error: 'aksi harus "lunas" atau "batal".' }, { status: 400 });
  } catch (err) {
    if (err instanceof GalatInvoice) {
      const status = err.kode === "TIDAK_DITEMUKAN" ? 404 : err.kode === "SUDAH_SELESAI" ? 409 : 400;
      return jsonPribadi({ error: err.message, kode: err.kode }, { status });
    }
    console.error(`[invoice] ${String(b.aksi)} gagal (uid=${uid}):`, err);
    return jsonPribadi({ error: "Terjadi gangguan. Coba lagi ya." }, { status: 500 });
  }
}
