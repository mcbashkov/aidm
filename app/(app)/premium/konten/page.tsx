import type { Metadata } from "next";
import {
  Video,
  Instagram,
  MessageCircle,
  CalendarDays,
} from "lucide-react";

export const metadata: Metadata = { title: "Konten" };

const FORMATS = [
  { icon: Video, title: "Skrip TikTok", desc: "Hook–isi–CTA, 30–60 dtk" },
  { icon: Instagram, title: "Caption IG", desc: "Caption + hashtag" },
  { icon: MessageCircle, title: "Promo WA", desc: "Copywriting jualan" },
  { icon: CalendarDays, title: "Kalender 7 hari", desc: "Ide konten seminggu" },
];

export default function KontenPage() {
  return (
    <div className="space-y-section">
      <header>
        <h1>Konten</h1>
        <p className="mt-1 text-[13px] text-ink-subtle">
          Ubah insight jadi konten siap pakai.
        </p>
      </header>

      <div className="rounded-card bg-gold-tint px-5 py-3 text-[12px] text-ink-muted">
        Generator konten aktif di <strong>M2</strong>.
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
