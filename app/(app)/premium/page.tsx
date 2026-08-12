import type { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  PenLine,
  Compass,
  ChevronRight,
  Coins,
  Info,
} from "lucide-react";

export const metadata: Metadata = { title: "Premium" };

const FITUR = [
  {
    href: "/premium/riset",
    icon: Search,
    title: "Riset Tren",
    desc: "Tren TikTok, Google Trends, dan harga marketplace — diriset live.",
    tarif: "3 kredit",
    aktif: true,
  },
  {
    href: "/premium/peluang",
    icon: Compass,
    title: "Peluang Usaha",
    desc: "Wizard 4 langkah → 3 rekomendasi usaha berbasis tren.",
    tarif: "3 kredit",
    aktif: false,
  },
  {
    href: "/premium/konten",
    icon: PenLine,
    title: "Generator Konten",
    desc: "Skrip TikTok, caption IG, promo WA, kalender konten 7 hari.",
    tarif: "1 kredit",
    aktif: true,
  },
];

/**
 * Etalase fitur premium (§13 layar 10). Riset & konten hidup di sini setelah
 * pivot v3.0 — mencatat dan laporan tetap gratis di bottom-nav (§7.8).
 */
export default function PremiumPage() {
  return (
    <div className="space-y-section">
      <header>
        <h1>Premium</h1>
        <p className="mt-1 text-[13px] text-ink-subtle">
          Fitur riset & konten, dibayar pakai Kredit AI.
        </p>
      </header>

      <div className="space-y-2">
        {FITUR.map(({ href, icon: Icon, title, desc, tarif, aktif }) => {
          const inner = (
            <>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-tint">
                <Icon className="h-6 w-6 text-gold-deep" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-serif text-card-title font-semibold text-ink">
                    {title}
                  </span>
                  {!aktif ? (
                    <span className="rounded-pill bg-surface-warm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                      Segera
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
                  {desc}
                </span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold text-gold-deep">
                  <Coins className="h-3.5 w-3.5" aria-hidden />
                  {tarif}
                </span>
              </span>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-ink-subtle"
                aria-hidden
              />
            </>
          );

          return aktif ? (
            <Link
              key={href}
              href={href}
              className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-float"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={href}
              className="card flex items-center gap-4 p-5 opacity-55"
              aria-disabled
            >
              {inner}
            </div>
          );
        })}
      </div>

      <div className="card space-y-2 p-5">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gold-deep" aria-hidden />
          <h3>Kenapa fitur ini berbayar?</h3>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Mencatat dan melihat laporan <strong>gratis selamanya</strong>. Riset
          menarik data dari banyak sumber sekaligus, jadi biayanya jauh lebih
          besar — Kredit AI menutup biaya itu. Kredit dibeli dengan uang, tidak
          pernah ditukar dari token.
        </p>
      </div>
    </div>
  );
}
