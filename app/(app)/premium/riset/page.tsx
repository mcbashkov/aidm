import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Coins } from "lucide-react";
import { RisetView } from "@/components/research/riset-view";

export const metadata: Metadata = { title: "Riset Tren" };

/**
 * Riset pasar — fitur PREMIUM v3.0 (§7.8). Seluruh logika agen v2.0 dipakai
 * apa adanya; yang berubah hanya lokasinya di navigasi dan tidak adanya kuota
 * gratis harian untuk fitur ini.
 */
export default function PremiumRisetPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return (
    <div className="space-y-section">
      <header className="space-y-3">
        <Link
          href="/premium"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-muted"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Premium
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1>Riset Tren</h1>
            <p className="mt-1 text-[13px] text-ink-subtle">
              Agen meriset TikTok, Google Trends, dan marketplace secara live.
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-gold-tint px-3 py-1.5 text-[12px] font-bold text-gold-deep">
            <Coins className="h-3.5 w-3.5" aria-hidden />3 kredit
          </span>
        </div>
      </header>

      <RisetView initialQuery={searchParams.q ?? ""} />
    </div>
  );
}
