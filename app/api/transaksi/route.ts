import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { todayWib } from "@/lib/parse/validate";
import {
  currentUserId,
  getKategoriMaps,
  rowToTx,
  wibDayStartIso,
  TX_COLUMNS,
  type TxRow,
} from "@/lib/catat/server";

export const runtime = "nodejs";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

/** Rentang [start, end) dalam ISO untuk nilai `period` (zona WIB). */
function rentangPeriode(period: string): { start?: string; end?: string } {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split("-").map(Number);
    const nextY = m === 12 ? y + 1 : y;
    const nextM = m === 12 ? 1 : m + 1;
    return {
      start: `${period}-01T00:00:00+07:00`,
      end: `${nextY}-${String(nextM).padStart(2, "0")}-01T00:00:00+07:00`,
    };
  }
  if (period === "30d") {
    return { start: new Date(Date.now() - 30 * 86_400_000).toISOString() };
  }
  if (period === "today") {
    return { start: wibDayStartIso() };
  }
  return {}; // "semua"
}

/**
 * GET /api/transaksi?period=&jenis=&kategori=&q=&page=&page_size=&ringkas=
 * (§11). Hanya baris `confirmed` milik user; draft hidup di chat sampai
 * dikonfirmasi, deleted tidak pernah keluar.
 *
 * `ringkas=1` menyertakan agregat hari ini dari daily_rollups — kartu "Sisa
 * hari ini" di Beranda tanpa memindai baris transaksi (§9.3 semangatnya).
 */
export async function GET(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? "semua";
  const jenis = url.searchParams.get("jenis");
  const kategori = url.searchParams.get("kategori");
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0") || 0);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number(url.searchParams.get("page_size") ?? "") || PAGE_SIZE_DEFAULT),
  );
  const ringkas = url.searchParams.get("ringkas") === "1";

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
    const maps = await getKategoriMaps(supa);

    let query = supa
      .from("transactions")
      .select(TX_COLUMNS, { count: "exact" })
      .eq("user_id", uid)
      .eq("status", "confirmed");

    const { start, end } = rentangPeriode(period);
    if (start) query = query.gte("occurred_at", start);
    if (end) query = query.lt("occurred_at", end);

    if (jenis === "masuk" || jenis === "keluar") {
      query = query.eq("jenis", jenis);
    }
    if (kategori) {
      const katId = maps.bySlug.get(kategori);
      // Slug tak dikenal → hasil kosong yang jujur, bukan filter yang diam-
      // diam diabaikan.
      query = query.eq("kategori_id", katId ?? "00000000-0000-0000-0000-000000000000");
    }
    if (q) {
      // Karakter sintaks PostgREST dibuang agar .or() tidak bisa disusupi
      // pola filter; pencarian tetap berfungsi untuk teks biasa.
      const aman = q.replace(/[%,()\\]/g, " ").trim();
      if (aman) {
        query = query.or(`catatan.ilike.%${aman}%,raw_input.ilike.%${aman}%`);
      }
    }

    const { data, count, error } = await query
      .order("occurred_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) {
      return NextResponse.json(
        { error: "Gagal membaca transaksi." },
        { status: 500 },
      );
    }

    const body: Record<string, unknown> = {
      items: ((data ?? []) as TxRow[]).map((r) => rowToTx(r, maps.byId)),
      page,
      page_size: pageSize,
      total: count ?? 0,
    };

    if (ringkas) {
      const { data: roll } = await supa
        .from("daily_rollups")
        .select("total_masuk, total_keluar, jml_transaksi, masuk_terverifikasi")
        .eq("user_id", uid)
        .eq("tanggal", todayWib())
        .maybeSingle();
      body.ringkas_hari_ini = {
        masuk: roll?.total_masuk ?? 0,
        keluar: roll?.total_keluar ?? 0,
        sisa: (roll?.total_masuk ?? 0) - (roll?.total_keluar ?? 0),
        jml_transaksi: roll?.jml_transaksi ?? 0,
        masuk_terverifikasi: roll?.masuk_terverifikasi ?? 0,
      };
    }

    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Terjadi gangguan. Coba lagi ya." },
      { status: 500 },
    );
  }
}
