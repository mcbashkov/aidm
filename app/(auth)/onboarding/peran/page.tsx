"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Store, ArrowRight } from "lucide-react";
import { StepDots } from "@/components/ui/step-dots";
import { cn } from "@/lib/utils";

type Role = "calon" | "umkm";

const OPTIONS: {
  role: Role;
  title: string;
  desc: string;
  icon: typeof Store;
}[] = [
  {
    role: "calon",
    title: "Saya mau mulai usaha",
    desc: "Belum punya usaha, cari ide & peluang yang lagi naik.",
    icon: Sparkles,
  },
  {
    role: "umkm",
    title: "Saya sudah punya usaha",
    desc: "Sudah jualan, mau baca tren & bikin konten promosi.",
    icon: Store,
  },
];

export default function PeranPage() {
  const router = useRouter();
  const [saving, setSaving] = useState<Role | null>(null);

  async function pick(role: Role) {
    setSaving(role);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
    } catch {
      // mode placeholder / offline — lanjut saja
    }
    router.push(role === "umkm" ? "/onboarding/usaha" : "/beranda");
  }

  return (
    <div className="space-y-7">
      <StepDots total={2} current={0} />
      <div className="space-y-2">
        <h1>Kamu di posisi mana?</h1>
        <p className="text-[15px] text-ink-muted">
          Biar rekomendasinya pas buat kamu.
        </p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map(({ role, title, desc, icon: Icon }) => (
          <button
            key={role}
            type="button"
            disabled={saving !== null}
            onClick={() => pick(role)}
            className={cn(
              "card flex w-full items-center gap-4 p-5 text-left transition-[transform,box-shadow] active:scale-[0.99]",
              saving === role ? "ring-2 ring-gold" : "hover:shadow-float",
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
            <ArrowRight className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
