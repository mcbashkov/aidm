import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrivyServerClient } from "@/lib/privy/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/constants";
import { bacaIdentitas, type MetodeMasuk } from "@/lib/privy/identitas";

export const runtime = "nodejs";

interface SessionBody {
  accessToken?: string;
  /** Tombol yang ditekan pengguna. Petunjuk, bukan bukti — divalidasi ke Privy
   *  di bawah. Tidak ada field identitas lain yang diterima dari klien. */
  authProvider?: string;
}

const METODE: MetodeMasuk[] = ["google", "email", "sms"];

/**
 * Tukar access token Privy → sesi AIDM.
 * 1) Verifikasi token (server-side) → dapat DID (bukti identitas).
 * 2) Baca identitas dari Privy memakai DID itu → email, telepon, dompet.
 * 3) Upsert users + wallets (service-role) → 100% akun punya wallet (AC §7.1).
 * 4) Set cookie sesi ber-HMAC.
 *
 * HARDENING §14 M5 (menutup TODO sejak M0). Sebelumnya alamat dompet, email,
 * dan nomor telepon diambil APA ADANYA dari badan permintaan, dengan alasan
 * "tokennya sudah terverifikasi". Alasan itu tidak berlaku: token membuktikan
 * pengirimnya memegang sesi yang sah, ia tidak membuktikan bahwa alamat dompet
 * yang ikut dikirim di JSON yang sama adalah miliknya. Siapa pun yang punya
 * akun bisa mengirim token aslinya sendiri berpasangan dengan alamat dompet
 * orang lain — dan `wallets.address` adalah tempat reward IDMX dibayarkan.
 *
 * Sekarang seluruh identitas dibaca ulang dari Privy lewat DID hasil
 * verifikasi. Yang masih boleh datang dari klien hanya `authProvider`, karena
 * ia sekadar mencatat tombol mana yang ditekan — dan itu pun ditolak bila
 * metodenya tidak benar-benar tertaut pada akun tersebut.
 */
export async function POST(req: Request) {
  const privy = getPrivyServerClient();
  if (!privy) {
    return NextResponse.json(
      { error: "Auth Privy belum dikonfigurasi." },
      { status: 501 },
    );
  }

  let body: SessionBody = {};
  try {
    body = (await req.json()) as SessionBody;
  } catch {
    /* body kosong */
  }
  if (!body.accessToken) {
    return NextResponse.json({ error: "accessToken wajib" }, { status: 400 });
  }

  let did: string;
  try {
    const claims = await privy.verifyAuthToken(body.accessToken);
    did = claims.userId;
  } catch {
    return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
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

  // `null` = Privy tidak bisa DITANYA, bukan "penggunanya tidak punya apa-apa".
  // Login tetap dilanjutkan: tokennya sudah terbukti sah, dan menolak masuk
  // karena gangguan pihak ketiga menghukum pengguna atas sesuatu yang bukan
  // urusannya. Yang dilakukan hanyalah TIDAK menulis apa pun yang tidak kita
  // ketahui — kolom yang sudah terisi dibiarkan apa adanya, dan dompet diisi
  // susulan oleh `alamatWalletUser()` pada permintaan berikutnya.
  const identitas = await bacaIdentitas(privy, did);

  // Hanya field yang BENAR-BENAR terbaca yang ikut ditulis. Menyertakan kunci
  // bernilai null pada upsert akan MENIMPA kolom yang sudah terisi — persis
  // cara `users.email` pernah terhapus diam-diam saat seseorang berpindah dari
  // email ke Google. Kunci yang tidak disertakan tidak disentuh sama sekali.
  const baris: Record<string, unknown> = { privy_did: did };
  if (identitas?.email) baris.email = identitas.email;
  if (identitas?.phone) baris.phone = identitas.phone;

  // Klaim klien diterima hanya bila metode itu memang tertaut di Privy.
  // Kalau tidak, dipakai metode yang ada — dan bila Privy tidak terbaca,
  // kolomnya tidak disentuh sama sekali.
  const diklaim = METODE.find((m) => m === body.authProvider);
  if (identitas) {
    const dipakai =
      diklaim && identitas.metode.has(diklaim)
        ? diklaim
        : METODE.find((m) => identitas.metode.has(m));
    if (dipakai) baris.auth_provider = dipakai;
  }

  const { data: userRow, error: userErr } = await supa
    .from("users")
    .upsert(baris, { onConflict: "privy_did" })
    .select("id")
    .single();

  if (userErr || !userRow) {
    console.error(`[auth] simpan user gagal (did=${did}):`, userErr);
    return NextResponse.json({ error: "Gagal menyimpan user" }, { status: 500 });
  }

  if (identitas?.alamat) {
    const { error: errWallet } = await supa.from("wallets").upsert(
      {
        user_id: userRow.id,
        address: identitas.alamat,
        provider: "privy",
        chain_default: "opbnb",
      },
      { onConflict: "user_id" },
    );
    // Gagal menyimpan dompet TIDAK menggagalkan login: `alamatWalletUser()`
    // akan mencobanya lagi pada permintaan berikutnya. Yang tidak boleh adalah
    // gagal diam-diam — `wallets.address` juga unik, dan bentrok di situ
    // berarti alamat yang sama terdaftar pada user lain.
    if (errWallet) {
      console.error(
        `[auth] simpan dompet gagal (uid=${userRow.id}, sqlstate=${
          (errWallet as { code?: string }).code ?? "-"
        }):`,
        errWallet,
      );
    }
  }

  cookies().set(
    SESSION_COOKIE,
    createSessionValue({ uid: userRow.id, did, iat: Date.now() }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  );

  return NextResponse.json({ ok: true, wallet: identitas?.alamat ?? null });
}

export async function DELETE() {
  cookies().delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
