import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Parameter §8 dari tabel app_config (dengan default aman bila belum ada). */
export interface CreditParams {
  daily_free: number;
  research: number;
  research_cache: number;
  wizard: number;
  content: number;
  content_regen_max: number;
  review_mining: number;
}

export interface AgentParams {
  max_tool_calls: number;
  research_timeout_s: number;
  cache_max_age_days: number;
}

export const DEFAULT_CREDITS: CreditParams = {
  daily_free: 10,
  research: 3,
  research_cache: 1,
  wizard: 3,
  content: 1,
  content_regen_max: 3,
  review_mining: 5,
};

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

export const getCreditParams = () => getConfig("credits", DEFAULT_CREDITS);
export const getAgentParams = () => getConfig("agent", DEFAULT_AGENT);
