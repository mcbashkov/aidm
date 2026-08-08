/**
 * Model AI (§9.1): Sonnet-class untuk agen riset, model ringan untuk
 * moderasi/klasifikasi. Configurable via env.
 */
export const AGENT_MODEL = process.env.AIDM_AGENT_MODEL || "claude-sonnet-5";
export const LIGHT_MODEL = process.env.AIDM_LIGHT_MODEL || "claude-haiku-4-5";

/**
 * Batas token output per panggilan agen. Pada Sonnet 5 adaptive thinking aktif
 * secara default (parameter `thinking` dihilangkan = adaptif), dan `max_tokens`
 * membatasi thinking + teks jawaban sekaligus. Angka harus longgar supaya
 * sintesis JSON (§17) tidak terpotong di tengah — output terpotong = JSON.parse
 * gagal = riset dianggap error meski datanya sudah terkumpul.
 */
export const AGENT_MAX_TOKENS =
  Number(process.env.AIDM_AGENT_MAX_TOKENS) || 8192;

export const isAnthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
