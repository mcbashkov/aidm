import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Parameter §8 dari tabel `app_config`.
 *
 * Blok Kredit AI DICABUT pada 0027: modelnya berganti ke langganan bulanan,
 * dan angkanya kini hidup di `lib/langganan/index.ts` sebagai konstanta —
 * harga dan kuota langganan bukan sesuatu yang berubah diam-diam lewat baris
 * database. Kunci `credits` di `app_config` dibiarkan ada sebagai arsip.
 */
export interface AgentParams {
  max_tool_calls: number;
  research_timeout_s: number;
  cache_max_age_days: number;
}

export const DEFAULT_AGENT: AgentParams = {
  max_tool_calls: 6,
  research_timeout_s: 120,
  cache_max_age_days: 7,
};

async function getConfig<T>(key: string, fallback: T): Promise<T> {
  try {
    const supa = createSupabaseAdminClient();
    const { data } = await supa
      .from("app_config")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return ((data?.value as T) ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export const getAgentParams = () => getConfig("agent", DEFAULT_AGENT);
