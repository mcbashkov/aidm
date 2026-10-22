/**
 * Orkestrasi Berkas Pengajuan (§1.5): nomor → render → simpan ke bucket
 * privat → SHA-256 → notarisasi hash → status. Dipanggil webhook Midtrans
 * (bayar sukses), rute pesan (jalur Plus), dan cron pemeliharaan (coba ulang).
 *
 * Yang pernah ke rantai hanya HASH (attestFor dengan periodKey
 * keccak("berkas:<nomor>")). Tidak ada angka keuangan di luar database.
 */

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todayWib } from "@/lib/wib";
import { KATALOG, labelBerkasPeran, type KodeProduk } from "@/lib/langganan/katalog";
import { ambilDataBerkas } from "@/lib/berkas/data";
import { renderBerkasPdf } from "@/lib/berkas/render";
import { kodeVerifikasiBaru, nomorDokumen } from "@/lib/berkas/nomor";
import { alamatWalletUser } from "@/lib/wallet/server";
import { attestOnChain, cekReceipt, isSealConfigured } from "@/lib/laporan/segel-server";

export const BUCKET_BERKAS = "berkas";
export const PERCOBAAN_MAKS = 3;
export const URL_VERIFIKASI_DASAR = "https://ai.idmtoken.com/verifikasi/";

export type StatusBerkas = "menunggu_bayar" | "dibuat" | "pending_segel" | "confirmed" | "gagal";

export interface BerkasRow {
  id: string;
  user_id: string;
  kode: "berkas6" | "berkas12";
  periode_awal: string;
  periode_akhir: string;
  nomor_dokumen: string;
  kode_verifikasi: string;
  order_id: string | null;
  path_pdf: string | null;
  sha256: string | null;
  tx_hash: string | null;
  status: StatusBerkas;
  percobaan: number;
  galat: string | null;
  created_at: string;
}

export const BERKAS_COLUMNS =
  "id, user_id, kode, periode_awal, periode_akhir, nomor_dokumen, kode_verifikasi, order_id, path_pdf, sha256, tx_hash, status, percobaan, galat, created_at";

export function urlVerifikasi(kode: string): string {
  return `${URL_VERIFIKASI_DASAR}${kode}`;
}

/** Jejak pratinjau/klik/bayar (§1.1). Gagal mencatat tidak pernah menggagalkan alur. */
export async function catatPremiumEvent(
  supa: SupabaseClient,
  ev: { userId: string; earnerType: string | null; kode: KodeProduk; aksi: "lihat_pratinjau" | "klik_beli" | "bayar_sukses" },
): Promise<void> {
  try {
    await supa.from("premium_events").insert({
      user_id: ev.userId,
      earner_type: ev.earnerType,
      kode: ev.kode,
      aksi: ev.aksi,
      harga_idr: KATALOG[ev.kode].hargaIdr,
    });
  } catch {
    /* jejak, bukan alur */
  }
}

function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Nomor urut bulan ini = jumlah dokumen bulan ini + 1 (ulang bila unik gagal). */
async function nomorBerikut(supa: SupabaseClient, bulanWib: string): Promise<string> {
  const prefix = `BK-${bulanWib.replace("-", "")}-`;
  const { count } = await supa
    .from("berkas_pengajuan")
    .select("id", { count: "exact", head: true })
    .like("nomor_dokumen", `${prefix}%`);
  return nomorDokumen(bulanWib, (count ?? 0) + 1);
}

/**
 * Buat baris berkas untuk pengguna + kode. Baris lahir berstatus `gagal`
 * (percobaan 0, galat "belum dirender") lalu diproses; bila proses mati di
 * tengah, cron menemukannya sebagai `gagal` dan mencoba lagi — tidak ada
 * keadaan "setengah jadi" yang tidak terlihat.
 */
export async function buatBerkas(
  supa: SupabaseClient,
  args: { userId: string; kode: "berkas6" | "berkas12"; orderId: string | null; did: string | null },
): Promise<BerkasRow> {
  const bulanIni = todayWib().slice(0, 7);
  const produk = KATALOG[args.kode];
  const bulan = produk.bulan as 6 | 12;
  const akhir = geserBulanYm(bulanIni, 1);
  const awal = geserBulanYm(bulanIni, bulan);

  let baris: BerkasRow | null = null;
  for (let i = 0; i < 5 && !baris; i++) {
    const nomor = await nomorBerikut(supa, bulanIni);
    const { data, error } = await supa
      .from("berkas_pengajuan")
      .insert({
        user_id: args.userId,
        kode: args.kode,
        periode_awal: `${awal}-01`,
        periode_akhir: `${akhir}-01`,
        nomor_dokumen: nomor,
        kode_verifikasi: kodeVerifikasiBaru(),
        order_id: args.orderId,
        status: "gagal",
        percobaan: 0,
        galat: "belum dirender",
      })
      .select(BERKAS_COLUMNS)
      .maybeSingle();
    if (!error && data) baris = data as BerkasRow;
    else if (error && error.code !== "23505") throw error; // selain unik → lempar
  }
  if (!baris) throw new Error("nomor dokumen tidak kunjung unik");
  return prosesBerkas(supa, baris, args.did);
}

/** Render + simpan + hash + notarisasi untuk baris yang sudah ada. Idempoten
 *  per tahap: tahap yang sudah selesai (path_pdf/sha256/tx_hash) dilewati. */
export async function prosesBerkas(
  supa: SupabaseClient,
  baris: BerkasRow,
  did: string | null,
): Promise<BerkasRow> {
  let b = baris;
  try {
    if (!b.path_pdf || !b.sha256) {
      const { data: u } = await supa.from("users").select("earner_type").eq("id", b.user_id).maybeSingle();
      const bulan = KATALOG[b.kode].bulan as 6 | 12;
      const data = await ambilDataBerkas(supa, b.user_id, bulan, todayWib().slice(0, 7));
      const pdf = await renderBerkasPdf({
        data,
        label: labelBerkasPeran((u as { earner_type: string | null } | null)?.earner_type, bulan),
        nomorDokumen: b.nomor_dokumen,
        kodeVerifikasi: b.kode_verifikasi,
        tanggalTerbit: b.created_at.slice(0, 10),
        urlVerifikasi: urlVerifikasi(b.kode_verifikasi),
        pratinjau: false,
      });
      const path = `${b.user_id}/${b.nomor_dokumen}.pdf`;
      const { error: errUp } = await supa.storage
        .from(BUCKET_BERKAS)
        .upload(path, pdf, { contentType: "application/pdf", upsert: true });
      if (errUp) throw new Error(`simpan PDF: ${errUp.message}`);
      const hash = sha256Hex(pdf);
      b = await perbarui(supa, b.id, { path_pdf: path, sha256: hash, status: "dibuat", galat: null });
    }

    if (!b.tx_hash) {
      if (!isSealConfigured()) {
        // Tanpa konfigurasi segel, dokumen tetap sah & bisa diunduh; notarisasi
        // menunggu env (PROGRESS "Butuh tangan PO"). Status tetap `dibuat`.
        return await perbarui(supa, b.id, { galat: "notarisasi: segel belum dikonfigurasi" });
      }
      const w = await alamatWalletUser(supa, b.user_id, did);
      if (w.status !== "ada") {
        return await perbarui(supa, b.id, { galat: `notarisasi: dompet ${w.status}` });
      }
      const hasil = await attestOnChain(w.alamat, `berkas:${b.nomor_dokumen}`, b.sha256 as string);
      b = await perbarui(supa, b.id, {
        tx_hash: hasil.txHash,
        status: hasil.confirmed ? "confirmed" : "pending_segel",
        galat: null,
      });
      return b;
    }

    if (b.status === "pending_segel") return tuntaskanSegel(supa, b);
    return b;
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    return perbarui(supa, b.id, {
      status: b.path_pdf && b.sha256 ? "dibuat" : "gagal",
      percobaan: b.percobaan + 1,
      galat: pesan.slice(0, 300),
    });
  }
}

/** Segel yang menggantung: cek receipt (pola GET /api/laporan/segel/:period). */
export async function tuntaskanSegel(supa: SupabaseClient, b: BerkasRow): Promise<BerkasRow> {
  if (b.status !== "pending_segel" || !b.tx_hash || !isSealConfigured()) return b;
  const r = await cekReceipt(b.tx_hash as `0x${string}`);
  if (r === "confirmed") return perbarui(supa, b.id, { status: "confirmed" });
  if (r === "failed") return perbarui(supa, b.id, { status: "dibuat", tx_hash: null, galat: "notarisasi: transaksi gagal, dicoba ulang" });
  return b;
}

async function perbarui(supa: SupabaseClient, id: string, patch: Partial<BerkasRow>): Promise<BerkasRow> {
  const { data, error } = await supa
    .from("berkas_pengajuan")
    .update(patch)
    .eq("id", id)
    .select(BERKAS_COLUMNS)
    .maybeSingle();
  if (error || !data) throw error ?? new Error("perbarui berkas gagal");
  return data as BerkasRow;
}

/** Signed URL 10 menit untuk unduh (ulang). */
export async function urlUnduh(supa: SupabaseClient, b: BerkasRow): Promise<string | null> {
  if (!b.path_pdf) return null;
  const { data, error } = await supa.storage.from(BUCKET_BERKAS).createSignedUrl(b.path_pdf, 600, {
    download: `${b.nomor_dokumen}.pdf`,
  });
  if (error || !data) return null;
  return data.signedUrl;
}

/** Jatah Plus: dokumen lewat Plus (order_id NULL) dalam 365 hari terakhir. */
export async function jumlahBerkasPlus(supa: SupabaseClient, userId: string): Promise<number> {
  const sejak = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const { count } = await supa
    .from("berkas_pengajuan")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("order_id", null)
    .neq("status", "gagal")
    .gte("created_at", sejak);
  return count ?? 0;
}

/** Cron: berkas gagal yang masih boleh dicoba + segel menggantung. */
export async function sapuBerkas(supa: SupabaseClient, batas = 20): Promise<{ dicoba: number; segel: number }> {
  const { data: gagal } = await supa
    .from("berkas_pengajuan")
    .select(BERKAS_COLUMNS)
    .in("status", ["gagal", "dibuat"])
    .lt("percobaan", PERCOBAAN_MAKS)
    .order("updated_at", { ascending: true })
    .limit(batas);
  let dicoba = 0;
  for (const b of (gagal ?? []) as BerkasRow[]) {
    // `dibuat` tanpa tx_hash = PDF ada, notarisasi belum — coba lagi juga.
    if (b.status === "dibuat" && b.tx_hash) continue;
    await prosesBerkas(supa, b, null);
    dicoba++;
  }
  const { data: pending } = await supa
    .from("berkas_pengajuan")
    .select(BERKAS_COLUMNS)
    .eq("status", "pending_segel")
    .limit(batas);
  let segel = 0;
  for (const b of (pending ?? []) as BerkasRow[]) {
    await tuntaskanSegel(supa, b);
    segel++;
  }
  return { dicoba, segel };
}

function geserBulanYm(bulan: string, n: number): string {
  const [y, m] = bulan.split("-").map(Number);
  const idx = y * 12 + (m - 1) - n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}
