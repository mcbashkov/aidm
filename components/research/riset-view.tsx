"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, RefreshCw, Zap } from "lucide-react";
import { AskInput } from "@/components/ui/ask-input";
import { AnswerArticle } from "@/components/research/answer-article";
import { ResearchStatus } from "@/components/research/research-status";
import { SAMPLE_RESEARCH, type ResearchAnswer } from "@/lib/research";

type Phase = "idle" | "running" | "answered" | "error";

interface StreamEvent {
  type: "status" | "cache_hit" | "done" | "error";
  label?: string;
  body?: ResearchAnswer["body"];
  confidence?: number;
  cache_hit?: boolean;
  cache_age_days?: number | null;
  message?: string;
  reason?: string;
  created_at?: string;
}

/** Tampilan Chat Riset — agen live (SSE) dengan fallback demo yang jujur. */
export function RisetView({ initialQuery }: { initialQuery: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<string[]>([]);
  const [answer, setAnswer] = useState<ResearchAnswer | null>(null);
  const [cacheInfo, setCacheInfo] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const esRef = useRef<EventSource | null>(null);
  const startedRef = useRef(false);

  const closeStream = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const ask = useCallback(
    async (text: string, opts?: { fresh?: boolean }) => {
      closeStream();
      setNotice(null);
      setCacheInfo(null);
      setAnswer(null);
      setSteps([]);
      setLastQuestion(text);
      setPhase("running");

      let res: Response;
      try {
        res = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      } catch {
        setPhase("error");
        setNotice("Tidak bisa terhubung. Cek koneksi internetmu.");
        return;
      }

      if (res.status === 401 || res.status === 501) {
        // Mode demo: auth/agen belum dikonfigurasi → contoh format, ditandai jujur.
        setDemoMode(true);
        setSteps(["Mode demo — menampilkan contoh format jawaban"]);
        setTimeout(() => {
          setAnswer({
            ...SAMPLE_RESEARCH,
            question: text,
            createdAt: new Date().toISOString(),
          });
          setSteps([]);
          setPhase("answered");
        }, 600);
        return;
      }
      if (res.status === 402) {
        setPhase("error");
        setNotice(
          "Kredit kamu belum cukup untuk riset baru. Kredit gratis di-reset tiap hari pukul 00.00 WIB — pembelian kredit hadir di M3.",
        );
        return;
      }
      if (!res.ok) {
        setPhase("error");
        setNotice("Gagal memulai riset. Coba lagi ya.");
        return;
      }

      const { query_id } = (await res.json()) as { query_id: string };
      const es = new EventSource(
        `/api/research/${query_id}/stream${opts?.fresh ? "?fresh=1" : ""}`,
      );
      esRef.current = es;

      es.onmessage = (msg) => {
        let event: StreamEvent;
        try {
          event = JSON.parse(msg.data) as StreamEvent;
        } catch {
          return;
        }
        if (event.type === "status" && event.label) {
          setSteps((prev) =>
            prev[prev.length - 1] === event.label ? prev : [...prev, event.label!],
          );
        } else if (event.type === "cache_hit") {
          setCacheInfo(event.cache_age_days ?? 0);
        } else if (event.type === "done" && event.body) {
          setAnswer({
            question: text,
            createdAt: event.created_at ?? new Date().toISOString(),
            confidence: (event.confidence ?? 1) as 1 | 2 | 3,
            body: event.body,
          });
          if (event.cache_hit) setCacheInfo(event.cache_age_days ?? 0);
          setSteps([]);
          setPhase("answered");
          closeStream();
        } else if (event.type === "error") {
          setNotice(event.message ?? "Terjadi gangguan.");
          setSteps([]);
          setPhase("error");
          closeStream();
        }
      };
      es.onerror = () => {
        // EventSource retry otomatis; kalau koneksi mati permanen → error.
        if (es.readyState === EventSource.CLOSED) {
          setPhase((p) => (p === "running" ? "error" : p));
          setNotice((n) =>
            n ?? "Koneksi streaming terputus. Cek riwayat — hasil mungkin sudah tersimpan.",
          );
          closeStream();
        }
      };
    },
    [closeStream],
  );

  // Jalankan query awal dari ?q= sekali saja.
  useEffect(() => {
    if (initialQuery && !startedRef.current) {
      startedRef.current = true;
      void ask(initialQuery);
    }
    return closeStream;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-section">
      {demoMode ? (
        <div className="rounded-card bg-gold-tint px-5 py-3 text-[12px] text-ink-muted">
          <strong>Mode demo</strong> — isi kredensial di{" "}
          <code className="text-[11px]">.env.local</code> untuk riset live.
        </div>
      ) : null}

      <AskInput
        placeholder="Tanya tren, produk, atau harga…"
        defaultValue={initialQuery}
        disabled={phase === "running"}
        onSubmit={(t) => void ask(t)}
      />

      {phase === "running" ? <ResearchStatus steps={steps} /> : null}

      {notice ? (
        <div className="card animate-fade-up space-y-3 p-5">
          <p className="text-[14px] leading-relaxed text-ink">{notice}</p>
          {lastQuestion ? (
            <button
              type="button"
              onClick={() => void ask(lastQuestion)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-pill bg-surface-warm px-4 text-[13px] font-medium text-ink"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Coba lagi
            </button>
          ) : null}
        </div>
      ) : null}

      {phase === "answered" && answer ? (
        <>
          {cacheInfo !== null ? (
            <div className="flex animate-fade-up items-center justify-between gap-2 rounded-card bg-surface-warm px-5 py-3">
              <p className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                <Zap className="h-3.5 w-3.5 text-gold-deep" aria-hidden />
                Dari riset serupa — diperbarui{" "}
                {cacheInfo === 0 ? "hari ini" : `${cacheInfo} hari lalu`} (tarif hemat)
              </p>
              <button
                type="button"
                onClick={() => void ask(lastQuestion, { fresh: true })}
                className="shrink-0 text-[12px] font-semibold text-gold-deep"
              >
                Riset ulang terbaru
              </button>
            </div>
          ) : null}
          <AnswerArticle answer={answer} onLanjutan={(t) => void ask(t)} />
        </>
      ) : null}

      {phase === "idle" ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <Search className="h-7 w-7 text-ink-subtle" aria-hidden />
          <h2>Mulai riset pasarmu</h2>
          <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted">
            Ketik pertanyaan di atas — agen akan meriset TikTok, Google Trends,
            dan marketplace, lalu memberi insight siap eksekusi.
          </p>
        </div>
      ) : null}
    </div>
  );
}
