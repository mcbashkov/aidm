import Anthropic from "@anthropic-ai/sdk";

/** Klien Claude API. Null bila ANTHROPIC_API_KEY belum diisi (mode placeholder). */
export function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}
