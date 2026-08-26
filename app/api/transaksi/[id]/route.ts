import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { todayWib } from "@/lib/wib";
import {
  currentUserId,
  getKategoriMaps,
  rowToTx,
  TX_COLUMNS,
  type TxRow,
} from "@/lib/catat/server";
import {
  KATEGORI_MASUK,
  KATEGORI_KELUAR,
  type Jenis,
} from "@/lib/transactions";

export const runtime = "nodejs";

const AMOUNT_MAX = 10_000_000_000;

interface PatchBody {
  jenis?: unknown;
  amount?: unknown;
  kategori?: unknown;
  payment_method?: unknown;
  occurred_at?: unknown;
  catatan?: unknown;
}

function kategoriSah(slug: string, jenis: Jenis): boolean {
  const daftar = jenis === "masuk" ? KATEGORI_MASUK : KATEGORI_KELUAR;
  return daftar.some((k) => k.slug === slug);
}

/**
 * PATCH /api/transaksi/:id (§11) — edit entri dari kartu konfirmasi atau
 * sheet detail. Berbeda dari parser (yang mengoreksi diam-diam), input edit
 * manusia yang tidak sah DITOLAK 400 — user harus tahu editnya tidak
 * tersimpan, bukan diam-diam diganti nilai lain.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: PatchBody = {};
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    /* body kosong */
  }

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }

  try {
    const { data: existing } = await supa
      .from("transactions")
      .select(TX_COLUMNS)
      .eq("id", params.id)
      .eq("user_id", uid)
      .neq("status", "deleted")
      .maybeSingle();
    if (!existing) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 },
      );
    }
    const row = existing as TxRow;
    const maps = await getKategoriMaps(supa);

    const update: Record<string, unknown> = { parsed_by: "manual" };

    const jenisBaru: Jenis =
      body.jenis === "masuk" || body.jenis === "keluar"
        ? body.jenis
        : row.jenis;
    if (jenisBaru !== row.jenis) update.jenis = jenisBaru;

    if (body.amount !== undefined) {
      const n =
        typeof body.amount === "number" && Number.isFinite(body.amount)
          ? Math.round(body.amount)
          : NaN;
      if (!Number.isFinite(n) || n <= 0 || n > AMOUNT_MAX) {
        return NextResponse.json(
          { error: "Nominal harus bilangan positif." },
          { status: 400 },
        );
      }
      update.amount = n;
    }

    if (body.kategori !== undefined) {
      const slug = typeof body.kategori === "string" ? body.kategori : "";
      if (!kategoriSah(slug, jenisBaru)) {
        return NextResponse.json(
          { error: "Kategori tidak dikenal." },
          { status: 400 },
        );
      }
      update.kategori_id = maps.bySlug.get(slug) ?? null;
    } else if (jenisBaru !== row.jenis) {
      // Jenis berpindah tanpa kategori baru → kategori lama hampir pasti tak
      // sah di jenis baru; netralkan ke `lainnya` daripada menyimpan pasangan
      // jenis+kategori yang mustahil.
      const slugLama = (row.kategori_id && maps.byId.get(row.kategori_id)) || "lainnya";
      if (!kategoriSah(slugLama, jenisBaru)) {
        update.kategori_id = maps.bySlug.get("lainnya") ?? null;
      }
    }

    if (body.payment_method !== undefined) {
      const m = body.payment_method;
      if (m !== "tunai" && m !== "qris" && m !== "transfer" && m !== "ewallet") {
        return NextResponse.json(
          { error: "Metode bayar tidak dikenal." },
          { status: 400 },
        );
      }
      update.payment_method = m;
    }

    if (body.occurred_at !== undefined) {
      const iso = typeof body.occurred_at === "string" ? body.occurred_at : "";
      const t = Date.parse(iso);
      if (!Number.isFinite(t)) {
        return NextResponse.json(
          { error: "Tanggal tidak valid." },
          { status: 400 },
        );
      }
      // Tanggal WIB tidak boleh di masa depan (§17.1).
      const tglWib = todayWib(new Date(t));
      if (tglWib > todayWib()) {
        return NextResponse.json(
          { error: "Tanggal tidak boleh di masa depan." },
          { status: 400 },
        );
      }
      update.occurred_at = new Date(t).toISOString();
    }

    if (body.catatan !== undefined) {
      update.catatan =
        typeof body.catatan === "string" && body.catatan.trim()
          ? body.catatan.trim().slice(0, 200)
          : null;
    }

    // Draft yang nominalnya diisi lewat edit ikut naik jadi confirmed.
    if (row.status === "draft" && typeof update.amount === "number") {
      update.status = "confirmed";
    }

    const { data: updated, error } = await supa
      .from("transactions")
      .update(update)
      .eq("id", params.id)
      .eq("user_id", uid)
      .select(TX_COLUMNS)
      .maybeSingle();
    if (error || !updated) {
      return NextResponse.json(
        { error: "Gagal menyimpan perubahan." },
        { status: 500 },
      );
    }
    return NextResponse.json({ entry: rowToTx(updated as TxRow, maps.byId) });
  } catch {
    return NextResponse.json(
      { error: "Terjadi gangguan. Coba lagi ya." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/transaksi/:id (§11) — soft delete: status='deleted' +
 * deleted_at terisi. Baris tetap ada untuk audit; rollup harian dikurangi
 * otomatis oleh trigger.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }

  try {
    const { data: deleted, error } = await supa
      .from("transactions")
      .update({ status: "deleted", deleted_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("user_id", uid)
      .neq("status", "deleted")
      .select("id")
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { error: "Gagal menghapus." },
        { status: 500 },
      );
    }
    if (!deleted) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Terjadi gangguan. Coba lagi ya." },
      { status: 500 },
    );
  }
}
