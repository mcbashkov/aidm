import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/ai/anthropic";
import { AGENT_MODEL, LIGHT_MODEL, AGENT_MAX_TOKENS } from "@/lib/ai/models";
import { getAgentParams } from "@/lib/config";
import { getEmbedding, toVectorLiteral } from "@/lib/ai/embeddings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  CUSTOM_TOOLS,
  WEB_SEARCH_TOOL,
  TOOL_STATUS_LABEL,
  executeCustomTool,
} from "@/lib/agent/tools";
import {
  buildSystemPrompt,
  SYNTHESIS_INSTRUCTION,
  type UserContext,
} from "@/lib/agent/system-prompt";
import { RESEARCH_BODY_SCHEMA, MODERATION_SCHEMA } from "@/lib/agent/schema";
import type { ResearchBody } from "@/lib/research";

/** Event streaming ke UI (§7.2 alur #3). */
export type AgentEvent =
  | { type: "status"; label: string }
  | { type: "cache_hit"; ageDays: number };

export interface AgentSuccess {
  ok: true;
  body: ResearchBody;
  confidence: 1 | 2 | 3;
  sources: { tool: string; fetched_at: string }[];
  cacheHit: boolean;
  cacheAgeDays?: number;
  embedding: number[] | null;
}

export interface AgentFailure {
  ok: false;
  reason: "moderation" | "no_data" | "error";
  message: string;
}

export type AgentResult = AgentSuccess | AgentFailure;

/* ── Moderasi (model ringan) — §7.2 ketentuan ───────────────────────────── */

async function moderate(client: Anthropic, question: string): Promise<boolean> {
  try {
    const res = await client.messages.create({
      model: LIGHT_MODEL,
      max_tokens: 64,
      system:
        "Klasifikasikan apakah pertanyaan user termasuk lingkup bisnis/pasar/marketing/usaha/produk/harga/tren untuk UMKM. Jawab sesuai skema.",
      messages: [{ role: "user", content: question }],
      output_config: {
        format: {
          type: "json_schema",
          schema: MODERATION_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return true; // ragu → loloskan
    const parsed = JSON.parse(text.text) as { in_scope?: boolean };
    return parsed.in_scope !== false;
  } catch {
    return true; // moderasi gagal → jangan blokir user
  }
}

/* ── Cek cache vektor (§7.2 alur #4) ────────────────────────────────────── */

/**
 * Ambang kemiripan cache. Angka 0,85 diwarisi dari embedding OpenAI 1536 dim;
 * sebaran skor Gemini 768 dim belum tentu sama, jadi bisa disetel lewat env
 * tanpa deploy ulang sambil dikalibrasi dari log `[cache]` di bawah.
 */
const CACHE_MIN_SIMILARITY =
  Number(process.env.AIDM_CACHE_MIN_SIMILARITY) || 0.85;

async function checkCache(
  question: string,
  embedding: number[] | null,
  maxAgeDays: number,
): Promise<{ body: ResearchBody; confidence: 1 | 2 | 3; ageDays: number } | null> {
  const q = question.slice(0, 80).replace(/\s+/g, " ");
  if (!embedding) {
    console.log(`[cache] verdict=OFF q="${q}" (embedding nonaktif)`);
    return null;
  }
  try {
    const supa = createSupabaseAdminClient();
    // Ambil kandidat terbaik APA PUN skornya (min_similarity 0), lalu terapkan
    // ambang di sini — supaya miss pun punya skor yang bisa dikalibrasi.
    const { data, error } = await supa.rpc("match_research_results", {
      query_embedding: toVectorLiteral(embedding),
      match_count: 1,
      max_age_days: maxAgeDays,
      min_similarity: 0,
    });
    if (error) {
      console.log(`[cache] verdict=ERROR q="${q}" msg=${error.message}`);
      return null;
    }
    const rows = (data ?? []) as {
      body: ResearchBody | null;
      summary: string | null;
      confidence: number | null;
      created_at: string;
      similarity: number | null;
    }[];
    const hit = rows[0];
    if (!hit?.body) {
      console.log(`[cache] verdict=EMPTY q="${q}" (belum ada kandidat)`);
      return null;
    }

    const sim = Number(hit.similarity ?? 0);
    const ageDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(hit.created_at).getTime()) / 86400000),
    );
    const pass = sim >= CACHE_MIN_SIMILARITY;
    console.log(
      `[cache] verdict=${pass ? "HIT" : "MISS"} sim=${sim.toFixed(4)} ` +
        `threshold=${CACHE_MIN_SIMILARITY} age=${ageDays}d q="${q}" ` +
        `match="${(hit.summary ?? "").slice(0, 80).replace(/\s+/g, " ")}"`,
    );
    if (!pass) return null;

    const conf = (hit.confidence ?? 1) as 1 | 2 | 3;
    return { body: hit.body, confidence: conf, ageDays };
  } catch (err) {
    console.log(
      `[cache] verdict=ERROR q="${q}" msg=${err instanceof Error ? err.message : "unknown"}`,
    );
    return null;
  }
}

/* ── Skor kepercayaan sumber (§7.8) ─────────────────────────────────────── */

function scoreConfidence(successfulTools: Set<string>): 1 | 2 | 3 {
  const n = successfulTools.size;
  if (n === 0) return 1;
  const hasPlatform =
    successfulTools.has("tiktok_trends") ||
    successfulTools.has("google_trends_id") ||
    successfulTools.has("marketplace_snapshot");
  if (n >= 2 && hasPlatform) return 3;
  if (n >= 2) return 2;
  return 1;
}

/* ── Runner utama ───────────────────────────────────────────────────────── */

export async function runResearchAgent(
  question: string,
  ctx: UserContext,
  emit: (event: AgentEvent) => void,
  opts?: { forceFresh?: boolean },
): Promise<AgentResult> {
  const client = getAnthropic();
  if (!client) {
    return {
      ok: false,
      reason: "error",
      message: "Agen riset belum dikonfigurasi (ANTHROPIC_API_KEY).",
    };
  }

  const params = await getAgentParams();
  const deadline = AbortSignal.timeout(params.research_timeout_s * 1000);
  const today = new Date().toISOString().slice(0, 10);

  // 1) Moderasi (§7.2): topik di luar lingkup ditolak sopan, kredit kembali.
  emit({ type: "status", label: "Memeriksa pertanyaan…" });
  const inScope = await moderate(client, question);
  if (!inScope) {
    return {
      ok: false,
      reason: "moderation",
      message:
        "Maaf, AIDM khusus membantu topik bisnis, pasar, dan pemasaran UMKM. Kredit kamu tidak terpotong — coba tanyakan hal seputar usaha ya.",
    };
  }

  // 2) Cek cache dulu (§7.2 #4) — tarif lebih murah bila kena.
  const embedding = await getEmbedding(question);
  if (!opts?.forceFresh) {
    emit({ type: "status", label: "Mengecek riset serupa…" });
    const cached = await checkCache(
      question,
      embedding,
      params.cache_max_age_days,
    );
    if (cached) {
      emit({ type: "cache_hit", ageDays: cached.ageDays });
      return {
        ok: true,
        body: cached.body,
        confidence: cached.confidence,
        sources: [{ tool: "corpus_cache", fetched_at: today }],
        cacheHit: true,
        cacheAgeDays: cached.ageDays,
        embedding,
      };
    }
  }

  // 3) Loop agen dengan tools (§9.2). Guardrail: maks N panggilan tool.
  const system = buildSystemPrompt(ctx, today);
  const tools = [
    ...CUSTOM_TOOLS,
    WEB_SEARCH_TOOL,
  ] as Anthropic.Messages.ToolUnion[];
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: question },
  ];
  const successfulTools = new Set<string>();
  const sources: { tool: string; fetched_at: string }[] = [];
  let toolCalls = 0;

  emit({ type: "status", label: "Menyusun rencana riset…" });

  try {
    let continuations = 0;
    while (true) {
      const response = await client.messages.create(
        {
          model: AGENT_MODEL,
          max_tokens: AGENT_MAX_TOKENS,
          system,
          tools,
          messages,
        },
        { signal: deadline },
      );

      // Server tool (web_search) berjalan otomatis; catat sebagai sumber.
      for (const block of response.content) {
        if (block.type === "server_tool_use" && block.name === "web_search") {
          emit({ type: "status", label: TOOL_STATUS_LABEL.web_search });
        }
        if (block.type === "web_search_tool_result") {
          const isError = !Array.isArray(block.content);
          if (!isError) {
            successfulTools.add("web_search");
            sources.push({ tool: "web_search", fetched_at: today });
          }
        }
      }

      if (response.stop_reason === "pause_turn") {
        if (++continuations > 4) break;
        messages.push({ role: "assistant", content: response.content });
        continue;
      }

      if (response.stop_reason !== "tool_use") {
        messages.push({ role: "assistant", content: response.content });
        break;
      }

      const toolUses = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
      );
      messages.push({ role: "assistant", content: response.content });

      const results: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        if (toolCalls >= params.max_tool_calls) {
          results.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify({
              status: "dibatasi",
              alasan: "batas panggilan tool tercapai; susun jawaban dari bukti yang ada",
            }),
          });
          continue;
        }
        toolCalls++;
        emit({
          type: "status",
          label: TOOL_STATUS_LABEL[tu.name] ?? `Menjalankan ${tu.name}…`,
        });
        const output = await executeCustomTool(tu.name, tu.input);
        try {
          const parsed = JSON.parse(output) as { status?: string };
          if (parsed.status === "ok") {
            successfulTools.add(tu.name);
            sources.push({ tool: tu.name, fetched_at: today });
          }
        } catch {
          /* output non-JSON — abaikan untuk skor */
        }
        results.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: output,
        });
      }
      messages.push({ role: "user", content: results });
    }

    // 4) Semua sumber gagal → jujur + refund (§9.3 aturan agen).
    if (successfulTools.size === 0) {
      return {
        ok: false,
        reason: "no_data",
        message:
          "Semua sumber data sedang tidak bisa diakses, jadi aku tidak bisa memberi jawaban berbasis data sekarang. Kredit kamu tidak terpotong — coba lagi beberapa saat lagi ya.",
      };
    }

    // 5) Sintesis terstruktur (§17).
    emit({ type: "status", label: "Menyusun insight…" });
    messages.push({ role: "user", content: SYNTHESIS_INSTRUCTION });
    const synthesis = await client.messages.create(
      {
        model: AGENT_MODEL,
        max_tokens: AGENT_MAX_TOKENS,
        system,
        messages,
        output_config: {
          format: {
            type: "json_schema",
            schema: RESEARCH_BODY_SCHEMA as unknown as Record<string, unknown>,
          },
        },
      },
      { signal: deadline },
    );
    // Output terpotong = JSON tidak lengkap. Laporkan apa adanya, jangan
    // biarkan jatuh ke JSON.parse dan muncul sebagai "gangguan" yang kabur.
    if (synthesis.stop_reason === "max_tokens") {
      return {
        ok: false,
        reason: "error",
        message:
          "Jawaban terpotong karena terlalu panjang. Kredit tidak terpotong — coba pertanyaan yang lebih spesifik.",
      };
    }
    const textBlock = synthesis.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return {
        ok: false,
        reason: "error",
        message: "Gagal menyusun jawaban. Kredit tidak terpotong.",
      };
    }
    const body = JSON.parse(textBlock.text) as ResearchBody;

    return {
      ok: true,
      body,
      confidence: scoreConfidence(successfulTools),
      sources,
      cacheHit: false,
      embedding,
    };
  } catch (err) {
    const timedOut =
      err instanceof Error &&
      (err.name === "AbortError" || err.name === "TimeoutError");
    return {
      ok: false,
      reason: "error",
      message: timedOut
        ? "Riset melewati batas waktu. Kredit tidak terpotong — coba pertanyaan yang lebih spesifik."
        : "Terjadi gangguan saat riset. Kredit tidak terpotong — coba lagi ya.",
    };
  }
}
