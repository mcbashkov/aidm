import { cookies } from "next/headers";
import { jsonPribadi } from "@/lib/api/respons";
import { readSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { saldoIdmx } from "@/lib/token/saldo";

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
  const uid = readSessionValue(raw)?.uid ?? null;
  if (!uid) {
    return jsonPribadi({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const supa = createSupabaseAdminClient();
    const { data: wallet } = await supa
      .from("wallets")
      .select("address")
      .eq("user_id", uid)
      .maybeSingle();

    // Tanpa dompet, saldo memang tidak ada — dan itu jawaban yang pasti,
    // bukan kegagalan. Klien menampilkannya sebagai nol, bukan "—".
    if (!wallet?.address) return jsonPribadi({ idmx: 0 });

    // `null` bila rantai tidak bisa dipastikan; klien membedakannya dari nol.
    return jsonPribadi({ idmx: await saldoIdmx(wallet.address) });
  } catch {
    return jsonPribadi({ idmx: null });
  }
}
