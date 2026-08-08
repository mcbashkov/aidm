import { Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompactID, formatNumberID } from "@/lib/utils";

/** Counter kredit AI — pill di kanan-atas Beranda (§13). */
export function CreditChip({
  credits,
  className,
}: {
  credits: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink shadow-card",
        className,
      )}
    >
      <Zap className="h-4 w-4 fill-gold text-gold" aria-hidden />
      <span className="tnum">{formatNumberID(credits)}</span>
      <span className="text-ink-subtle">kredit</span>
    </span>
  );
}

/** Chip saldo IDMX (reward in-app). */
export function IdmxChip({
  idmx,
  className,
}: {
  idmx: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill bg-gold-tint px-3.5 py-2 text-[13px] font-semibold text-ink",
        className,
      )}
    >
      <Sparkles className="h-4 w-4 text-gold-deep" aria-hidden />
      <span className="tnum">{formatCompactID(idmx)}</span>
      <span className="text-ink-muted">IDMX</span>
    </span>
  );
}
