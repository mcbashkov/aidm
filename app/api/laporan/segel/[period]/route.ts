import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { explorerTxUrl } from "@/lib/chains/attestation";
import { cekReceipt, isSealConfigured } from "@/lib/laporan/segel-server";

export const runtime = "nodejs";

/**
 * GET /api/laporan/segel/:period (§11) — status segel + tuntaskan yang
 * menggantung: baris `pending` ber-tx_hash dicek receipt-nya di sini (POST
 * tidak menunggu selamanya; blok opBNB cepat tapi RPC bisa lelet). Dengan
 * begitu segel yang time-out saat POST sembuh sendiri saat dilihat lagi.
 */
export async function GET(
  _req: Request,
  { params }: { params: { period: string } },
) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const period = params.period;
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Periode tidak dikenal." }, { status: 400 });
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
    const { data } = await supa
      .from("report_seals")
      .select("id, report_hash, tx_hash, sealed_at, status")
      .eq("user_id", uid)
      .eq("period_key", period)
      .eq("is_latest", true)
      .order("created_at", { ascending: false })
      .limit(1);
    const baris = data?.[0];
    if (!baris) return NextResponse.json({ segel: { status: "belum" } });

    let status = baris.status as "pending" | "confirmed" | "failed";
    let sealedAt = baris.sealed_at as string | null;
    if (status === "pending" && baris.tx_hash && isSealConfigured()) {
      const receipt = await cekReceipt(baris.tx_hash as `0x${string}`);
      if (receipt !== "pending") {
        status = receipt;
        if (receipt === "confirmed") sealedAt = new Date().toISOString();
        await supa
          .from("report_seals")
          .update({ status, ...(sealedAt ? { sealed_at: sealedAt } : {}) })
          .eq("id", baris.id);
      }
    }

    return NextResponse.json({
      segel: {
        status:
          status === "confirmed"
            ? "tersegel"
            : status === "failed"
              ? "belum"
              : "pending",
        hash: baris.report_hash ?? undefined,
        txHash: baris.tx_hash ?? undefined,
        sealedAt: sealedAt ?? undefined,
        explorerTx: baris.tx_hash ? explorerTxUrl(baris.tx_hash) : undefined,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal membaca status segel." },
      { status: 500 },
    );
  }
}
