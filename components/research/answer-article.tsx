"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Sparkles, ChevronRight } from "lucide-react";
import type { ResearchAnswer } from "@/lib/research";
import { Gauge } from "@/components/ui/gauge";
import { timeAgoID, cn } from "@/lib/utils";

const CONFIDENCE_LABEL: Record<number, string> = {
  1: "1 sumber",
  2: "2 sumber",
  3: "sumber resmi",
};

/**
 * Jawaban riset sebagai halaman artikel (§13): kartu "Kamu bertanya" (judul
 * serif + timestamp), lalu isi terstruktur (ringkasan / data & bukti / aksi),
 * gauge confidence, tombol lanjutan, dan chip saran lanjutan.
 */
export function AnswerArticle({
  answer,
  onLanjutan,
}: {
  answer: ResearchAnswer;
  onLanjutan?: (text: string) => void;
}) {
  const [saved, setSaved] = useState(false);
  const { question, createdAt, confidence, body } = answer;

  return (
    <article className="space-y-4">
      {/* Kamu bertanya */}
      <div className="card p-5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">
          Kamu bertanya
        </p>
        <h1 className="mt-1.5">{question}</h1>
        <p className="mt-1 text-[12px] text-ink-subtle">
          {timeAgoID(createdAt)}
        </p>
      </div>

      {/* Ringkasan + confidence */}
      <div className="card flex items-start gap-4 p-5">
        <div className="flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">
            Ringkasan
          </p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
            {body.ringkasan}
          </p>
        </div>
        <Gauge
          value={confidence}
          max={3}
          display={String(confidence)}
          label={CONFIDENCE_LABEL[confidence] ?? "kepercayaan"}
          size={68}
        />
      </div>

      {/* Data & bukti */}
      <div className="card p-5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">
          Data &amp; bukti
        </p>
        <ul className="mt-3 space-y-3">
          {body.temuan.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              <div>
                <p className="text-[14px] leading-snug text-ink">
                  {t.poin}
                  {t.angka ? (
                    <span className="font-semibold text-gold-deep tnum">
                      {" "}
                      · {t.angka}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-subtle">
                  {t.sumber} · {t.tanggal}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Peluang / Aksi */}
      <div className="card p-5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">
          Peluang &amp; aksi untukmu
        </p>
        <ol className="mt-3 space-y-2.5">
          {body.peluang_aksi.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-tint text-[12px] font-bold text-gold-deep tnum">
                {i + 1}
              </span>
              <p className="pt-0.5 text-[14px] leading-snug text-ink">{a}</p>
            </li>
          ))}
        </ol>
      </div>

      {body.peringatan ? (
        <p className="rounded-card bg-surface-warm px-5 py-4 text-[13px] leading-relaxed text-ink-muted">
          {body.peringatan}
        </p>
      ) : null}

      {/* Tombol lanjutan */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/premium/konten"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-pill bg-cta px-5 text-[13px] font-semibold text-ink-invert"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Buatkan Konten
        </Link>
        <button
          type="button"
          onClick={() => setSaved((s) => !s)}
          className={cn(
            "inline-flex min-h-[44px] items-center gap-1.5 rounded-pill px-5 text-[13px] font-medium transition-colors",
            saved ? "bg-gold-tint text-ink" : "bg-surface text-ink shadow-card",
          )}
        >
          {saved ? (
            <BookmarkCheck className="h-4 w-4 text-gold-deep" aria-hidden />
          ) : (
            <Bookmark className="h-4 w-4" aria-hidden />
          )}
          {saved ? "Tersimpan" : "Simpan"}
        </button>
      </div>

      {/* Saran lanjutan */}
      {body.saran_lanjutan.length > 0 ? (
        <div className="space-y-2">
          <p className="px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">
            Gali lebih dalam
          </p>
          <div className="flex flex-col gap-2">
            {body.saran_lanjutan.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onLanjutan?.(s)}
                className="flex items-center justify-between gap-2 rounded-card bg-surface px-5 py-3.5 text-left text-[14px] text-ink shadow-card transition-shadow hover:shadow-float"
              >
                {s}
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}
