/**
 * Invoice & kuitansi untuk peran freelance/jasa (PERINTAH-AGEN-PREMIUM
 * §Batch 11) — GRATIS. Piutang per klien MEMAKAI tabel `kasbon` yang ada:
 * invoice terbit → satu kasbon `piutang` (pihak = klien, invoice_id);
 * pelunasan lewat RPC `kasbon_lunasi` yang sudah ada (transaksi pemasukan
 * `jasa` lahir di sana, satu transaksi DB, tidak ada uang terhitung dua kali)
 * → invoice `lunas` + kuitansi.
 *
 * PDF invoice/kuitansi dirender saat diminta, tidak disimpan, tidak
 * dinotarisasi: dokumen kerja antara pengguna dan kliennya.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentMethod } from "@/lib/transactions";
import { todayWib } from "@/lib/wib";

export type StatusInvoice = "terbit" | "lunas" | "batal";

export interface InvoiceRow {
  id: string;
  user_id: string;
  nomor: string;
  klien: string;
  uraian: string;
  nominal: number;
  jatuh_tempo: string | null;
  status: StatusInvoice;
  lunas_at: string | null;
  transaction_id: string | null;
  created_at: string;
}

export const INVOICE_COLUMNS =
  "id, user_id, nomor, klien, uraian, nominal, jatuh_tempo, status, lunas_at, transaction_id, created_at";

export interface InvoiceKlien {
  id: string;
  nomor: string;
  klien: string;
  uraian: string;
  nominal: number;
  jatuhTempo: string | null;
  status: StatusInvoice;
  lunasAt: string | null;
  createdAt: string;
  /** Lewat jatuh tempo dan belum lunas. */
  terlambat: boolean;
}

export function keKlien(r: InvoiceRow, hariIni = todayWib()): InvoiceKlien {
  return {
    id: r.id,
    nomor: r.nomor,
    klien: r.klien,
    uraian: r.uraian,
    nominal: Number(r.nominal),
    jatuhTempo: r.jatuh_tempo,
    status: r.status,
    lunasAt: r.lunas_at,
    createdAt: r.created_at,
    terlambat: r.status === "terbit" && !!r.jatuh_tempo && r.jatuh_tempo < hariIni,
  };
}

/** INV-YYYYMM-xxxxx; urut per pengguna per bulan (ulang bila unik gagal). */
async function nomorBerikut(supa: SupabaseClient, userId: string, bulanWib: string): Promise<string> {
  const prefix = `INV-${bulanWib.replace("-", "")}-`;
  const { count } = await supa
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .like("nomor", `${prefix}%`);
  // Nomor unik GLOBAL (kolom unique) tetapi berurutan per pengguna: dua
  // pengguna bisa sama-sama INV-202610-00001 → tabrakan. Sisipkan 3 huruf
  // dari user_id supaya nomor tetap pendek dan tidak pernah bertabrakan.
  return `${prefix}${userId.slice(0, 3).toUpperCase()}${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export class GalatInvoice extends Error {
  constructor(public kode: "TIDAK_SAH" | "TIDAK_DITEMUKAN" | "SUDAH_SELESAI", pesan: string) {
    super(pesan);
  }
}

export async function daftarInvoice(supa: SupabaseClient, userId: string): Promise<InvoiceKlien[]> {
  const { data, error } = await supa
    .from("invoices")
    .select(INVOICE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const hariIni = todayWib();
  return ((data ?? []) as InvoiceRow[]).map((r) => keKlien(r, hariIni));
}

export async function ambilInvoice(supa: SupabaseClient, userId: string, id: string): Promise<InvoiceRow | null> {
  const { data } = await supa.from("invoices").select(INVOICE_COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();
  return (data as InvoiceRow | null) ?? null;
}

/** Terbitkan invoice + kasbon piutang-nya (pihak = klien). */
export async function buatInvoice(
  supa: SupabaseClient,
  args: { userId: string; klien: string; uraian: string; nominal: number; jatuhTempo: string | null },
): Promise<InvoiceRow> {
  const klien = args.klien.trim().slice(0, 80);
  const uraian = args.uraian.trim().slice(0, 300);
  if (!klien || !uraian) throw new GalatInvoice("TIDAK_SAH", "Klien dan uraian wajib diisi.");
  if (!Number.isInteger(args.nominal) || args.nominal <= 0) throw new GalatInvoice("TIDAK_SAH", "Nominal harus bilangan bulat rupiah > 0.");
  if (args.jatuhTempo !== null && !/^\d{4}-\d{2}-\d{2}$/.test(args.jatuhTempo)) {
    throw new GalatInvoice("TIDAK_SAH", "Jatuh tempo harus YYYY-MM-DD.");
  }
  const bulanIni = todayWib().slice(0, 7);
  let baris: InvoiceRow | null = null;
  for (let i = 0; i < 5 && !baris; i++) {
    const { data, error } = await supa
      .from("invoices")
      .insert({
        user_id: args.userId,
        nomor: await nomorBerikut(supa, args.userId, bulanIni),
        klien,
        uraian,
        nominal: args.nominal,
        jatuh_tempo: args.jatuhTempo,
        status: "terbit",
      })
      .select(INVOICE_COLUMNS)
      .maybeSingle();
    if (!error && data) baris = data as InvoiceRow;
    else if (error && error.code !== "23505") throw error;
  }
  if (!baris) throw new Error("nomor invoice tidak kunjung unik");

  // Piutang di tabel kasbon yang ada (kategori jasa, sumber manual).
  const { data: kat } = await supa.from("categories").select("id").eq("slug", "jasa").maybeSingle();
  const { error: errK } = await supa.from("kasbon").insert({
    user_id: args.userId,
    tipe: "piutang",
    pihak: klien,
    amount: args.nominal,
    kategori_id: (kat as { id: string } | null)?.id ?? null,
    catatan: `Invoice ${baris.nomor} — ${uraian}`.slice(0, 200),
    jatuh_tempo: args.jatuhTempo,
    source: "manual",
    parsed_by: "manual",
    status: "aktif",
    invoice_id: baris.id,
  });
  if (errK) {
    // Invoice tanpa piutang akan menyesatkan; batalkan keduanya.
    await supa.from("invoices").delete().eq("id", baris.id);
    throw errK;
  }
  return baris;
}

/**
 * Lunas: pelunasan kasbon piutang-nya lewat RPC 0031 (`p_catat` true →
 * transaksi pemasukan `jasa` hari ini) lalu invoice ditandai lunas dengan
 * `transaction_id`. `catat: false` = "sudah kucatat di Catat".
 */
export async function lunasiInvoice(
  supa: SupabaseClient,
  args: { userId: string; id: string; catat: boolean; metode: PaymentMethod },
): Promise<InvoiceRow> {
  const inv = await ambilInvoice(supa, args.userId, args.id);
  if (!inv) throw new GalatInvoice("TIDAK_DITEMUKAN", "Invoice tidak ditemukan.");
  if (inv.status !== "terbit") throw new GalatInvoice("SUDAH_SELESAI", "Invoice ini sudah lunas atau dibatalkan.");
  const { data: kb } = await supa
    .from("kasbon")
    .select("id, status")
    .eq("invoice_id", inv.id)
    .eq("user_id", args.userId)
    .maybeSingle();
  let transactionId: string | null = null;
  const kasbon = kb as { id: string; status: string } | null;
  if (kasbon && kasbon.status === "aktif") {
    const { data, error } = await supa.rpc("kasbon_lunasi", {
      p_user: args.userId,
      p_id: kasbon.id,
      p_catat: args.catat,
      p_metode: args.metode,
      p_tanggal: todayWib(),
    });
    if (error && error.code !== "KB409") throw error;
    transactionId = typeof data === "string" ? data : null;
  }
  const { data: upd, error: errU } = await supa
    .from("invoices")
    .update({ status: "lunas", lunas_at: new Date().toISOString(), transaction_id: transactionId })
    .eq("id", inv.id)
    .eq("user_id", args.userId)
    .select(INVOICE_COLUMNS)
    .maybeSingle();
  if (errU || !upd) throw errU ?? new Error("perbarui invoice gagal");
  return upd as InvoiceRow;
}

/** Batal: invoice `batal` + kasbon piutang-nya dihapus (soft). */
export async function batalkanInvoice(supa: SupabaseClient, userId: string, id: string): Promise<InvoiceRow> {
  const inv = await ambilInvoice(supa, userId, id);
  if (!inv) throw new GalatInvoice("TIDAK_DITEMUKAN", "Invoice tidak ditemukan.");
  if (inv.status !== "terbit") throw new GalatInvoice("SUDAH_SELESAI", "Invoice ini sudah lunas atau dibatalkan.");
  await supa
    .from("kasbon")
    .update({ status: "dihapus", deleted_at: new Date().toISOString() })
    .eq("invoice_id", inv.id)
    .eq("user_id", userId)
    .in("status", ["aktif", "draft"]);
  const { data, error } = await supa
    .from("invoices")
    .update({ status: "batal" })
    .eq("id", inv.id)
    .eq("user_id", userId)
    .select(INVOICE_COLUMNS)
    .maybeSingle();
  if (error || !data) throw error ?? new Error("batalkan invoice gagal");
  return data as InvoiceRow;
}

/* ── Bukti potong (premium pajak/Plus) ─────────────────────────────────── */

export type StatusPotong = "nihil" | "terpotong";

export interface BuktiPotongRow {
  id: string;
  invoice_id: string | null;
  klien: string;
  tanggal: string;
  tahun_pajak: number;
  bruto: number;
  status: StatusPotong;
  nominal_potongan: number;
  nomor_bukti: string | null;
  catatan: string | null;
  created_at: string;
}

export const BUKTI_POTONG_COLUMNS =
  "id, invoice_id, klien, tanggal, tahun_pajak, bruto, status, nominal_potongan, nomor_bukti, catatan, created_at";

export interface RekapBuktiPotong {
  perKlien: { klien: string; bruto: number; potongan: number; jml: number; terpotong: number }[];
  totalBruto: number;
  totalPotongan: number;
  jml: number;
}

export function rekapBuktiPotong(rows: BuktiPotongRow[]): RekapBuktiPotong {
  const peta = new Map<string, { bruto: number; potongan: number; jml: number; terpotong: number }>();
  for (const r of rows) {
    const c = peta.get(r.klien) ?? { bruto: 0, potongan: 0, jml: 0, terpotong: 0 };
    c.bruto += Number(r.bruto);
    c.potongan += Number(r.nominal_potongan);
    c.jml += 1;
    if (r.status === "terpotong") c.terpotong += 1;
    peta.set(r.klien, c);
  }
  const perKlien = [...peta.entries()].map(([klien, c]) => ({ klien, ...c })).sort((a, b) => b.bruto - a.bruto);
  return {
    perKlien,
    totalBruto: perKlien.reduce((s, k) => s + k.bruto, 0),
    totalPotongan: perKlien.reduce((s, k) => s + k.potongan, 0),
    jml: rows.length,
  };
}

export async function daftarBuktiPotong(supa: SupabaseClient, userId: string, tahun: number): Promise<BuktiPotongRow[]> {
  const { data, error } = await supa
    .from("bukti_potong")
    .select(BUKTI_POTONG_COLUMNS)
    .eq("user_id", userId)
    .eq("tahun_pajak", tahun)
    .order("tanggal", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as BuktiPotongRow[];
}

export async function tambahBuktiPotong(
  supa: SupabaseClient,
  args: {
    userId: string; klien: string; tanggal: string; bruto: number; status: StatusPotong;
    nominalPotongan: number; nomorBukti: string | null; invoiceId: string | null; catatan: string | null;
  },
): Promise<BuktiPotongRow> {
  const klien = args.klien.trim().slice(0, 80);
  if (!klien) throw new GalatInvoice("TIDAK_SAH", "Nama klien wajib diisi.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.tanggal)) throw new GalatInvoice("TIDAK_SAH", "Tanggal harus YYYY-MM-DD.");
  if (!Number.isInteger(args.bruto) || args.bruto <= 0) throw new GalatInvoice("TIDAK_SAH", "Bruto harus bilangan bulat rupiah > 0.");
  const potongan = args.status === "terpotong" ? args.nominalPotongan : 0;
  if (args.status === "terpotong" && (!Number.isInteger(potongan) || potongan <= 0)) {
    throw new GalatInvoice("TIDAK_SAH", "Nominal potongan wajib > 0 bila terpotong.");
  }
  const { data, error } = await supa
    .from("bukti_potong")
    .insert({
      user_id: args.userId,
      invoice_id: args.invoiceId,
      klien,
      tanggal: args.tanggal,
      tahun_pajak: Number(args.tanggal.slice(0, 4)),
      bruto: args.bruto,
      status: args.status,
      nominal_potongan: potongan,
      nomor_bukti: args.nomorBukti?.trim().slice(0, 60) || null,
      catatan: args.catatan?.trim().slice(0, 200) || null,
    })
    .select(BUKTI_POTONG_COLUMNS)
    .maybeSingle();
  if (error || !data) throw error ?? new Error("tambah bukti potong gagal");
  return data as BuktiPotongRow;
}

export async function hapusBuktiPotong(supa: SupabaseClient, userId: string, id: string): Promise<boolean> {
  const { data, error } = await supa.from("bukti_potong").delete().eq("id", id).eq("user_id", userId).select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}
