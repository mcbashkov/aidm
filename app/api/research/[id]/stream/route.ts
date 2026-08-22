import { cookies } from "next/headers";
import { readSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { charge } from "@/lib/credits";
import { getCreditParams } from "@/lib/config";
import { runResearchAgent } from "@/lib/agent/run";
import { toVectorLiteral } from "@/lib/ai/embeddings";
import type { ResearchBody } from "@/lib/research";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

const enc = new TextEncoder();
const sse = (data: unknown) => enc.encode(`data: ${JSON.stringify(data)}\n\n`);

/**
 * GET /api/research/:id/stream (§11) — SSE status + jawaban (§9.2).
 * Idempoten terhadap reconnect EventSource: query yang sudah done/failed
 * di-replay dari DB, tidak dijalankan ulang.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const uid = readSessionValue(raw)?.uid ?? null;
  if (!uid) return new Response("unauthenticated", { status: 401 });

  const queryId = params.id;
  const url = new URL(req.url);
  const forceFresh = url.searchParams.get("fresh") === "1";

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return new Response("unconfigured", { status: 501 });
  }

  const { data: query } = await supa
    .from("research_queries")
    .select("id, user_id, input_text, status")
    .eq("id", queryId)
    .eq("user_id", uid)
    .maybeSingle();
  if (!query) return new Response("not found", { status: 404 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(sse(data));
        } catch {
          /* klien menutup koneksi */
        }
      };

      try {
        // Replay untuk reconnect: jangan jalankan ulang query selesai.
        if (query.status === "done") {
          const { data: existing } = await supa
            .from("research_results")
            .select("body, confidence, created_at")
            .eq("query_id", queryId)
            .maybeSingle();
          if (existing?.body) {
            send({
              type: "done",
              body: existing.body,
              confidence: existing.confidence ?? 1,
              cache_hit: false,
              created_at: existing.created_at,
            });
          } else {
            send({ type: "error", message: "Hasil tidak ditemukan." });
          }
          return;
        }
        if (query.status === "failed" || query.status === "refunded") {
          send({
            type: "error",
            message: "Riset sebelumnya gagal. Kredit tidak terpotong — coba lagi.",
          });
          return;
        }
        if (query.status === "running") {
          send({
            type: "error",
            message: "Riset sedang berjalan di tab lain. Tunggu sebentar lalu buka riwayat.",
          });
          return;
        }

        // status = queued → jalankan.
        const startedAt = Date.now();
        await supa
          .from("research_queries")
          .update({ status: "running" })
          .eq("id", queryId);

        // Konteks profil user (§7.1 AC: dipakai agen sebagai konteks default).
        const { data: profile } = await supa
          .from("users")
          .select("role, kota, gaya_bahasa, categories:kategori_id(nama)")
          .eq("id", uid)
          .maybeSingle();
        const kategoriRel = profile?.categories as
          | { nama?: string }
          | { nama?: string }[]
          | null;
        const kategori = Array.isArray(kategoriRel)
          ? kategoriRel[0]?.nama
          : kategoriRel?.nama;

        const result = await runResearchAgent(
          query.input_text ?? "",
          {
            role: profile?.role,
            kategori,
            kota: profile?.kota,
            gaya: profile?.gaya_bahasa,
          },
          (event) => send(event),
          { forceFresh },
        );
        const latency = Date.now() - startedAt;

        if (!result.ok) {
          // Gagal/moderasi → kredit TIDAK terpotong (setara auto-refund, AC §7.2).
          await supa
            .from("research_queries")
            .update({
              status: result.reason === "error" ? "failed" : "refunded",
              latency_ms: latency,
              credits_charged: 0,
            })
            .eq("id", queryId);
          send({ type: "error", message: result.message, reason: result.reason });
          return;
        }

        // Sukses → potong kredit sesuai tarif (§8.2), tepat sekali.
        const tariffs = await getCreditParams();
        const cost = result.cacheHit ? tariffs.research_cache : tariffs.research;
        const balance = await charge(
          supa,
          uid,
          cost,
          result.cacheHit ? "research_cache" : "research",
          queryId,
        );

        const embeddingLiteral = result.embedding
          ? toVectorLiteral(result.embedding)
          : null;

        const { data: saved } = await supa
          .from("research_results")
          .insert({
            query_id: queryId,
            user_id: uid,
            summary: result.body.ringkasan,
            body: result.body as unknown as Record<string, unknown>,
            sources: result.sources,
            confidence: result.confidence,
            embedding: embeddingLiteral,
          })
          .select("id, created_at")
          .single();

        // Korpus tren anonim — hanya riset segar (§7.8).
        if (!result.cacheHit && saved) {
          await supa.from("trend_corpus").insert({
            result_id: saved.id,
            topik: (query.input_text ?? "").slice(0, 300),
            ringkas: result.body.ringkasan,
            sources: result.sources,
            confidence: result.confidence,
            embedding: embeddingLiteral,
            kota: profile?.kota ?? null,
          });
        }

        await supa
          .from("research_queries")
          .update({
            status: "done",
            cache_hit: result.cacheHit,
            latency_ms: latency,
            credits_charged: cost,
          })
          .eq("id", queryId);

        send({
          type: "done",
          body: result.body as unknown as ResearchBody,
          confidence: result.confidence,
          cache_hit: result.cacheHit,
          cache_age_days: result.cacheAgeDays ?? null,
          credits_charged: cost,
          balance,
          created_at: saved?.created_at ?? new Date().toISOString(),
        });
      } catch {
        await supa
          .from("research_queries")
          .update({ status: "failed", credits_charged: 0 })
          .eq("id", queryId);
        send({
          type: "error",
          message: "Terjadi gangguan. Kredit tidak terpotong — coba lagi ya.",
        });
      } finally {
        try {
          controller.close();
        } catch {
          /* sudah tertutup */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
