import { cn } from "@/lib/utils";

interface GaugeProps {
  /** Nilai saat ini. */
  value: number;
  /** Nilai maksimum (mis. 3 untuk skor kepercayaan §7.8, 100 untuk skor peluang). */
  max?: number;
  /** Label di bawah angka. */
  label?: string;
  /** Teks tengah override (default: value). */
  display?: string;
  size?: number;
  className?: string;
}

/**
 * Gauge lingkaran untuk skor/confidence peluang usaha (§13).
 * Cincin emas mengisi sesuai proporsi value/max.
 */
export function Gauge({
  value,
  max = 3,
  label,
  display,
  size = 76,
  className,
}: GaugeProps) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const offset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <div className={cn("inline-flex flex-col items-center gap-1", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={label ? `${label}: ${display ?? value}` : `${display ?? value}`}
      >
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="num-display fill-ink text-[22px]"
        >
          {display ?? value}
        </text>
      </svg>
      {label ? (
        <span className="text-[12px] font-medium text-ink-subtle">{label}</span>
      ) : null}
    </div>
  );
}
