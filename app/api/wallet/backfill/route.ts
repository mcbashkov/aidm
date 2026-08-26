import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cocokCronSecret, TIDAK_DITEMUKAN } from "@/lib/api/cron";
import { alamatWalletUser } from "@/lib/wallet/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Pagar atas jumlah user yang diperiksa satu jalan. Bukan pembatasan diam:
 *  bila terpotong, `terpotong: true` ikut dilaporkan dan endpoint tinggal
 *  dipanggil lagi — barisnya yang sudah pulih tidak akan diperiksa dua kali. */
const BATAS = 500;

/**
 * POST/GET /api/wallet/backfill — pemulihan sekali jalan untuk user yang tidak
 * punya baris `wallets` (§7.6 / §9).
 *
 * Ini BUKAN jalur kedua: ia memanggil `alamatWalletUser()` yang sama persis
 * dengan yang dipakai klaim, saldo, dan segel. Yang berbeda hanya pemicunya —
 * di sini operator, di sana permintaan pengguna. Kalau logikanya berubah, ia
 * berubah di satu tempat.
 *
 * Bentuknya endpoint, bukan berkas di `scripts/`, karena repo ini tidak punya
 * pemuat TypeScript untuk skrip Node (`scripts/*.mjs` polos) — sebuah skrip
 * .mjs terpaksa MENYALIN helper-nya, dan salinan itulah yang justru dilarang.
 * Otorisasinya meminjam penjaga `/api/relayer/tick`: `CRON_SECRET`, penyusup
 * dijawab 404.
 *
 * Aman dijalankan berkali-kali: user yang sudah punya baris `wallets` tidak
 * pernah menyentuh Privy sama sekali.
 */
async function backfill(req: Request) {
  if (!cocokCronSecret(req)) {
    return NextResponse.json(TIDAK_DITEMUKAN, { status: 404 });
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

  try {
    const [{ data: users }, { data: wallets }] = await Promise.all([
      supa
        .from("users")
        .select("id, privy_did")
        .order("created_at", { ascending: true })
        .limit(BATAS + 1),
      supa.from("wallets").select("user_id"),
    ]);

    const punyaWallet = new Set(
      ((wallets ?? []) as { user_id: string }[]).map((w) => w.user_id),
    );
    const semua = (users ?? []) as { id: string; privy_did: string | null }[];
    const terpotong = semua.length > BATAS;
    const tanpaWallet = semua
      .slice(0, BATAS)
      .filter((u) => !punyaWallet.has(u.id));

    const dipulihkan: { uid: string; alamat: string }[] = [];
    // Yang TIDAK pulih ikut dilaporkan satu per satu berikut sebabnya. Bug yang
    // sedang diperbaiki ini bertahan berhari-hari justru karena kegagalannya
    // senyap; ringkasan yang hanya menyebut jumlah akan mengulanginya.
    const belumSiap: string[] = [];
    const galat: string[] = [];

    for (const u of tanpaWallet) {
      const hasil = await alamatWalletUser(supa, u.id, u.privy_did);
      if (hasil.status === "ada") {
        dipulihkan.push({ uid: u.id, alamat: hasil.alamat });
      } else if (hasil.status === "belum-siap") {
        belumSiap.push(u.id);
      } else {
        galat.push(u.id);
      }
    }

    const ringkas = {
      ok: true,
      diperiksa: tanpaWallet.length,
      dipulihkan: dipulihkan.length,
      belumSiap: belumSiap.length,
      galat: galat.length,
      terpotong,
      rincian: { dipulihkan, belumSiap, galat },
    };
    console.log("[wallet] backfill:", JSON.stringify(ringkas));
    return NextResponse.json(ringkas);
  } catch (err) {
    console.error("[wallet] backfill gagal:", err);
    return NextResponse.json({ error: "Backfill gagal." }, { status: 500 });
  }
}

export const POST = backfill;
// GET ikut dilayani agar bisa dipicu penjadwal/curl sederhana, sama seperti
// /api/relayer/tick. Otorisasinya identik.
export const GET = backfill;
