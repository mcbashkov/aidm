import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { KontenView } from "@/components/premium/konten-view";

export const metadata: Metadata = { title: "Generator Konten" };

/** Generator konten — fitur PREMIUM (§7.8). */
export default function PremiumKontenPage() {
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
          <h1>Generator Konten</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            Ubah satu ide jadi teks siap tempel.
          </p>
        </div>
      </header>

      <KontenView />
    </div>
  );
}
