import { createClient } from "@supabase/supabase-js";

/**
 * Klien service-role — HANYA server. Melewati RLS; dipakai API routes untuk
 * menulis data yang terikat identitas Privy (mis. upsert users + wallets).
 * Otorisasi ditegakkan di lapisan API kita (identitas dari token Privy).
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "Supabase belum dikonfigurasi: set NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di .env.local",
    );
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
