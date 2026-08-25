import { jsonPribadi } from "@/lib/api/respons";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { todayWib } from "@/lib/parse/validate";
import {
  currentUserId,
  getKategoriMaps,
  rowToTx,
  TX_COLUMNS,
  type TxRow,
} from "@/lib/catat/server";
// Batas periode dibagi dengan layar Laporan (§7.3): chip "30 hari" di Riwayat
// dan di Laporan harus memotong rentang yang sama persis, kalau tidak daftar
// dan ringkasannya bercerita beda tentang periode yang sama.
import { rentangIso } from "@/lib/laporan/periode";

export const runtime = "nodejs";
// Data milik satu pengguna: tidak boleh pernah dirender statis maupun
// disimpan lapisan mana pun. `force-dynamic` mencegah Next membekukannya saat
// build, `revalidate = 0` mencegah cache data Next menyajikan salinan, dan
// header `private, no-store` (lewat jsonPribadi) menutup sisanya di browser
// serta perantara.
export const dynamic = "force-dynamic";
export const revalidate = 0;


const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

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
    return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
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
    return jsonPribadi(
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

    const { start, end } = rentangIso(period);
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

    // `created_at` adalah PEMECAH SERI, bukan hiasan.
    //
    // `occurred_at` dipatok ke 12.00 WIB pada hari kejadiannya (lihat
    // app/api/catat/route.ts) supaya tanggal laporan stabil lintas timezone —
    // itu keputusan yang benar dan tidak diubah di sini. Efek sampingnya:
    // SELURUH transaksi pada hari yang sama punya timestamp identik, sehingga
    // `ORDER BY occurred_at DESC` seri sepenuhnya dan Postgres bebas
    // mengembalikan urutan apa pun. Praktiknya ia mengembalikan urutan fisik,
    // yaitu yang TERLAMA di atas.
    //
    // Akibatnya terlihat di Beranda: "Transaksi terakhir" justru menampilkan
    // tiga catatan PERTAMA hari itu, dan catatan yang baru saja ditulis
    // pengguna tidak pernah muncul — meski totalnya sudah ikut berubah. Bukan
    // masalah kesegaran data, murni masalah urutan.
    const { data, count, error } = await query
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) {
      return jsonPribadi(
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

    return jsonPribadi(body);
  } catch {
    return jsonPribadi(
      { error: "Terjadi gangguan. Coba lagi ya." },
      { status: 500 },
    );
  }
}
