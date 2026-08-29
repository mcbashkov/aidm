import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { perpanjangLangganan } from "@/lib/langganan/server";
import {
  gagalFinal,
  lunas,
  tandaTanganCocok,
  type NotifikasiMidtrans,
} from "@/lib/langganan/midtrans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/langganan/webhook — notifikasi pembayaran Midtrans (§12).
 *
 * Endpoint ini TIDAK memakai cookie sesi: yang memanggilnya adalah server
 * Midtrans, bukan pengguna. Yang menggantikan autentikasi adalah TANDA TANGAN.
 * Tanpa verifikasi itu, siapa pun yang tahu URL-nya bisa memberi dirinya
 * langganan seumur hidup dengan satu POST — jadi verifikasi dijalankan
 * SEBELUM apa pun dibaca dari badan permintaan.
 *
 * Idempotensi: Midtrans mengirim notifikasi yang sama berulang kali (dan
 * mengulangnya bila kita tidak menjawab 200). Perpanjangan hanya dijalankan
 * saat status baris BERUBAH dari bukan-'paid' menjadi 'paid'; notifikasi
 * kedua menemukan barisnya sudah 'paid' dan tidak menambah hari apa pun.
 */
export async function POST(req: Request) {
  let n: NotifikasiMidtrans = {};
  try {
    n = (await req.json()) as NotifikasiMidtrans;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  if (!tandaTanganCocok(n)) {
    console.warn(`[langganan] webhook tanda tangan TIDAK cocok (order=${n.order_id ?? "-"})`);
    // 401, bukan 404: ini memang endpoint publik yang diketahui Midtrans.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const orderId = n.order_id;
  if (!orderId) return NextResponse.json({ error: "bad request" }, { status: 400 });

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    // 500 supaya Midtrans MENGULANG — kalau dijawab 200, pembayaran yang sah
    // hilang selamanya hanya karena database sedang tidak terjangkau.
    return NextResponse.json({ error: "unconfigured" }, { status: 500 });
  }

  const { data: pesanan } = await supa
    .from("subscription_orders")
    .select("id, user_id, periode_hari, status, harga_idr")
    .eq("midtrans_order_id", orderId)
    .maybeSingle();

  if (!pesanan) {
    console.error(`[langganan] webhook untuk pesanan tak dikenal: ${orderId}`);
    // 200: pesanannya memang tidak ada di sini, dan mengulang tidak akan
    // memunculkannya. Mengulang selamanya hanya membebani kedua pihak.
    return NextResponse.json({ ok: true, catatan: "pesanan tidak dikenal" });
  }

  // Nominal ikut diperiksa: tanda tangan membuktikan pesan datang dari
  // Midtrans, ia tidak membuktikan jumlahnya sesuai yang kita tagihkan.
  const dibayar = Math.round(Number(n.gross_amount ?? "0"));
  if (lunas(n) && dibayar !== pesanan.harga_idr) {
    console.error(
      `[langganan] nominal tidak cocok (order=${orderId} dibayar=${dibayar} ditagih=${pesanan.harga_idr})`,
    );
    await supa
      .from("subscription_orders")
      .update({ status: "failed", midtrans_status: n.transaction_status ?? null })
      .eq("id", pesanan.id);
    return NextResponse.json({ ok: true, catatan: "nominal tidak cocok" });
  }

  if (lunas(n)) {
    if (pesanan.status === "paid") {
      return NextResponse.json({ ok: true, catatan: "sudah diproses" });
    }
    // Transisi atomik: hanya baris yang MASIH belum 'paid' yang berubah.
    // Dua notifikasi bersamaan → hanya satu yang mendapat baris, satu
    // perpanjangan.
    const { data: berubah } = await supa
      .from("subscription_orders")
      .update({
        status: "paid",
        midtrans_status: n.transaction_status ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq("id", pesanan.id)
      .neq("status", "paid")
      .select("id");

    if (!berubah || berubah.length === 0) {
      return NextResponse.json({ ok: true, catatan: "sudah diproses" });
    }

    const berakhir = await perpanjangLangganan(
      supa,
      pesanan.user_id,
      "midtrans",
      pesanan.periode_hari,
    );
    console.log(`[langganan] ${orderId} lunas → aktif sampai ${berakhir}`);
    return NextResponse.json({ ok: true, berakhir });
  }

  if (gagalFinal(n)) {
    await supa
      .from("subscription_orders")
      .update({
        status: n.transaction_status === "expire" ? "expired" : "failed",
        midtrans_status: n.transaction_status ?? null,
      })
      .eq("id", pesanan.id)
      .neq("status", "paid");
  } else {
    await supa
      .from("subscription_orders")
      .update({ midtrans_status: n.transaction_status ?? null })
      .eq("id", pesanan.id)
      .neq("status", "paid");
  }

  return NextResponse.json({ ok: true });
}
