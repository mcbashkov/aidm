"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AskInputProps {
  placeholder?: string;
  onSubmit?: (text: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  defaultValue?: string;
}

/** Kolom input "Tanya apa saja…" dengan tombol kirim (§13). */
export function AskInput({
  placeholder = "Tanya apa saja…",
  onSubmit,
  disabled,
  autoFocus,
  className,
  defaultValue = "",
}: AskInputProps) {
  const [value, setValue] = React.useState(defaultValue);
  const canSend = value.trim().length > 0 && !disabled;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    onSubmit?.(value.trim());
    setValue("");
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex items-center gap-2 rounded-pill bg-surface p-1.5 pl-5 shadow-card transition-shadow focus-within:shadow-float",
        className,
      )}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-subtle disabled:opacity-50"
      />
      <button
        type="submit"
        aria-label="Kirim"
        disabled={!canSend}
        className="btn-send"
      >
        <ArrowUp className="h-5 w-5" aria-hidden />
      </button>
    </form>
  );
}
