import { jsonPribadi } from "@/lib/api/respons";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { evaluasiMisi } from "@/lib/missions/server";
import {
  explorerKlaimUrl,
  isKlaimConfigured,
} from "@/lib/missions/klaim-server";

export const runtime = "nodejs";
// Data milik satu pengguna: tidak boleh pernah dirender statis maupun
// disimpan lapisan mana pun. `force-dynamic` mencegah Next membekukannya saat
// build, `revalidate = 0` mencegah cache data Next menyajikan salinan, dan
// header `private, no-store` (lewat jsonPribadi) menutup sisanya di browser
// serta perantara.
export const dynamic = "force-dynamic";
export const revalidate = 0;


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
    const hasil = await evaluasiMisi(supa, uid, isKlaimConfigured());
    return jsonPribadi({
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
    return jsonPribadi(
      { error: "Gagal memuat misi. Coba lagi ya." },
      { status: 500 },
    );
  }
}
