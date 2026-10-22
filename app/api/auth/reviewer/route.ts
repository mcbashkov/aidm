import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Akun demo untuk peninjau merchant (Midtrans).
 *
 * Peninjau tidak bisa memakai Google/OTP email, jadi mereka diberi SATU tautan:
 *   https://ai.idmtoken.com/api/auth/reviewer?key=<REVIEWER_ACCESS_KEY>
 * Membukanya langsung memasang sesi untuk akun demo yang profilnya sudah
 * lengkap, berisi beberapa transaksi contoh, dan berstatus BELUM berlangganan —
 * supaya alur bayar Snap bisa diuji dari awal.
 *
 * Pagar:
 *  - Mati total (404) bila `REVIEWER_ACCESS_KEY` tidak diisi. Cabut akses
 *    dengan mengosongkan variabel itu lalu redeploy.
 *  - Kunci dibandingkan timing-safe, dan minimal 16 karakter.
 *  - Sesinya sesi biasa milik satu user demo; tidak ada hak admin.
 *  - Dompetnya alamat tiruan tetap (bukan dompet Privy), jadi tidak ada dana
 *    nyata di dalamnya. Jangan jalankan klaim misi on-chain dengan akun ini.
 */

const DID = "reviewer:midtrans";
const EMAIL = "reviewer.midtrans@idmtoken.com";
const DOMPET = "0x0000000000000000000000000000000000dead01";

/** [jenis, nominal, kategori slug, catatan, hari yang lalu] */
const CONTOH: [("masuk" | "keluar"), number, string, string, number][] = [
  ["masuk", 450_000, "penjualan", "Jual nasi box 30 porsi", 0],
  ["keluar", 180_000, "bahan_baku", "Beli beras dan ayam", 0],
  ["masuk", 275_000, "penjualan", "Penjualan es teh dan gorengan", 1],
  ["keluar", 60_000, "transportasi", "Bensin motor antar pesanan", 1],
  ["masuk", 520_000, "penjualan", "Pesanan katering arisan", 2],
  ["keluar", 95_000, "operasional", "Gas elpiji dan plastik kemasan", 3],
  ["masuk", 310_000, "penjualan", "Penjualan harian warung", 4],
  ["keluar", 120_000, "bahan_baku", "Belanja sayur dan bumbu", 5],
];

function kunciSah(diberikan: string | null): boolean {
  const kunci = process.env.REVIEWER_ACCESS_KEY ?? "";
  if (kunci.length < 16 || !diberikan) return false;
  const a = crypto.createHash("sha256").update(diberikan).digest();
  const b = crypto.createHash("sha256").update(kunci).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  if (!process.env.REVIEWER_ACCESS_KEY) {
    return new NextResponse("Not found", { status: 404 });
  }
  const url = new URL(req.url);
  if (!kunciSah(url.searchParams.get("key"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 501 });
  }

  const { data: kat } = await supa
    .from("categories")
    .select("id, slug");
  const idKategori = new Map((kat ?? []).map((k) => [k.slug as string, k.id as string]));

  const { data: user, error } = await supa
    .from("users")
    .upsert(
      {
        privy_did: DID,
        auth_provider: "email",
        email: EMAIL,
        role: "umkm",
        earner_type: "dagang",
        nama_usaha: "Warung Demo Reviewer",
        kategori_id: idKategori.get("kuliner") ?? null,
        kota: "Cianjur",
        provinsi: "Jawa Barat",
        status: "active",
        deleted_at: null,
      },
      { onConflict: "privy_did" },
    )
    .select("id")
    .single();
  if (error || !user) {
    console.error("[reviewer] simpan user demo gagal:", error);
    return NextResponse.json({ error: "Gagal menyiapkan akun demo" }, { status: 500 });
  }

  await supa
    .from("wallets")
    .upsert(
      { user_id: user.id, address: DOMPET, provider: "privy", chain_default: "opbnb" },
      { onConflict: "user_id" },
    );

  // Selalu mulai dari "belum berlangganan" dengan masa coba sudah terpakai,
  // supaya layar Premium langsung menawarkan bayar (yang ingin diuji peninjau).
  await supa.from("subscriptions").upsert(
    {
      user_id: user.id,
      status: "tidak_aktif",
      berakhir_at: null,
      sumber: null,
      coba_dipakai: true,
    },
    { onConflict: "user_id" },
  );

  // Data contoh hanya diisi sekali; tidak menggandakan di login berikutnya.
  const { count } = await supa
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (!count) {
    const baris = CONTOH.map(([jenis, amount, slug, catatan, hari]) => ({
      user_id: user.id,
      jenis,
      amount,
      kategori_id: idKategori.get(slug) ?? null,
      payment_method: "tunai",
      catatan,
      occurred_at: new Date(Date.now() - hari * 86_400_000).toISOString(),
      source: "manual",
      parsed_by: "manual",
      status: "confirmed",
    }));
    const { error: errTx } = await supa.from("transactions").insert(baris);
    if (errTx) console.error("[reviewer] isi transaksi contoh gagal:", errTx);
  }

  cookies().set(
    SESSION_COOKIE,
    createSessionValue({ uid: user.id, did: DID, iat: Date.now() }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    },
  );

  const res = NextResponse.redirect(new URL("/beranda", url.origin));
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
