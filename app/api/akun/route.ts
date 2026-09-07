import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { readSessionValue } from "@/lib/auth/session-cookie";
import { getPrivyServerClient } from "@/lib/privy/server";
import { privyTidakDitemukan } from "@/lib/privy/identitas";
import { SESSION_COOKIE } from "@/lib/auth/constants";

export const runtime = "nodejs";

/**
 * DELETE /api/akun — hapus akun & seluruh data turunannya (§12 privasi / UU
 * PDP hak penghapusan).
 *
 * DUA SISTEM, dan itu yang menentukan bentuk berkas ini.
 *
 * Sampai 2026-09-07 rute ini hanya menghapus baris lokal. Cascade-nya memang
 * lengkap — 18 tabel, diaudit dari foreign key sungguhan — tapi identitas
 * Privy (DID + embedded wallet) tidak pernah disentuh. Akibatnya penghapusan
 * bisa DIBATALKAN oleh aplikasi kita sendiri satu detik kemudian: sesi Privy
 * di browser masih hidup, `/masuk` menyinkronkan ulang secara diam-diam, dan
 * akun lahir kembali berikut alamat dompet yang sama persis. Terlihat di log
 * produksi tiga kali berturut-turut, masing-masing dalam dua detik.
 *
 * Menghapus identitas Privy karena itu bukan pelengkap — ia YANG MEMBUAT
 * penghapusan berarti. Dan ia sekaligus pembeda STRUKTURAL yang dituntut:
 * sesi yang cookie-nya sekadar kedaluwarsa masih memegang DID yang sah, jadi
 * sinkronisasi ulangnya tetap bekerja seperti biasa; akun yang dihapus tidak
 * punya DID lagi untuk disinkronkan, sehingga kebangkitannya mustahil menurut
 * konstruksi — bukan menurut urutan waktu atau tebakan niat.
 *
 * URUTANNYA DISENGAJA: Privy dulu, baru baris lokal.
 *
 * Dua sistem tidak bisa dijadikan satu transaksi, jadi yang bisa dipilih hanya
 * inkonsistensi mana yang lebih ringan bila salah satunya gagal:
 *
 *   · Privy gagal → NOL yang dihapus, dilaporkan gagal. Keadaan tidak
 *     berubah, pengguna bisa mencoba lagi.
 *   · Lokal gagal setelah Privy sukses → data lokal tertinggal tanpa
 *     identitas. Buruk, dan dicatat keras supaya bisa dibereskan.
 *
 * Kebalikannya — lokal dulu, Privy belakangan — menghasilkan keadaan yang
 * PALING buruk bila gagal: pengguna melihat "akun terhapus" sementara
 * identitas dan dompetnya masih hidup di Privy. Ia mengira dirinya sudah
 * hilang padahal tidak. Itulah satu-satunya kegagalan yang berbohong kepada
 * pengguna, dan karena itu ia yang dihindari.
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

  const did = readSessionValue(cookies().get(SESSION_COOKIE)?.value)?.did;

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }

  // ── 1. Identitas Privy ────────────────────────────────────────────────────
  const privy = getPrivyServerClient();
  if (privy) {
    if (!did) {
      // Cookie sesi tanpa DID (bentuk lama). Tanpa DID kita tidak bisa
      // menghapus identitasnya, dan menghapus data lokal saja akan
      // menghasilkan persis kebohongan yang dihindari berkas ini. Lebih baik
      // meminta satu login ulang — cookie baru selalu membawa DID.
      return NextResponse.json(
        {
          error:
            "Sesimu terlalu lama. Masuk ulang sekali, lalu coba hapus akun lagi.",
        },
        { status: 409 },
      );
    }
    try {
      await privy.deleteUser(did);
    } catch (err) {
      // Privy menjawab "tidak ada user seperti itu" = identitasnya memang
      // sudah tidak ada. Tujuan kita tercapai, bukan gagal — dan menolak
      // melanjutkan di sini akan menjebak data lokal seseorang selamanya
      // hanya karena percobaan sebelumnya berhenti di tengah.
      if (!privyTidakDitemukan(err)) {
        console.error(`[akun] hapus identitas Privy gagal (did=${did}):`, err);
        return NextResponse.json(
          {
            error:
              "Akunmu belum bisa dihapus sekarang. Tidak ada datamu yang berubah — coba lagi sebentar lagi.",
          },
          { status: 502 },
        );
      }
    }
  }

  // ── 2. Baris lokal ────────────────────────────────────────────────────────
  // Satu `delete from users` sudah cukup: SEMUA tabel turunan memakai
  // `on delete cascade` (0002 dst.), jadi transaksi, rollup, segel, langganan,
  // dan wallet ikut terhapus tanpa daftar tabel yang harus dijaga manual di
  // sini — daftar seperti itu pasti tertinggal saat tabel baru ditambahkan.
  // Pengecualian tunggal & disengaja: `subscription_orders` kini `set null`
  // (migrasi 0030), karena catatan pembayaran wajib disimpan untuk pembukuan
  // sementara identitas pembayarnya tidak pernah termasuk kewajiban itu.
  //
  // Prasyarat yang sudah dipenuhi: migrasi 0014 memasang guard di trigger
  // rollup supaya cascade tidak menulis ulang `daily_rollups` untuk user yang
  // barusan hilang (dulu ini membuat penghapusan akun GAGAL TOTAL karena FK
  // violation).
  const { error } = await supa.from("users").delete().eq("id", uid);
  if (error) {
    // Identitas Privy sudah hilang di titik ini, jadi ini BUKAN kegagalan yang
    // bisa diulang pengguna — ia tidak akan bisa masuk lagi untuk mencoba.
    // Harus dibereskan dari sisi kita, dan karena itu berteriak.
    console.error(
      `[akun] DATA LOKAL TERTINGGAL TANPA IDENTITAS (uid=${uid}, did=${did}): identitas Privy sudah dihapus tetapi baris users gagal dihapus. Hapus manual — pengguna ini tidak bisa masuk lagi untuk mengulanginya sendiri.`,
      error,
    );
    return NextResponse.json(
      {
        error:
          "Sebagian data gagal dihapus. Tim kami sudah menerima laporannya dan akan menuntaskannya.",
      },
      { status: 500 },
    );
  }

  // Sesi dimatikan di sisi server juga — kalau hanya klien yang logout, cookie
  // lama masih menunjuk uid yang sudah tidak ada dan tiap request berakhir 500.
  cookies().delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
