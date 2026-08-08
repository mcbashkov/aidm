"use client";

import { cn } from "@/lib/utils";

export interface PillOption<T extends string> {
  value: T;
  label: string;
}

interface PillToggleProps<T extends string> {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Pill toggle di atas layar — dipakai untuk mode **Riset | Konten** (§13).
 * Segmen aktif = charcoal, sisanya teks subtle.
 */
export function PillToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: PillToggleProps<T>) {
  return (
    <div
      role="tablist"
      aria-label="Mode"
      className={cn(
        "inline-flex items-center gap-1 rounded-pill bg-surface-warm p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "min-h-[44px] rounded-pill px-6 text-[14px] font-semibold transition-colors",
              active
                ? "bg-cta text-ink-invert"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
