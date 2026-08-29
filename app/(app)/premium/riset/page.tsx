import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RisetView } from "@/components/research/riset-view";

export const metadata: Metadata = { title: "Riset Tren" };

/**
 * Riset pasar — fitur PREMIUM (§7.8). Seluruh logika agen dipakai apa adanya;
 * yang menentukan akses adalah status langganan, bukan saldo apa pun.
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
        <div>
          <h1>Riset Tren</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            Agen meriset TikTok, Google Trends, dan marketplace secara live.
          </p>
        </div>
      </header>

      <RisetView initialQuery={searchParams.q ?? ""} />
    </div>
  );
}
