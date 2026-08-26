import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentSession } from "@/lib/catat/server";
import { alamatWalletUser } from "@/lib/wallet/server";
import { bolehSegel } from "@/lib/laporan/periode";
import { explorerTxUrl } from "@/lib/chains/attestation";
import {
  attestOnChain,
  isSealConfigured,
  kanonikPeriode,
} from "@/lib/laporan/segel-server";

export const runtime = "nodejs";
// AC §7.5: segel sukses ≤ 60 dtk — receipt ditunggu ≤ 45 dtk di attestOnChain,
// sisanya jatah DB & kanonikalisasi.
export const maxDuration = 60;

/**
 * POST /api/laporan/segel — {period} (§7.5 / §11).
 *
 * Urutan disengaja: validasi → kanonik+hash → tulis baris pending → attest
 * on-chain → tandai confirmed → picu misi. Baris DB ditulis SEBELUM transaksi
 * dikirim supaya tidak pernah ada tx on-chain yang tak tercatat di DB; arah
 * sebaliknya (tx sukses tapi baris hilang) membuat segel "hantu" yang tidak
 * bisa ditampilkan ke user.
 */
export async function POST(req: Request) {
  const sesi = currentSession();
  const uid = sesi?.uid ?? null;
  const did = sesi?.did ?? null;
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let period = "";
  try {
    const body = (await req.json()) as { period?: unknown };
    if (typeof body.period === "string") period = body.period;
  } catch {
    /* ditolak di bawah */
  }
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "Periode tidak dikenal." }, { status: 400 });
  }
  if (!bolehSegel(period)) {
    return NextResponse.json(
      { error: "Periode yang masih berjalan belum bisa disegel." },
      { status: 400 },
    );
  }

  // Konfigurasi dicek SEBELUM menulis apa pun — tanpa kontrak & relayer,
  // baris pending hanya akan jadi janji yang tidak pernah ditepati.
  if (!isSealConfigured()) {
    return NextResponse.json(
      { error: "Segel on-chain belum dikonfigurasi di server ini." },
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
    // Subjek segel on-chain = wallet embedded user (§9.4 "alamat user tetap
    // tercatat sebagai subjek segel").
    // Alamat diisi susulan dari Privy bila barisnya belum ada — segel yang
    // gagal karena dompet lahir terlambat akan menyuruh user "masuk ulang"
    // untuk sesuatu yang bukan kesalahannya (lib/wallet/server.ts).
    const hasilWallet = await alamatWalletUser(supa, uid, did);
    if (hasilWallet.status !== "ada") {
      return NextResponse.json(
        {
          code:
            hasilWallet.status === "galat-privy"
              ? "WALLET_LOOKUP_FAILED"
              : "WALLET_NOT_READY",
          message:
            hasilWallet.status === "galat-privy"
              ? "Belum bisa memastikan dompetmu. Coba lagi sebentar lagi."
              : "Dompetmu masih disiapkan. Tunggu sebentar ya.",
        },
        { status: hasilWallet.status === "galat-privy" ? 503 : 409 },
      );
    }
    const walletUser = hasilWallet.alamat;

    // Tidak ada catatan = tidak ada yang disegel. Menyegel laporan kosong
    // menghasilkan bukti keberadaan atas ketiadaan — menyesatkan penilai.
    const { kanonik, hash } = await kanonikPeriode(supa, uid, period);
    const isi = JSON.parse(kanonik) as { jml_transaksi: number };
    if (isi.jml_transaksi === 0) {
      return NextResponse.json(
        { error: "Belum ada catatan di periode ini — tidak ada yang disegel." },
        { status: 400 },
      );
    }

    // Versi baru dulu (is_latest=true), lalu turunkan yang lama. Kalau urutan
    // dibalik dan insert gagal, periode kehilangan penanda latest sama sekali.
    const { data: baru, error: errInsert } = await supa
      .from("report_seals")
      .insert({
        user_id: uid,
        period_key: period,
        report_hash: hash,
        canonical_json: JSON.parse(kanonik),
        status: "pending",
        is_latest: true,
      })
      .select("id")
      .single();
    if (errInsert || !baru) throw errInsert ?? new Error("insert gagal");
    await supa
      .from("report_seals")
      .update({ is_latest: false })
      .eq("user_id", uid)
      .eq("period_key", period)
      .neq("id", baru.id);

    let hasil;
    try {
      hasil = await attestOnChain(walletUser, period, hash);
    } catch (err) {
      await supa
        .from("report_seals")
        .update({ status: "failed" })
        .eq("id", baru.id);
      console.error("[segel] attest gagal:", err);
      return NextResponse.json(
        { error: "Transaksi segel gagal dikirim. Coba lagi ya." },
        { status: 502 },
      );
    }

    const sealedAt = new Date().toISOString();
    await supa
      .from("report_seals")
      .update({
        tx_hash: hasil.txHash,
        ...(hasil.confirmed ? { status: "confirmed", sealed_at: sealedAt } : {}),
      })
      .eq("id", baru.id);

    // Misi §7.6 "Segel laporan bulanan" +150 — event dicatat sekali per
    // periode (indeks unik 0016). Klaim on-chain menyusul di sisa M4;
    // mencatat progresnya sekarang membuat reward tidak hangus.
    if (hasil.confirmed) {
      const { data: misi } = await supa
        .from("missions")
        .select("id")
        .eq("code", "seal_monthly_report")
        .eq("aktif", true)
        .maybeSingle();
      if (misi) {
        const { error: errMisi } = await supa.from("mission_events").insert({
          user_id: uid,
          mission_id: misi.id,
          progress: { period_key: period },
          completed_at: sealedAt,
        });
        // Duplikat (segel ulang periode sama) memang ditolak indeks — bukan galat.
        if (errMisi && !`${errMisi.code}`.startsWith("23")) {
          console.error("[segel] catat misi gagal:", errMisi);
        }
      }
    }

    return NextResponse.json({
      segel: {
        status: hasil.confirmed ? "tersegel" : "pending",
        hash,
        txHash: hasil.txHash,
        sealedAt: hasil.confirmed ? sealedAt : undefined,
        explorerTx: explorerTxUrl(hasil.txHash),
      },
    });
  } catch (err) {
    console.error("[segel] gagal:", err);
    return NextResponse.json(
      { error: "Gagal menyegel laporan. Coba lagi ya." },
      { status: 500 },
    );
  }
}
