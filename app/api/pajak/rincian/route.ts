import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentSession } from "@/lib/catat/server";
import { jsonPribadi } from "@/lib/api/respons";
import { todayWib } from "@/lib/wib";
import { catatPremiumEvent } from "@/lib/berkas/server";
import { bolehPajak, buatRincian, urlUnduhPajak } from "@/lib/pajak/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/pajak/rincian {tahun} — PDF "Rincian Peredaran Bruto per Bulan
 * (bahan pengisian SPT)" satu tahun pajak. Premium `pajak` / Plus: tanpa akses
 * → 402 dengan harga, bukan galat. Dokumen disimpan di bucket privat dan
 * hash-nya dinotarisasi seperti Berkas.
 */
export async function POST(req: Request) {
  const sesi = currentSession();
  if (!sesi) return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  let tahun: number | null = null;
  try {
    const b = (await req.json()) as { tahun?: unknown };
    if (typeof b.tahun === "number") tahun = b.tahun;
  } catch {
    /* ditolak di bawah */
  }
  const tahunIni = Number(todayWib().slice(0, 4));
  if (tahun === null || !Number.isInteger(tahun) || tahun < 2020 || tahun > tahunIni) {
    return jsonPribadi({ error: "Tahun pajak tidak dikenal." }, { status: 400 });
  }
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }
  try {
    const { data: u } = await supa.from("users").select("earner_type").eq("id", sesi.uid).maybeSingle();
    const earnerType = (u as { earner_type: string | null } | null)?.earner_type ?? null;
    const akses = await bolehPajak(supa, sesi.uid);
    if (!akses.boleh) {
      void catatPremiumEvent(supa, { userId: sesi.uid, earnerType, kode: "pajak", aksi: "lihat_pratinjau" });
      return jsonPribadi(
        { error: "Dokumen pajak termasuk Paket Pajak Tahunan atau AIDM Plus.", kode: "PERLU_PAKET_PAJAK" },
        { status: 402 },
      );
    }
    const d = await buatRincian(supa, { userId: sesi.uid, tahun, did: sesi.did });
    const unduhUrl = await urlUnduhPajak(supa, d);
    return jsonPribadi({
      dokumen: { id: d.id, nomorDokumen: d.nomor_dokumen, kodeVerifikasi: d.kode_verifikasi, status: d.status, galat: d.galat },
      unduhUrl,
    });
  } catch (err) {
    console.error(`[pajak] rincian gagal (uid=${sesi.uid}):`, err);
    return jsonPribadi({ error: "Rincian belum bisa dibuat. Coba lagi ya." }, { status: 500 });
  }
}
