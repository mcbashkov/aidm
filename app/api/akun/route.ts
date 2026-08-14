import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export const runtime = "nodejs";

/**
 * DELETE /api/akun — hapus akun & seluruh data turunannya (§12 privasi / UU
 * PDP hak penghapusan).
 *
 * Satu `delete from users` sudah cukup: SEMUA tabel turunan memakai
 * `on delete cascade` (0002 dst.), jadi transaksi, rollup, segel, kredit, dan
 * wallet ikut terhapus tanpa daftar tabel yang harus dijaga manual di sini —
 * daftar seperti itu pasti tertinggal saat tabel baru ditambahkan.
 *
 * Prasyarat yang sudah dipenuhi: migrasi 0014 memasang guard di trigger rollup
 * supaya cascade tidak menulis ulang `daily_rollups` untuk user yang barusan
 * hilang (dulu ini membuat penghapusan akun GAGAL TOTAL karena FK violation).
 *
 * Konfirmasi ada di klien; server tetap meminta bukti niat lewat body
 * `{konfirmasi:"HAPUS"}` supaya request nyasar/CSRF sederhana tidak cukup
 * untuk memusnahkan buku usaha seseorang.
 */
export async function DELETE(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { konfirmasi?: unknown } = {};
  try {
    body = (await req.json()) as { konfirmasi?: unknown };
  } catch {
    /* body kosong → ditolak di bawah */
  }
  if (body.konfirmasi !== "HAPUS") {
    return NextResponse.json(
      { error: "Konfirmasi penghapusan tidak valid." },
      { status: 400 },
    );
  }

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }

  const { error } = await supa.from("users").delete().eq("id", uid);
  if (error) {
    return NextResponse.json(
      { error: "Gagal menghapus akun. Coba lagi ya." },
      { status: 500 },
    );
  }

  // Sesi dimatikan di sisi server juga — kalau hanya klien yang logout, cookie
  // lama masih menunjuk uid yang sudah tidak ada dan tiap request berakhir 500.
  cookies().delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
