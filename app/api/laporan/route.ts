import { jsonPribadi } from "@/lib/api/respons";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { bolehSegel, rentangIso, rentangTanggal } from "@/lib/laporan/periode";
import { rekapOjol } from "@/lib/laporan/ojol";
import {
  ambilRollups,
  breakdownKategori,
  bulanTercatat,
  ringkasDariRollups,
  ringkasSebelumnya,
  seriesDariRollups,
  statusSegel,
} from "@/lib/laporan/server";
import { isSealConfigured } from "@/lib/laporan/segel-server";
import { explorerTxUrl } from "@/lib/chains/attestation";
import type { LaporanResponse } from "@/lib/laporan/types";

export const runtime = "nodejs";
// Data milik satu pengguna: tidak boleh pernah dirender statis maupun
// disimpan lapisan mana pun. `force-dynamic` mencegah Next membekukannya saat
// build, `revalidate = 0` mencegah cache data Next menyajikan salinan, dan
// header `private, no-store` (lewat jsonPribadi) menutup sisanya di browser
// serta perantara.
export const dynamic = "force-dynamic";
export const revalidate = 0;


/**
 * GET /api/laporan?period=2026-08 (§11).
 *
 * Mengembalikan ringkasan, deret harian, rincian kategori, status segel, dan
 * progres valuasi untuk satu periode. **Nol biaya AI** (§7.3): semuanya
 * aritmetika SQL — membuka Laporan tidak boleh menuntut langganan, jadi tidak
 * ada satu pun pemanggilan model di jalur ini.
 */
export async function GET(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  }

  const period = new URL(req.url).searchParams.get("period") ?? "30d";
  // Format tak dikenal ditolak, bukan diam-diam jadi "semua" — laporan tanpa
  // batas periode akan tampil seolah itu angka bulan ini.
  if (!/^\d{4}-\d{2}$/.test(period) && period !== "30d" && period !== "today") {
    return jsonPribadi({ error: "Periode tidak dikenal." }, { status: 400 });
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
    const rentang = rentangTanggal(period);
    const [rollups, kategori, sebelumnya, segel, bulan, profil] = await Promise.all([
      ambilRollups(supa, uid, rentang),
      breakdownKategori(supa, uid, rentang),
      ringkasSebelumnya(supa, uid, period),
      statusSegel(supa, uid, period),
      bulanTercatat(supa, uid),
      supa.from("users").select("earner_type").eq("id", uid).maybeSingle(),
    ]);
    const kini = ringkasDariRollups(rollups);
    // Peran ojol (Batch 10): rekap per platform & biaya kendaraan dari RPC
    // 0039 — hanya untuk ojol supaya peran lain tidak membayar dua query.
    const earner = (profil.data as { earner_type: string | null } | null)?.earner_type ?? null;
    const iso = rentangIso(period);
    const ojol =
      earner === "ojol"
        ? await rekapOjol(supa, uid, { startIso: iso.start ?? null, endIso: iso.end ?? null }, kini)
        : undefined;

    const body: LaporanResponse = {
      period,
      kini,
      sebelumnya,
      series: seriesDariRollups(rollups),
      masuk: kategori.masuk,
      keluar: kategori.keluar,
      segel: {
        ...segel,
        ...(segel.txHash ? { explorerTx: explorerTxUrl(segel.txHash) } : {}),
      },
      bolehSegel: bolehSegel(period),
      segelSiap: isSealConfigured(),
      bulanTercatat: bulan,
      ...(ojol ? { ojol } : {}),
    };
    return jsonPribadi(body);
  } catch {
    return jsonPribadi(
      { error: "Gagal menyusun laporan. Coba lagi ya." },
      { status: 500 },
    );
  }
}
