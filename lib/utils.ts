import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabung className dengan resolusi konflik Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Singkat alamat EVM: 0x1234…abcd */
export function shortenAddress(address?: string | null, chars = 4): string {
  if (!address) return "—";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Format angka gaya Indonesia (1.234.567). */
export function formatNumberID(
  value: number,
  opts?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat("id-ID", opts).format(value);
}

/** Ringkas angka besar gaya Indonesia: 12500 → "12 rb", 1200000 → "1,2 jt". */
export function formatCompactID(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Waktu relatif berbahasa Indonesia sederhana: "baru saja", "3 jam lalu". */
export function timeAgoID(date: Date | string | number): string {
  const d = typeof date === "object" ? date : new Date(date);
  const diff = Math.round((d.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs || unit === "second") {
      return rtf.format(Math.round(diff / secs), unit);
    }
  }
  return "baru saja";
}
