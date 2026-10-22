import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { jsonPribadi, HEADER_DATA_PRIBADI } from "@/lib/api/respons";
import { todayWib } from "@/lib/wib";
import { KATALOG, kodeBerkasSah, labelBerkasPeran } from "@/lib/langganan/katalog";
import { ambilDataBerkas } from "@/lib/berkas/data";
import { renderBerkasPdf } from "@/lib/berkas/render";
import { catatPremiumEvent, URL_VERIFIKASI_DASAR } from "@/lib/berkas/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/berkas/pratinjau {kode} — halaman 1 (sampul) dengan tanda air
 * PRATINJAU, dari data nyata pengguna. Tidak disimpan, tidak dinomori:
 * nomor dokumen lahir saat dokumen benar-benar dibuat. Pratinjau SELALU
 * boleh dibuka, apa pun tingkat kesiapannya (§1.5).
 */
export async function POST(req: Request) {
  const uid = currentUserId();
  if (!uid) return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
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
    const bulan = KATALOG[kode].bulan as 6 | 12;
    const hariIni = todayWib();
    const data = await ambilDataBerkas(supa, uid, bulan, hariIni.slice(0, 7));
    const pdf = await renderBerkasPdf({
      data,
      label: labelBerkasPeran(data.earnerType, bulan),
      nomorDokumen: "Terbit setelah pembelian",
      kodeVerifikasi: "— (terbit setelah pembelian)",
      tanggalTerbit: hariIni,
      urlVerifikasi: URL_VERIFIKASI_DASAR,
      pratinjau: true,
    });
    void catatPremiumEvent(supa, { userId: uid, earnerType: data.earnerType, kode, aksi: "lihat_pratinjau" });
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        ...HEADER_DATA_PRIBADI,
        "content-type": "application/pdf",
        "content-disposition": 'inline; filename="pratinjau.pdf"',
      },
    });
  } catch {
    return jsonPribadi({ error: "Pratinjau belum bisa dibuat." }, { status: 500 });
  }
}
