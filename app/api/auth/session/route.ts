import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPrivyServerClient } from "@/lib/privy/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/constants";

export const runtime = "nodejs";

interface SessionBody {
  accessToken?: string;
  wallet?: string;
  email?: string;
  phone?: string;
  authProvider?: string;
}

/**
 * Tukar access token Privy → sesi AIDM.
 * 1) Verifikasi token (server-side) → dapat DID (bukti identitas).
 * 2) Upsert users + wallets (service-role) → 100% akun punya wallet (AC §7.1).
 * 3) Set cookie sesi ber-HMAC.
 *
 * Catatan M0: alamat wallet/email/phone dikirim klien (wallet milik user
 * sendiri) setelah token terverifikasi. TODO: verifikasi ulang lewat
 * privy.getUser(did) saat hardening (§14 M5).
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

  const { data: userRow, error: userErr } = await supa
    .from("users")
    .upsert(
      {
        privy_did: did,
        email: body.email ?? null,
        phone: body.phone ?? null,
        auth_provider: body.authProvider ?? null,
      },
      { onConflict: "privy_did" },
    )
    .select("id")
    .single();

  if (userErr || !userRow) {
    return NextResponse.json(
      { error: "Gagal menyimpan user" },
      { status: 500 },
    );
  }

  if (body.wallet) {
    await supa.from("wallets").upsert(
      {
        user_id: userRow.id,
        address: body.wallet,
        provider: "privy",
        chain_default: "opbnb",
      },
      { onConflict: "user_id" },
    );
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

  return NextResponse.json({ ok: true, wallet: body.wallet ?? null });
}

export async function DELETE() {
  cookies().delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
