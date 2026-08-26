import { cookies } from "next/headers";
import { jsonPribadi } from "@/lib/api/respons";
import { readSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { saldoIdmx } from "@/lib/token/saldo";
import { alamatWalletUser } from "@/lib/wallet/server";

export const runtime = "nodejs";
// Data milik satu pengguna: tidak boleh pernah dirender statis maupun
// disimpan lapisan mana pun.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/wallet/saldo — saldo IDMX on-chain milik pemanggil.
 *
 * Berdiri sendiri, DIPISAH dari `/api/me`, karena keduanya punya sifat
 * kegagalan yang berbeda:
 *
 *   /api/me          — Postgres. Selalu tersedia, balas dalam milidetik.
 *   /api/wallet/saldo — RPC opBNB. Bisa lambat, bisa gagal, di luar kendali kita.
 *
 * Sebelumnya keduanya satu endpoint, dan akibatnya nyata: nama usaha pengguna
 * tersandera pembacaan rantai hingga 2,5 detik, padahal namanya sudah ada di
 * database sejak awal. Satu endpoint tidak boleh mencampur data yang selalu
 * tersedia dengan data yang bisa gagal — yang lemah akan menarik yang kuat ke
 * bawah, tidak pernah sebaliknya.
 *
 * Batas waktu dan cache-nya hidup di `lib/token/saldo.ts` dan tidak berubah
 * oleh pemisahan ini; yang berpindah hanya siapa yang menanggung ongkosnya.
 */
export async function GET() {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const sesi = readSessionValue(raw);
  if (!sesi?.uid) {
    return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const supa = createSupabaseAdminClient();
    // Mengisi baris `wallets` susulan bila belum ada (lib/wallet/server.ts).
    // Endpoint ini dipanggil pada tiap navigasi, jadi ia yang paling sering
    // berkesempatan menutup celah itu — dan helper-nya hanya menyentuh Privy
    // ketika barisnya memang kosong.
    const hasil = await alamatWalletUser(supa, sesi.uid, sesi.did);

    // Belum punya dompet = saldo memang nol, dan itu jawaban yang pasti.
    // Privy yang tidak bisa ditanya BUKAN jawaban pasti — itu `null`,
    // "kami belum tahu", yang digambar klien berbeda dari nol.
    if (hasil.status === "belum-siap") return jsonPribadi({ idmx: 0 });
    if (hasil.status !== "ada") return jsonPribadi({ idmx: null });

    // `null` bila rantai tidak bisa dipastikan; klien membedakannya dari nol.
    return jsonPribadi({ idmx: await saldoIdmx(hasil.alamat) });
  } catch {
    return jsonPribadi({ idmx: null });
  }
}
