import type { Metadata } from "next";
import Link from "next/link";
import {
  Video,
  Instagram,
  MessageCircle,
  CalendarDays,
  ChevronLeft,
  Coins,
} from "lucide-react";

export const metadata: Metadata = { title: "Generator Konten" };

const FORMATS = [
  { icon: Video, title: "Skrip TikTok", desc: "Hook–isi–CTA, 30–60 dtk" },
  { icon: Instagram, title: "Caption IG", desc: "Caption + hashtag" },
  { icon: MessageCircle, title: "Promo WA", desc: "Copywriting jualan" },
  { icon: CalendarDays, title: "Kalender 7 hari", desc: "Ide konten seminggu" },
];

/** Generator konten — fitur PREMIUM v3.0 (§7.8). */
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1>Generator Konten</h1>
            <p className="mt-1 text-[13px] text-ink-subtle">
              Ubah insight jadi konten siap pakai.
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-gold-tint px-3 py-1.5 text-[12px] font-bold text-gold-deep">
            <Coins className="h-3.5 w-3.5" aria-hidden />1 kredit
          </span>
        </div>
      </header>

      <div className="rounded-card bg-gold-tint px-5 py-3 text-[12px] text-ink-muted">
        Generator konten aktif di <strong>M5</strong>.
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FORMATS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-tint">
              <Icon className="h-5 w-5 text-gold-deep" aria-hidden />
            </span>
            <p className="mt-3 font-serif text-card-title font-semibold text-ink">
              {title}
            </p>
            <p className="text-[12px] text-ink-subtle">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
