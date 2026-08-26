import type { SupabaseClient } from "@supabase/supabase-js";
import { wibDayStartIso } from "@/lib/wib";
import { getCreditParams } from "@/lib/config";

/**
 * Operasi kredit di atas ledger append-only (§7.5 / §10). Saldo = SUM(amount).
 * M1 memakai pola "charge-on-success": kredit dipotong hanya saat query sukses
 * (cache/segar), gagal total = tidak dipotong (memenuhi AC §7.2).
 */

export async function getBalance(
  supa: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data } = await supa
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", userId);
  return (data ?? []).reduce(
    (sum: number, row: { amount: number | null }) => sum + (row.amount ?? 0),
    0,
  );
}

/** Beri kredit gratis harian sekali per hari WIB (idempoten). Return saldo. */
export async function ensureDailyFree(
  supa: SupabaseClient,
  userId: string,
): Promise<number> {
  const params = await getCreditParams();
  const { data: existing } = await supa
    .from("credit_ledger")
    .select("id")
    .eq("user_id", userId)
    .eq("reason", "daily_free")
    .gte("created_at", wibDayStartIso())
    .limit(1);

  if (existing && existing.length > 0) {
    return getBalance(supa, userId);
  }

  const balance = await getBalance(supa, userId);
  const after = balance + params.daily_free;
  await supa.from("credit_ledger").insert({
    user_id: userId,
    amount: params.daily_free,
    reason: "daily_free",
    balance_after: after,
  });
  return after;
}

export async function charge(
  supa: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  refId?: string,
): Promise<number> {
  const balance = await getBalance(supa, userId);
  const after = balance - amount;
  await supa.from("credit_ledger").insert({
    user_id: userId,
    amount: -amount,
    reason,
    ref_id: refId ?? null,
    balance_after: after,
  });
  return after;
}
