import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId, getKategoriMaps } from "@/lib/catat/server";
import { jsonPribadi } from "@/lib/api/respons";
import {
  KASBON_COLUMNS,
  kasbonKeItem,
  type KasbonRow,
} from "@/lib/kasbon/server";
import type { KasbonDaftar } from "@/lib/kasbon/tipe";

export const runtime = "nodejs";
// Data milik satu pengguna: tidak boleh pernah dirender statis maupun
// disimpan di cache bersama (lib/api/respons.ts).
export const dynamic = "force-dynamic";

/** Batas baris yang dibaca. Warung dengan ratusan kasbon AKTIF sekaligus
 *  sudah bukan kasus kartu ringkas; angka ini hanya pagar. */
const KASBON_MAKS = 300;

/**
 * GET /api/kasbon — kasbon yang BELUM lunas, dipisah piutang/utang, dengan
 * total yang dihitung di server (§7.3: layar tidak menjumlah sendiri).
 *
 * Tidak mengikuti periode laporan: kasbon aktif adalah keadaan SEKARANG,
 * bukan peristiwa dalam rentang tanggal. Tidak ada gerbang langganan —
 * kasbon lahir dari Catat, dan Catat gratis selamanya.
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
    const [maps, { data, error }] = await Promise.all([
      getKategoriMaps(supa),
      supa
        .from("kasbon")
        .select(KASBON_COLUMNS)
        .eq("user_id", uid)
        .eq("status", "aktif")
        .order("occurred_at", { ascending: false })
        .limit(KASBON_MAKS),
    ]);
    if (error) {
      return jsonPribadi({ error: "Gagal membaca kasbon." }, { status: 500 });
    }

    const items = ((data ?? []) as KasbonRow[]).map((r) =>
      kasbonKeItem(r, maps.byId),
    );
    const piutang = items.filter((k) => k.tipe === "piutang");
    const utang = items.filter((k) => k.tipe === "utang");
    const jumlah = (xs: typeof items) => xs.reduce((n, k) => n + k.amount, 0);

    const hasil: KasbonDaftar = {
      piutang,
      utang,
      totalPiutang: jumlah(piutang),
      totalUtang: jumlah(utang),
    };
    return jsonPribadi(hasil);
  } catch {
    return jsonPribadi(
      { error: "Terjadi gangguan. Coba lagi ya." },
      { status: 500 },
    );
  }
}
