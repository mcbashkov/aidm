import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentSession } from "@/lib/catat/server";
import { jsonPribadi } from "@/lib/api/respons";
import { ambilKesiapan } from "@/lib/kesiapan/server";
import { KATALOG, PLUS_BERKAS_MAKS, kodeBerkasSah, syaratBeli } from "@/lib/langganan/katalog";
import { premiumAktif } from "@/lib/langganan";
import { statusLangganan } from "@/lib/langganan/server";
import { buatSnap, isMidtransConfigured } from "@/lib/langganan/midtrans";
import { buatBerkas, catatPremiumEvent, jumlahBerkasPlus } from "@/lib/berkas/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/berkas/pesan {kode} — dua jalur (§1.5):
 *   · AIDM Plus aktif & jatah wajar belum habis → dokumen dibuat sekarang
 *     (order NULL), tanpa bayar per dokumen;
 *   · selain itu → pesanan Midtrans sekali bayar dengan `kode`; webhook
 *     membuat dokumennya setelah lunas.
 * Syarat tingkat diperiksa di sini, bukan hanya di tombol: 409 bila belum.
 * Midtrans yang menolak (produksi 401 sejak 31 Agustus) → 502 dengan kalimat
 * "sedang disiapkan", bukan galat merah; klik tetap tercatat.
 */
export async function POST(req: Request) {
  const sesi = currentSession();
  if (!sesi) return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  const uid = sesi.uid;
  let kode: unknown;
  try {
    kode = ((await req.json()) as { kode?: unknown }).kode;
  } catch {
    /* ditolak di bawah */
  }
  if (!kodeBerkasSah(kode)) {
    return jsonPribadi({ error: "kode harus berkas6 atau berkas12." }, { status: 400 });
  }
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }

  try {
    const kesiapan = await ambilKesiapan(supa, uid);
    const syarat = syaratBeli(kode, kesiapan);
    void catatPremiumEvent(supa, { userId: uid, earnerType: kesiapan.earnerType, kode, aksi: "klik_beli" });
    if (!syarat.boleh) {
      return jsonPribadi({ error: syarat.alasan, kode: "BELUM_MEMENUHI_SYARAT" }, { status: 409 });
    }

    // Jalur Plus: tanpa bayar per dokumen, wajar maks PLUS_BERKAS_MAKS/365 hari.
    const langganan = await statusLangganan(supa, uid);
    if (premiumAktif(langganan) && (await jumlahBerkasPlus(supa, uid)) < PLUS_BERKAS_MAKS) {
      const b = await buatBerkas(supa, { userId: uid, kode, orderId: null, did: sesi.did });
      return jsonPribadi({
        jalur: "plus",
        berkas: { id: b.id, status: b.status, nomorDokumen: b.nomor_dokumen },
      });
    }

    if (!isMidtransConfigured()) {
      return jsonPribadi(
        { error: "Pembayaran sedang disiapkan — coba lagi nanti.", kode: "BAYAR_BELUM_SIAP" },
        { status: 501 },
      );
    }
    const produk = KATALOG[kode];
    const orderId = `aidm-${randomUUID()}`;
    const { data: pesanan, error } = await supa
      .from("subscription_orders")
      .insert({
        user_id: uid,
        // Bukan langganan: tidak ada masa berlaku. Kolom ini `check > 0`.
        periode_hari: 1,
        harga_idr: produk.hargaIdr,
        midtrans_order_id: orderId,
        status: "pending",
        kode,
      })
      .select("id")
      .single();
    if (error || !pesanan) throw error ?? new Error("insert pesanan gagal");
    try {
      const { data: user } = await supa.from("users").select("email").eq("id", uid).maybeSingle();
      const snap = await buatSnap({ orderId, jumlahIdr: produk.hargaIdr, email: user?.email ?? null });
      return jsonPribadi({ jalur: "bayar", orderId, token: snap.token, redirectUrl: snap.redirectUrl });
    } catch (err) {
      console.error(`[berkas] Midtrans menolak (uid=${uid}, kode=${kode}):`, err);
      await supa.from("subscription_orders").update({ status: "failed" }).eq("id", pesanan.id);
      return jsonPribadi(
        { error: "Pembayaran sedang disiapkan — coba lagi nanti.", kode: "BAYAR_BELUM_SIAP" },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error(`[berkas] pesan gagal (uid=${uid}):`, err);
    return jsonPribadi({ error: "Berkas belum bisa dipesan. Coba lagi ya." }, { status: 500 });
  }
}
