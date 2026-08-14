import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { evaluasiMisi } from "@/lib/missions/server";
import {
  explorerKlaimUrl,
  isKlaimConfigured,
} from "@/lib/missions/klaim-server";

export const runtime = "nodejs";

/**
 * GET /api/missions (§7.6 / §11) — daftar misi + progres NYATA milik user.
 *
 * Nol biaya AI: seluruhnya aritmetika SQL, sama seperti Laporan. Progres
 * dihitung ulang tiap dibaca dari tabel sumber, jadi angka di layar tidak
 * pernah menyimpang dari catatan yang benar-benar ada.
 */
export async function GET() {
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
    const hasil = await evaluasiMisi(supa, uid, isKlaimConfigured());
    return NextResponse.json({
      ...hasil,
      // URL explorer dirakit di sini, bukan di klien: chain kontrak reward
      // ditentukan env server-only, sehingga browser akan salah menebaknya.
      misi: hasil.misi.map((m) => ({
        ...m,
        ...(m.txHash ? { explorerTx: explorerKlaimUrl(m.txHash) } : {}),
      })),
    });
  } catch (err) {
    console.error("[misi] gagal:", err);
    return NextResponse.json(
      { error: "Gagal memuat misi. Coba lagi ya." },
      { status: 500 },
    );
  }
}
