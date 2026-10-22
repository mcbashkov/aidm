import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentSession } from "@/lib/catat/server";
import { HEADER_DATA_PRIBADI, jsonPribadi } from "@/lib/api/respons";
import { todayWib } from "@/lib/wib";
import { bolehPajak, buatPernyataan, GalatPernyataan } from "@/lib/pajak/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/pajak/pernyataan {tahun, nama, npwp} — PDF "Surat Pernyataan
 * Omzet di Bawah Rp500 Juta". Nama & NPWP diketik pengguna saat membuat dan
 * TIDAK disimpan: PDF dikirim langsung sebagai jawaban (application/pdf),
 * tidak pernah ke bucket; yang tersimpan hanya hash + metadata. 409 bila
 * omzet tahun itu menurut catatan sudah mencapai batas — surat yang bohong
 * tidak dibuat.
 */
export async function POST(req: Request) {
  const sesi = currentSession();
  if (!sesi) return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  let body: { tahun?: unknown; nama?: unknown; npwp?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* ditolak di bawah */
  }
  const tahunIni = Number(todayWib().slice(0, 4));
  const tahun = typeof body.tahun === "number" ? body.tahun : NaN;
  if (!Number.isInteger(tahun) || tahun < 2020 || tahun > tahunIni) {
    return jsonPribadi({ error: "Tahun pajak tidak dikenal." }, { status: 400 });
  }
  if (typeof body.nama !== "string" || typeof body.npwp !== "string") {
    return jsonPribadi({ error: "Nama dan NPWP wajib diisi." }, { status: 400 });
  }
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }
  try {
    const akses = await bolehPajak(supa, sesi.uid);
    if (!akses.boleh) {
      return jsonPribadi(
        { error: "Dokumen pajak termasuk Paket Pajak Tahunan atau AIDM Plus.", kode: "PERLU_PAKET_PAJAK" },
        { status: 402 },
      );
    }
    const { dokumen, pdf } = await buatPernyataan(supa, {
      userId: sesi.uid,
      tahun,
      nama: body.nama,
      npwp: body.npwp,
      did: sesi.did,
    });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        ...HEADER_DATA_PRIBADI,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${dokumen.nomor_dokumen}.pdf"`,
        "X-Nomor-Dokumen": dokumen.nomor_dokumen,
        "X-Kode-Verifikasi": dokumen.kode_verifikasi,
      },
    });
  } catch (err) {
    if (err instanceof GalatPernyataan) {
      const status = err.kode === "MELEWATI_BATAS" ? 409 : 400;
      return jsonPribadi({ error: err.message, kode: err.kode }, { status });
    }
    console.error(`[pajak] pernyataan gagal (uid=${sesi.uid}):`, err);
    return jsonPribadi({ error: "Surat pernyataan belum bisa dibuat. Coba lagi ya." }, { status: 500 });
  }
}
