"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "gold";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-pill font-semibold " +
  "transition-[transform,opacity,background-color] active:scale-[0.985] " +
  "disabled:pointer-events-none disabled:opacity-50";

const variantClass: Record<Variant, string> = {
  // CTA utama — pill charcoal, teks putih (§13)
  primary: "bg-cta text-ink-invert hover:bg-charcoal-soft",
  // Sekunder mengambang: shadow lembut menggantikan border 1px (§13)
  secondary: "bg-surface text-ink shadow-card hover:bg-surface-warm",
  ghost: "text-ink-muted hover:bg-surface-warm",
  // Emas hanya untuk aksi bernilai (mis. Klaim reward) — dipakai hemat
  gold: "bg-gold-gradient text-cta shadow-gold hover:brightness-[1.03]",
};

const sizeClass: Record<Size, string> = {
  sm: "min-h-[40px] px-4 text-[13px]",
  md: "min-h-[48px] px-5 text-[14px]",
  lg: "min-h-[54px] px-6 text-[15px]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", fullWidth, type, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        base,
        variantClass[variant],
        sizeClass[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
