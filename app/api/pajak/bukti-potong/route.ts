import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { jsonPribadi } from "@/lib/api/respons";
import { todayWib } from "@/lib/wib";
import { idSah } from "@/lib/kasbon/server";
import { bolehPajak } from "@/lib/pajak/server";
import {
  GalatInvoice,
  daftarBuktiPotong,
  hapusBuktiPotong,
  rekapBuktiPotong,
  tambahBuktiPotong,
} from "@/lib/invoice/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOLAK_PAKET = { error: "Tracker bukti potong termasuk Paket Pajak Tahunan atau AIDM Plus.", kode: "PERLU_PAKET_PAJAK" };

async function siap() {
  const uid = currentUserId();
  if (!uid) return { galat: jsonPribadi({ error: "unauthenticated" }, { status: 401 }) };
  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return { galat: jsonPribadi({ error: "Supabase belum dikonfigurasi." }, { status: 501 }) };
  }
  if (!(await bolehPajak(supa, uid)).boleh) return { galat: jsonPribadi(TOLAK_PAKET, { status: 402 }) };
  return { uid, supa };
}

/** GET /api/pajak/bukti-potong?tahun=YYYY — daftar + rekap per klien (premium). */
export async function GET(req: Request) {
  const s = await siap();
  if ("galat" in s) return s.galat;
  const tahunIni = Number(todayWib().slice(0, 4));
  const tahun = Number(new URL(req.url).searchParams.get("tahun") ?? tahunIni);
  if (!Number.isInteger(tahun) || tahun < 2020 || tahun > tahunIni) {
    return jsonPribadi({ error: "Tahun pajak tidak dikenal." }, { status: 400 });
  }
  try {
    const items = await daftarBuktiPotong(s.supa, s.uid, tahun);
    return jsonPribadi({ tahun, items, rekap: rekapBuktiPotong(items) });
  } catch {
    return jsonPribadi({ error: "Bukti potong belum bisa dibaca." }, { status: 500 });
  }
}

/** POST — {klien, tanggal, bruto, status, nominalPotongan, nomorBukti?, invoiceId?} */
export async function POST(req: Request) {
  const s = await siap();
  if ("galat" in s) return s.galat;
  let b: Record<string, unknown> = {};
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    /* ditolak di bawah */
  }
  if (typeof b.klien !== "string" || typeof b.tanggal !== "string" || typeof b.bruto !== "number" || (b.status !== "nihil" && b.status !== "terpotong")) {
    return jsonPribadi({ error: "klien, tanggal, bruto, dan status (nihil|terpotong) wajib diisi." }, { status: 400 });
  }
  try {
    const item = await tambahBuktiPotong(s.supa, {
      userId: s.uid,
      klien: b.klien,
      tanggal: b.tanggal,
      bruto: b.bruto,
      status: b.status,
      nominalPotongan: typeof b.nominalPotongan === "number" ? b.nominalPotongan : 0,
      nomorBukti: typeof b.nomorBukti === "string" ? b.nomorBukti : null,
      invoiceId: typeof b.invoiceId === "string" && idSah(b.invoiceId) ? b.invoiceId : null,
      catatan: typeof b.catatan === "string" ? b.catatan : null,
    });
    return jsonPribadi({ item });
  } catch (err) {
    if (err instanceof GalatInvoice) return jsonPribadi({ error: err.message, kode: err.kode }, { status: 400 });
    // CHECK constraint 0040 (nihil dengan potongan, dll.) → 400, bukan 500.
    if ((err as { code?: string })?.code === "23514") return jsonPribadi({ error: "Data bukti potong tidak konsisten." }, { status: 400 });
    console.error(`[bukti-potong] tambah gagal (uid=${s.uid}):`, err);
    return jsonPribadi({ error: "Bukti potong belum bisa disimpan." }, { status: 500 });
  }
}

/** DELETE ?id= */
export async function DELETE(req: Request) {
  const s = await siap();
  if ("galat" in s) return s.galat;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!idSah(id)) return jsonPribadi({ error: "Bukti potong tidak ditemukan." }, { status: 404 });
  try {
    const ada = await hapusBuktiPotong(s.supa, s.uid, id);
    return ada ? jsonPribadi({ ok: true }) : jsonPribadi({ error: "Bukti potong tidak ditemukan." }, { status: 404 });
  } catch {
    return jsonPribadi({ error: "Bukti potong belum bisa dihapus." }, { status: 500 });
  }
}
