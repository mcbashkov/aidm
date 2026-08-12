"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { StepDots } from "@/components/ui/step-dots";
import { EARNER_OPTIONS, type EarnerType } from "@/lib/earner";
import { cn } from "@/lib/utils";

/**
 * Layar peran v3.0 (§7.1 alur #3): "Kamu berpenghasilan dari mana?".
 * Menggantikan pilihan calon/UMKM v2.0 — definisi pelaku mikro kini diperluas
 * negara (Perpres 27/2026), sehingga ojol berdiri sebagai peran tersendiri.
 */
export default function PeranPage() {
  const router = useRouter();
  const [saving, setSaving] = useState<EarnerType | null>(null);

  async function pick(earnerType: EarnerType) {
    setSaving(earnerType);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ earner_type: earnerType }),
      });
    } catch {
      // mode placeholder / offline — lanjut saja, peran disimpan ulang nanti
    }
    router.push("/onboarding/usaha");
  }

  return (
    <div className="space-y-7">
      <StepDots total={2} current={0} />
      <div className="space-y-2">
        <h1>Kamu berpenghasilan dari mana?</h1>
        <p className="text-[15px] text-ink-muted">
          Biar cara mencatatnya pas buat kamu.
        </p>
      </div>

      <div className="space-y-3">
        {EARNER_OPTIONS.map(({ value, title, desc, icon: Icon }) => (
          <button
            key={value}
            type="button"
            disabled={saving !== null}
            onClick={() => pick(value)}
            className={cn(
              "card flex w-full items-center gap-4 p-5 text-left transition-[transform,box-shadow] active:scale-[0.99]",
              saving === value ? "ring-2 ring-gold" : "hover:shadow-float",
              saving !== null && saving !== value && "opacity-50",
            )}
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-tint">
              <Icon className="h-6 w-6 text-gold-deep" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-serif text-card-title font-semibold text-ink">
                {title}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
                {desc}
              </span>
            </span>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-ink-subtle"
              aria-hidden
            />
          </button>
        ))}
      </div>
    </div>
  );
}
