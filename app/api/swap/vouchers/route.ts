import { NextResponse } from "next/server";
import { formatEther } from "viem";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import {
  explorerBurnTxUrl,
  explorerClaimTxUrl,
  isSwapConfigured,
} from "@/lib/swap/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/swap/vouchers — voucher swap milik pemanggil (§7.7).
 *
 * Voucher adalah kertas berharga: tanda tangannya bisa langsung ditukar IDM
 * oleh siapa pun yang menyerahkannya ke kontrak — kontrak membayar ke
 * `v.user`, tapi tanda tangan yang bocor tetap membuka jalan bagi orang lain
 * untuk menebus lebih dulu di waktu yang tidak dikehendaki pemiliknya. Karena
 * itu penyaringannya dilakukan di SERVER berdasarkan sesi, tidak pernah
 * berdasarkan alamat yang dikirim klien.
 */
export async function GET() {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (!isSwapConfigured()) {
    return NextResponse.json(
      { error: "Fitur Tukar belum dikonfigurasi di server ini." },
      { status: 501 },
    );
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
    const { data: w } = await supa
      .from("wallets")
      .select("address")
      .eq("user_id", uid)
      .maybeSingle();
    const wallet = w?.address as string | undefined;
    if (!wallet) {
      return NextResponse.json({ vouchers: [] });
    }

    // Dicocokkan lewat ALAMAT, bukan `user_id`: voucher yang terbit sebelum
    // dompet tertaut ke akun (atau setelah akun lama dihapus) tetap harus
    // sampai ke pemiliknya — IDMX-nya sudah terbakar.
    const { data, error } = await supa
      .from("swap_vouchers")
      .select(
        "nonce, user_address, idmx_burned, burn_tx_hash, deadline, signature, status, claim_tx_hash, created_at",
      )
      .ilike("user_address", wallet)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    const vouchers = (data ?? []).map((v) => ({
      nonce: String(v.nonce),
      user: v.user_address as `0x${string}`,
      // Dua bentuk sengaja dikirim: `idmxBurned` (wei) adalah yang WAJIB
      // dipakai saat memanggil kontrak — angka desimal hasil pembulatan akan
      // membuat tanda tangan tidak cocok. `idmx` hanya untuk ditampilkan.
      idmxBurned: String(v.idmx_burned),
      idmx: Number(formatEther(BigInt(v.idmx_burned))),
      deadline: v.deadline as string,
      signature: v.signature as `0x${string}`,
      status: v.status as "signed" | "claimed",
      burnTxUrl: explorerBurnTxUrl(v.burn_tx_hash as string),
      claimTxUrl: v.claim_tx_hash
        ? explorerClaimTxUrl(v.claim_tx_hash as string)
        : null,
      createdAt: v.created_at as string,
    }));

    return NextResponse.json({ vouchers });
  } catch (err) {
    console.error("[swap] gagal membaca voucher:", err);
    return NextResponse.json(
      { error: "Gagal membaca voucher. Coba lagi ya." },
      { status: 500 },
    );
  }
}
