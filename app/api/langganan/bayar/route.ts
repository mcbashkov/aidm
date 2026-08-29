import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { HARGA_BULANAN_IDR, PERIODE_HARI } from "@/lib/langganan";
import { buatSnap, isMidtransConfigured } from "@/lib/langganan/midtrans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/langganan/bayar — buat pesanan + transaksi Snap Midtrans.
 *
 * Barisnya ditulis ke DB SEBELUM Snap dipanggil. Arah sebaliknya (Snap dulu,
 * baris menyusul) menghasilkan pembayaran yang sudah terjadi di Midtrans tapi
 * tidak dikenali webhook kita — uang masuk, langganan tidak menyala, dan tidak
 * ada jejak untuk menelusurinya. Pesanan yatim yang tidak pernah dibayar jauh
 * lebih murah daripada pembayaran yatim yang tidak pernah tercatat.
 */
export async function POST() {
  const uid = currentUserId();
  if (!uid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  if (!isMidtransConfigured()) {
    return NextResponse.json(
      { error: "Pembayaran belum dikonfigurasi di server ini." },
      { status: 501 },
    );
  }

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }

  // Panjang order_id Midtrans maksimal 50 karakter dan harus unik selamanya.
  const orderId = `aidm-${randomUUID()}`;

  try {
    const { data: baris, error } = await supa
      .from("subscription_orders")
      .insert({
        user_id: uid,
        periode_hari: PERIODE_HARI,
        harga_idr: HARGA_BULANAN_IDR,
        midtrans_order_id: orderId,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !baris) throw error ?? new Error("insert pesanan gagal");

    const { data: user } = await supa
      .from("users")
      .select("email")
      .eq("id", uid)
      .maybeSingle();

    const snap = await buatSnap({
      orderId,
      jumlahIdr: HARGA_BULANAN_IDR,
      email: user?.email ?? null,
    });

    return NextResponse.json({
      orderId,
      token: snap.token,
      redirectUrl: snap.redirectUrl,
    });
  } catch (err) {
    console.error(`[langganan] buat pembayaran gagal (uid=${uid}):`, err);
    // Pesanan yang sudah terlanjur tertulis ditandai gagal, bukan dibiarkan
    // menggantung selamanya di 'pending'.
    await supa
      .from("subscription_orders")
      .update({ status: "failed" })
      .eq("midtrans_order_id", orderId);
    return NextResponse.json(
      { error: "Pembayaran belum bisa dibuka. Coba lagi sebentar lagi." },
      { status: 502 },
    );
  }
}
