"use client";

import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Status riset streaming (§7.2 alur #3) — daftar langkah yang bertambah
 * hidup: langkah aktif berdenyut emas, langkah selesai diberi centang.
 * Ringan: murni CSS, tanpa dependensi animasi.
 */
export function ResearchStatus({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="card animate-fade-up p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-tint">
          <Sparkles className="h-4 w-4 animate-pulse text-gold-deep" aria-hidden />
        </span>
        <p className="font-serif text-card-title font-semibold text-ink">
          AIDM sedang meriset…
        </p>
      </div>
      <ol className="mt-4 space-y-2.5" aria-live="polite">
        {steps.map((step, i) => {
          const active = i === steps.length - 1;
          return (
            <li
              key={`${i}-${step}`}
              className={cn(
                "flex items-center gap-2.5 text-[14px] transition-colors",
                active ? "text-ink" : "text-ink-subtle",
              )}
            >
              {active ? (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
                </span>
              ) : (
                <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              )}
              {step}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
