"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Compass, Target, ChevronRight, Clock } from "lucide-react";
import { PillToggle } from "@/components/ui/pill-toggle";
import { AskInput } from "@/components/ui/ask-input";
import { SuggestionChips } from "@/components/ui/suggestion-chips";
import { CreditChip, IdmxChip } from "@/components/ui/credit-counter";
import { DEFAULT_MISSIONS } from "@/lib/missions";

type Mode = "riset" | "konten";

const CHIP_GROUPS = [
  {
    title: "Untukmu",
    items: [
      "Tren kuliner minggu ini",
      "Produk yang lagi naik di Bekasi",
      "Ide jualan modal 1 juta",
    ],
  },
  {
    title: "Gali lebih dalam",
    items: [
      "Analisis harga rice bowl",
      "Konten TikTok untuk hijab",
      "Kompetitor skincare lokal",
    ],
  },
];

export default function BerandaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("riset");
  const [credits, setCredits] = useState(10);
  const [idmx, setIdmx] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d?.authenticated && typeof d.credits === "number")
          setCredits(d.credits);
        if (typeof d?.idmx === "number") setIdmx(d.idmx);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function go(text: string) {
    if (mode === "konten") {
      router.push("/konten");
      return;
    }
    router.push(`/riset?q=${encodeURIComponent(text)}`);
  }

  return (
    <div className="space-y-section">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-ink-subtle">
            Selamat datang 👋
          </p>
          <h1 className="mt-1">Mau riset apa hari ini?</h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <CreditChip credits={credits} />
          <IdmxChip idmx={idmx} />
        </div>
      </header>

      <div className="flex justify-center">
        <PillToggle
          options={[
            { value: "riset", label: "Riset" },
            { value: "konten", label: "Konten" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>

      <AskInput
        placeholder={
          mode === "riset"
            ? "Tanya tren, produk, atau harga…"
            : "Deskripsikan produk untuk dibuatkan konten…"
        }
        onSubmit={go}
      />

      <SuggestionChips groups={CHIP_GROUPS} onPick={go} />

      <Link
        href="/riset"
        className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-float"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-tint">
          <Compass className="h-6 w-6 text-gold-deep" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="font-serif text-card-title font-semibold text-ink">
            Bingung mau usaha apa?
          </p>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            Jalankan Mode Peluang Usaha — 3 rekomendasi berbasis tren.
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
      </Link>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2>Misi hari ini</h2>
          <Link
            href="/misi"
            className="text-[13px] font-medium text-gold-deep"
          >
            Lihat semua
          </Link>
        </div>
        <div className="space-y-2">
          {DEFAULT_MISSIONS.slice(0, 2).map((m) => (
            <div key={m.code} className="card flex items-center gap-3 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-tint">
                <Target className="h-5 w-5 text-gold-deep" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-ink">{m.judul}</p>
                <p className="text-[12px] text-ink-subtle">{m.deskripsi}</p>
              </div>
              <span className="rounded-pill bg-gold-tint px-2.5 py-1 text-[12px] font-bold text-gold-deep tnum">
                +{m.reward}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2>Riset terakhir</h2>
        <div className="card flex flex-col items-center gap-2 p-8 text-center">
          <Clock className="h-6 w-6 text-ink-subtle" aria-hidden />
          <p className="text-[14px] text-ink-muted">
            Belum ada riset. Mulai dengan bertanya di atas.
          </p>
        </div>
      </section>
    </div>
  );
}
