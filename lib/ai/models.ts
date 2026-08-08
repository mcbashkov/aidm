/**
 * Model AI (§9.1): Sonnet-class untuk agen riset, model ringan untuk
 * moderasi/klasifikasi. Configurable via env.
 */
export const AGENT_MODEL = process.env.AIDM_AGENT_MODEL || "claude-sonnet-5";
export const LIGHT_MODEL = process.env.AIDM_LIGHT_MODEL || "claude-haiku-4-5";

export const isAnthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
