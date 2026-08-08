import type { Metadata } from "next";
import { Target, Info } from "lucide-react";
import { DEFAULT_MISSIONS } from "@/lib/missions";

export const metadata: Metadata = { title: "Misi & Reward" };

export default function MisiPage() {
  const totalDaily = DEFAULT_MISSIONS.filter((m) => m.tipe === "daily").reduce(
    (sum, m) => sum + m.reward,
    0,
  );

  return (
    <div className="space-y-section">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1>Misi &amp; Reward</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            Kumpulkan IDMX dari aktivitas nyata.
          </p>
        </div>
        <span className="shrink-0 rounded-pill bg-gold-tint px-3 py-1.5 text-[13px] font-bold text-gold-deep tnum">
          +{totalDaily} / hari
        </span>
      </header>

      <div className="space-y-2">
        {DEFAULT_MISSIONS.map((m) => (
          <div key={m.code} className="card flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold-tint">
              <Target className="h-6 w-6 text-gold-deep" aria-hidden />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-semibold text-ink">{m.judul}</p>
                <span className="rounded-pill bg-surface-warm px-2.5 py-1 text-[10px] uppercase tracking-wide text-ink-muted">
                  {m.tipe}
                </span>
              </div>
              <p className="text-[12px] text-ink-subtle">{m.deskripsi}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[13px] font-bold text-gold-deep tnum">
                +{m.reward}
              </span>
              <button
                type="button"
                disabled
                title="Klaim on-chain (gasless) aktif di M4"
                className="rounded-pill bg-cta px-3.5 py-1.5 text-[11px] font-semibold text-ink-invert opacity-40"
              >
                Klaim
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card space-y-2 p-5">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gold-deep" aria-hidden />
          <h3>Apa itu IDMX &amp; IDM Reborn?</h3>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          <strong>IDMX</strong> adalah poin reward dari aktivitas di AIDM. Kamu
          bisa menukarnya menjadi <strong>IDM Reborn</strong> — token utama
          ekosistem — lewat pool resmi di aplikasi. Kredit AI tetap dibeli
          dengan uang dan terpisah dari token.
        </p>
      </div>
    </div>
  );
}
