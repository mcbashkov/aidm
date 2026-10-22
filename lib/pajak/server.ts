/**
 * Modul Pajak OP — sisi server (PERINTAH-AGEN-PREMIUM §Batch 9).
 *
 * Mengumpulkan omzet per bulan dari RPC `laporan_bulanan` (pemasukan
 * confirmed, tanggal WIB) dan menyerahkannya ke fungsi murni `hitungPajak`;
 * tidak ada aritmetika pajak di berkas ini. Dokumen premium mengikuti alur
 * Berkas Pengajuan (render → [bucket] → SHA-256 → notarisasi hash), dengan
 * satu perbedaan yang disengaja: Surat Pernyataan memuat NPWP yang diketik
 * pengguna, jadi PDF-nya TIDAK PERNAH disimpan — hanya hash + metadata.
 *
 * Dilarang (§Batch 9): PPh badan, menyimpan NPWP/NIK, mengirim apa pun ke DJP.
 */

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayWib } from "@/lib/wib";
import { premiumAktif } from "@/lib/langganan";
import { statusLangganan } from "@/lib/langganan/server";
import { KATALOG } from "@/lib/langganan/katalog";
import { kodeVerifikasiBaru } from "@/lib/berkas/nomor";
import { BUCKET_BERKAS, PERCOBAAN_MAKS, urlVerifikasi } from "@/lib/berkas/server";
import { alamatWalletUser } from "@/lib/wallet/server";
import { attestOnChain, cekReceipt, isSealConfigured } from "@/lib/laporan/segel-server";
import {
  BATAS_BEBAS_IDR,
  geserBulan,
  hitungPajak,
  pengingatSetoran,
  type HasilPajak,
  type OmzetBulan,
  type Pengingat,
} from "@/lib/pajak/hitung";
import { renderPernyataanPdf, renderRincianPdf, type ProfilPajak } from "@/lib/pajak/render";
import { daftarBuktiPotong, rekapBuktiPotong } from "@/lib/invoice/server";

export type JenisDokumenPajak = "rincian" | "pernyataan";
export type StatusDokumenPajak = "dibuat" | "pending_segel" | "confirmed" | "gagal";

export interface DokumenPajakRow {
  id: string;
  user_id: string;
  jenis: JenisDokumenPajak;
  tahun_pajak: number;
  nomor_dokumen: string;
  kode_verifikasi: string;
  order_id: string | null;
  path_pdf: string | null;
  sha256: string | null;
  tx_hash: string | null;
  status: StatusDokumenPajak;
  percobaan: number;
  galat: string | null;
  created_at: string;
}

export const DOKUMEN_PAJAK_COLUMNS =
  "id, user_id, jenis, tahun_pajak, nomor_dokumen, kode_verifikasi, order_id, path_pdf, sha256, tx_hash, status, percobaan, galat, created_at";

export const RE_NOMOR_PAJAK = /^PJ-\d{4}-\d{5}$/;

export function labelDokumenPajak(jenis: JenisDokumenPajak, tahun: number): string {
  return jenis === "rincian"
    ? `Rincian Peredaran Bruto per Bulan · Tahun Pajak ${tahun}`
    : `Surat Pernyataan Omzet di Bawah Rp500 Juta · Tahun Pajak ${tahun}`;
}

/** Omzet per bulan satu tahun kalender dari RPC laporan_bulanan (0015). */
export async function omzetBulanan(supa: SupabaseClient, userId: string, tahun: number): Promise<OmzetBulan[]> {
  const { data, error } = await supa.rpc("laporan_bulanan", {
    p_user: userId,
    p_start: `${tahun}-01-01`,
    p_end: `${tahun + 1}-01-01`,
  });
  if (error) throw error;
  return ((data ?? []) as { bulan: string; total_masuk: number }[]).map((r) => ({
    bulan: r.bulan,
    omzet: Number(r.total_masuk),
  }));
}

/**
 * Hak akses paket `pajak`: Plus aktif/masa coba, ATAU pesanan `pajak` lunas
 * dalam 365 hari terakhir. Tanpa tabel baru — pesanan adalah buktinya.
 */
export async function bolehPajak(
  supa: SupabaseClient,
  userId: string,
): Promise<{ boleh: boolean; sumber: "plus" | "pajak" | null }> {
  const langganan = await statusLangganan(supa, userId);
  if (premiumAktif(langganan)) return { boleh: true, sumber: "plus" };
  const sejak = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const { count } = await supa
    .from("subscription_orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kode", "pajak")
    .eq("status", "paid")
    .gte("paid_at", sejak);
  return (count ?? 0) > 0 ? { boleh: true, sumber: "pajak" } : { boleh: false, sumber: null };
}

export interface DokumenPajakKlien {
  id: string;
  jenis: JenisDokumenPajak;
  label: string;
  tahunPajak: number;
  nomorDokumen: string;
  kodeVerifikasi: string;
  status: StatusDokumenPajak;
  /** Rincian: bisa diunduh ulang. Pernyataan: tidak (tidak disimpan). */
  bisaUnduh: boolean;
  createdAt: string;
}

export interface PajakResponse {
  tahun: number;
  hasil: HasilPajak;
  wajibPajakOp: boolean;
  bolehPajak: boolean;
  sumberAkses: "plus" | "pajak" | null;
  hargaPajakIdr: number;
  /** Hanya bila wajib pajak OP + punya akses + tanggal 1–15 + bulan lalu ada setoran. */
  pengingat: Pengingat | null;
  dokumen: DokumenPajakKlien[];
  pada: string;
}

function keKlien(d: DokumenPajakRow): DokumenPajakKlien {
  return {
    id: d.id,
    jenis: d.jenis,
    label: labelDokumenPajak(d.jenis, d.tahun_pajak),
    tahunPajak: d.tahun_pajak,
    nomorDokumen: d.nomor_dokumen,
    kodeVerifikasi: d.kode_verifikasi,
    status: d.status,
    bisaUnduh: d.jenis === "rincian" && Boolean(d.path_pdf) && d.status !== "gagal",
    createdAt: d.created_at,
  };
}

export async function ringkasanPajak(supa: SupabaseClient, userId: string, tahun: number): Promise<PajakResponse> {
  const hariIni = todayWib();
  const [omzet, profil, akses, dok] = await Promise.all([
    omzetBulanan(supa, userId, tahun),
    supa.from("users").select("wajib_pajak_op").eq("id", userId).maybeSingle(),
    bolehPajak(supa, userId),
    supa
      .from("dokumen_pajak")
      .select(DOKUMEN_PAJAK_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);
  const hasil = hitungPajak(tahun, omzet);
  const wajib = Boolean((profil.data as { wajib_pajak_op?: boolean } | null)?.wajib_pajak_op);

  // Pengingat menunjuk bulan pajak SEBELUMNYA; di Januari itu Desember tahun
  // lalu, yang hasilnya bukan `hasil` tahun ini.
  let pengingat: Pengingat | null = null;
  if (wajib && akses.boleh) {
    const bulanLalu = geserBulan(hariIni.slice(0, 7), -1);
    const tahunBulanLalu = Number(bulanLalu.slice(0, 4));
    const dasar = tahunBulanLalu === tahun ? hasil : hitungPajak(tahunBulanLalu, await omzetBulanan(supa, userId, tahunBulanLalu));
    pengingat = pengingatSetoran(dasar, hariIni);
  }

  return {
    tahun,
    hasil,
    wajibPajakOp: wajib,
    bolehPajak: akses.boleh,
    sumberAkses: akses.sumber,
    hargaPajakIdr: KATALOG.pajak.hargaIdr,
    pengingat,
    dokumen: ((dok.data ?? []) as DokumenPajakRow[]).map(keKlien),
    pada: hariIni,
  };
}

async function profilPajak(supa: SupabaseClient, userId: string): Promise<ProfilPajak> {
  const { data } = await supa
    .from("users")
    .select("nama_usaha, kota, categories:kategori_id(nama)")
    .eq("id", userId)
    .maybeSingle();
  const u = data as { nama_usaha: string | null; kota: string | null; categories: { nama?: string } | { nama?: string }[] | null } | null;
  const rel = u?.categories;
  const kategori = Array.isArray(rel) ? rel[0]?.nama ?? null : rel?.nama ?? null;
  return { namaUsaha: u?.nama_usaha?.trim() || "—", kota: u?.kota ?? null, kategori };
}

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** PJ-YYYY-xxxxx: urutan per tahun pajak = jumlah dokumen tahun itu + 1. */
async function nomorBerikut(supa: SupabaseClient, tahun: number): Promise<string> {
  const prefix = `PJ-${tahun}-`;
  const { count } = await supa
    .from("dokumen_pajak")
    .select("id", { count: "exact", head: true })
    .like("nomor_dokumen", `${prefix}%`);
  return `${prefix}${String((count ?? 0) + 1).padStart(5, "0")}`;
}

async function perbarui(supa: SupabaseClient, id: string, patch: Partial<DokumenPajakRow>): Promise<DokumenPajakRow> {
  const { data, error } = await supa
    .from("dokumen_pajak")
    .update(patch)
    .eq("id", id)
    .select(DOKUMEN_PAJAK_COLUMNS)
    .maybeSingle();
  if (error || !data) throw error ?? new Error("perbarui dokumen pajak gagal");
  return data as DokumenPajakRow;
}

async function barisBaru(
  supa: SupabaseClient,
  args: { userId: string; jenis: JenisDokumenPajak; tahun: number },
): Promise<DokumenPajakRow> {
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supa
      .from("dokumen_pajak")
      .insert({
        user_id: args.userId,
        jenis: args.jenis,
        tahun_pajak: args.tahun,
        nomor_dokumen: await nomorBerikut(supa, args.tahun),
        kode_verifikasi: kodeVerifikasiBaru(),
        status: "gagal",
        percobaan: 0,
        galat: "belum dirender",
      })
      .select(DOKUMEN_PAJAK_COLUMNS)
      .maybeSingle();
    if (!error && data) return data as DokumenPajakRow;
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("nomor dokumen pajak tidak kunjung unik");
}

/** Notarisasi hash: sama dengan Berkas, periodKey "pajak:<nomor>". */
async function notarisasi(supa: SupabaseClient, d: DokumenPajakRow, did: string | null): Promise<DokumenPajakRow> {
  if (!d.sha256) return d;
  if (!isSealConfigured()) {
    return perbarui(supa, d.id, { status: "dibuat", galat: "notarisasi: segel belum dikonfigurasi" });
  }
  const w = await alamatWalletUser(supa, d.user_id, did);
  if (w.status !== "ada") {
    return perbarui(supa, d.id, { status: "dibuat", galat: `notarisasi: dompet ${w.status}` });
  }
  const hasil = await attestOnChain(w.alamat, `pajak:${d.nomor_dokumen}`, d.sha256);
  return perbarui(supa, d.id, {
    tx_hash: hasil.txHash,
    status: hasil.confirmed ? "confirmed" : "pending_segel",
    galat: null,
  });
}

/** Rincian: render → bucket → hash → notarisasi. Idempoten per tahap. */
export async function prosesRincian(supa: SupabaseClient, baris: DokumenPajakRow, did: string | null): Promise<DokumenPajakRow> {
  let d = baris;
  try {
    if (!d.path_pdf || !d.sha256) {
      const [omzet, profil, bp] = await Promise.all([
        omzetBulanan(supa, d.user_id, d.tahun_pajak),
        profilPajak(supa, d.user_id),
        daftarBuktiPotong(supa, d.user_id, d.tahun_pajak),
      ]);
      const pdf = await renderRincianPdf({
        hasil: hitungPajak(d.tahun_pajak, omzet),
        profil,
        buktiPotong: rekapBuktiPotong(bp),
        nomorDokumen: d.nomor_dokumen,
        kodeVerifikasi: d.kode_verifikasi,
        tanggalTerbit: d.created_at.slice(0, 10),
        urlVerifikasi: urlVerifikasi(d.kode_verifikasi),
      });
      const path = `${d.user_id}/${d.nomor_dokumen}.pdf`;
      const { error: errUp } = await supa.storage
        .from(BUCKET_BERKAS)
        .upload(path, pdf, { contentType: "application/pdf", upsert: true });
      if (errUp) throw new Error(`simpan PDF: ${errUp.message}`);
      d = await perbarui(supa, d.id, { path_pdf: path, sha256: sha256Hex(pdf), status: "dibuat", galat: null });
    }
    if (!d.tx_hash) return await notarisasi(supa, d, did);
    if (d.status === "pending_segel") return tuntaskanSegelPajak(supa, d);
    return d;
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    return perbarui(supa, d.id, {
      status: d.path_pdf && d.sha256 ? "dibuat" : "gagal",
      percobaan: d.percobaan + 1,
      galat: pesan.slice(0, 300),
    });
  }
}

export async function buatRincian(
  supa: SupabaseClient,
  args: { userId: string; tahun: number; did: string | null },
): Promise<DokumenPajakRow> {
  const baris = await barisBaru(supa, { userId: args.userId, jenis: "rincian", tahun: args.tahun });
  return prosesRincian(supa, baris, args.did);
}

export class GalatPernyataan extends Error {
  constructor(public kode: "MELEWATI_BATAS" | "NPWP_TIDAK_SAH" | "NAMA_KOSONG", pesan: string) {
    super(pesan);
  }
}

/** NPWP 15 digit (lama) atau 16 digit (NIK). Hanya bentuknya yang diperiksa. */
export function normalisasiNpwp(masukan: string): string | null {
  const digit = masukan.replace(/\D/g, "");
  return digit.length === 15 || digit.length === 16 ? digit : null;
}

/**
 * Surat Pernyataan: render → hash → notarisasi → PDF dikembalikan ke
 * pemanggil. TIDAK ke bucket (NPWP di dalamnya). Omzet tahun itu harus di
 * bawah batas — kalau tidak, surat ini bohong, dan kita menolak membuatnya.
 */
export async function buatPernyataan(
  supa: SupabaseClient,
  args: { userId: string; tahun: number; nama: string; npwp: string; did: string | null },
): Promise<{ dokumen: DokumenPajakRow; pdf: Buffer }> {
  const nama = args.nama.trim().slice(0, 120);
  if (!nama) throw new GalatPernyataan("NAMA_KOSONG", "Nama wajib diisi.");
  const npwp = normalisasiNpwp(args.npwp);
  if (!npwp) throw new GalatPernyataan("NPWP_TIDAK_SAH", "NPWP harus 15 atau 16 digit.");

  const [omzet, profil] = await Promise.all([omzetBulanan(supa, args.userId, args.tahun), profilPajak(supa, args.userId)]);
  const hasil = hitungPajak(args.tahun, omzet);
  if (hasil.omzetTahun >= BATAS_BEBAS_IDR) {
    throw new GalatPernyataan(
      "MELEWATI_BATAS",
      `Omzet ${args.tahun} menurut catatanmu sudah mencapai Rp500 juta — surat pernyataan di bawah batas tidak bisa dibuat.`,
    );
  }

  const baris = await barisBaru(supa, { userId: args.userId, jenis: "pernyataan", tahun: args.tahun });
  const pdf = await renderPernyataanPdf({
    tahun: args.tahun,
    omzetTahun: hasil.omzetTahun,
    nama,
    npwp,
    profil,
    nomorDokumen: baris.nomor_dokumen,
    kodeVerifikasi: baris.kode_verifikasi,
    tanggalTerbit: baris.created_at.slice(0, 10),
    urlVerifikasi: urlVerifikasi(baris.kode_verifikasi),
  });
  let d = await perbarui(supa, baris.id, { sha256: sha256Hex(pdf), status: "dibuat", galat: null });
  try {
    d = await notarisasi(supa, d, args.did);
  } catch (err) {
    d = await perbarui(supa, d.id, { galat: `notarisasi: ${(err instanceof Error ? err.message : String(err)).slice(0, 200)}` });
  }
  return { dokumen: d, pdf };
}

export async function tuntaskanSegelPajak(supa: SupabaseClient, d: DokumenPajakRow): Promise<DokumenPajakRow> {
  if (d.status !== "pending_segel" || !d.tx_hash || !isSealConfigured()) return d;
  const r = await cekReceipt(d.tx_hash as `0x${string}`);
  if (r === "confirmed") return perbarui(supa, d.id, { status: "confirmed" });
  if (r === "failed") return perbarui(supa, d.id, { status: "dibuat", tx_hash: null, galat: "notarisasi: transaksi gagal, dicoba ulang" });
  return d;
}

export async function urlUnduhPajak(supa: SupabaseClient, d: DokumenPajakRow): Promise<string | null> {
  if (!d.path_pdf) return null;
  const { data, error } = await supa.storage.from(BUCKET_BERKAS).createSignedUrl(d.path_pdf, 600, {
    download: `${d.nomor_dokumen}.pdf`,
  });
  if (error || !data) return null;
  return data.signedUrl;
}

/** Cron: rincian gagal yang masih boleh dicoba + segel menggantung (kedua jenis). */
export async function sapuDokumenPajak(supa: SupabaseClient, batas = 20): Promise<{ dicoba: number; segel: number }> {
  const { data: gagal } = await supa
    .from("dokumen_pajak")
    .select(DOKUMEN_PAJAK_COLUMNS)
    .eq("jenis", "rincian")
    .in("status", ["gagal", "dibuat"])
    .lt("percobaan", PERCOBAAN_MAKS)
    .order("updated_at", { ascending: true })
    .limit(batas);
  let dicoba = 0;
  for (const d of (gagal ?? []) as DokumenPajakRow[]) {
    if (d.status === "dibuat" && d.tx_hash) continue;
    await prosesRincian(supa, d, null);
    dicoba++;
  }
  const { data: pending } = await supa
    .from("dokumen_pajak")
    .select(DOKUMEN_PAJAK_COLUMNS)
    .eq("status", "pending_segel")
    .limit(batas);
  let segel = 0;
  for (const d of (pending ?? []) as DokumenPajakRow[]) {
    await tuntaskanSegelPajak(supa, d);
    segel++;
  }
  return { dicoba, segel };
}
