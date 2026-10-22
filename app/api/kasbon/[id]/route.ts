import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hapusCacheKesiapan } from "@/lib/kesiapan/server";
import { currentUserId } from "@/lib/catat/server";
import { jsonPribadi } from "@/lib/api/respons";
import { todayWib } from "@/lib/wib";
import { idSah } from "@/lib/kasbon/server";
import type { PaymentMethod } from "@/lib/transactions";

export const runtime = "nodejs";

const METODE: readonly PaymentMethod[] = ["tunai", "qris", "transfer", "ewallet"];

/**
 * PATCH /api/kasbon/:id — {aksi: "lunas", catat, metode}.
 *
 * Seluruh pekerjaannya di RPC `kasbon_lunasi` (0031), satu transaksi DB:
 * kunci barisnya, (bila `catat`) buat transaksi pelunasan pada HARI INI WIB,
 * tutup kasbonnya. Tidak ada keadaan separuh yang bisa membuat pengguna
 * menandainya lagi dan menghitung uang yang sama dua kali.
 *
 * `catat: false` = "Sudah kucatat" — pelunasannya sudah diucapkan di Catat,
 * jadi yang ditutup hanya kasbonnya. Pilihan ini wajib DIKIRIM eksplisit:
 * nilai yang hilang ditolak, bukan ditebak, karena kedua tebakan sama-sama
 * bisa salah dan salah satunya menggandakan uang di laporan.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const uid = currentUserId();
  if (!uid) {
    return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  }
  // Rollup/kasbon pengguna ini akan berubah → hasil Kesiapan Catatan hari ini
  // tidak lagi sah (lib/kesiapan/server.ts).
  hapusCacheKesiapan(uid);
  if (!idSah(params.id)) {
    return jsonPribadi({ error: "Kasbon tidak ditemukan." }, { status: 404 });
  }

  let body: { aksi?: unknown; catat?: unknown; metode?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* body kosong → ditolak di bawah */
  }
  if (body.aksi !== "lunas" || typeof body.catat !== "boolean") {
    return jsonPribadi(
      { error: "aksi \"lunas\" dan catat (true/false) wajib diisi." },
      { status: 400 },
    );
  }
  const metode =
    typeof body.metode === "string" &&
    (METODE as readonly string[]).includes(body.metode)
      ? body.metode
      : "tunai";

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
    const { data, error } = await supa.rpc("kasbon_lunasi", {
      p_user: uid,
      p_id: params.id,
      p_catat: body.catat,
      p_metode: metode,
      p_tanggal: todayWib(),
    });
    if (error) {
      // Kode galat milik 0031, bukan teks pesan: KB404 = tidak ada / bukan
      // milik pemanggil (dibedakan pun tidak boleh), KB409 = sudah selesai.
      if (error.code === "KB404") {
        return jsonPribadi({ error: "Kasbon tidak ditemukan." }, { status: 404 });
      }
      if (error.code === "KB409") {
        return jsonPribadi(
          { error: "Kasbon ini sudah lunas atau sudah dihapus." },
          { status: 409 },
        );
      }
      return jsonPribadi({ error: "Gagal menandai lunas." }, { status: 500 });
    }
    return jsonPribadi({
      ok: true,
      transaction_id: typeof data === "string" ? data : null,
    });
  } catch {
    return jsonPribadi(
      { error: "Terjadi gangguan. Coba lagi ya." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/kasbon/:id — untuk kasbon yang salah tangkap parser. Soft
 * delete (status `dihapus` + `deleted_at`), sama dengan transaksi. Kasbon
 * yang sudah lunas TIDAK bisa dihapus dari sini: uangnya sudah menjadi
 * transaksi, dan koreksinya di Riwayat.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const uid = currentUserId();
  if (!uid) {
    return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  }
  // Rollup/kasbon pengguna ini akan berubah → hasil Kesiapan Catatan hari ini
  // tidak lagi sah (lib/kesiapan/server.ts).
  hapusCacheKesiapan(uid);
  if (!idSah(params.id)) {
    return jsonPribadi({ error: "Kasbon tidak ditemukan." }, { status: 404 });
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
    const { data, error } = await supa
      .from("kasbon")
      .update({ status: "dihapus", deleted_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("user_id", uid)
      .in("status", ["aktif", "draft"])
      .select("id")
      .maybeSingle();
    if (error) {
      return jsonPribadi({ error: "Gagal menghapus." }, { status: 500 });
    }
    if (!data) {
      return jsonPribadi({ error: "Kasbon tidak ditemukan." }, { status: 404 });
    }
    return jsonPribadi({ ok: true });
  } catch {
    return jsonPribadi(
      { error: "Terjadi gangguan. Coba lagi ya." },
      { status: 500 },
    );
  }
}
