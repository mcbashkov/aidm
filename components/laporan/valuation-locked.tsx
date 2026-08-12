import { Lock } from "lucide-react";
import { VALUASI_BUTUH_BULAN } from "@/lib/mock/finance";

interface ValuationLockedProps {
  bulanTercatat: number;
}

/**
 * Kartu terkunci valuasi usaha (§7.9). Fiturnya Fase 3 — kartu ini ada sejak
 * MVP supaya keterbatasan data berubah jadi alasan untuk terus mencatat.
 */
export function ValuationLocked({ bulanTercatat }: ValuationLockedProps) {
  const progres = Math.min(1, bulanTercatat / VALUASI_BUTUH_BULAN);
  const sisa = Math.max(0, VALUASI_BUTUH_BULAN - bulanTercatat);

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-warm">
          <Lock className="h-5 w-5 text-ink-subtle" aria-hidden />
        </span>
        <div>
          <h3 className="text-ink-muted">Valuasi usaha</h3>
          <p className="text-[12px] text-ink-subtle">
            Terbuka setelah {VALUASI_BUTUH_BULAN} bulan catatan
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="h-2 overflow-hidden rounded-pill bg-surface-warm">
          <div
            className="h-full rounded-pill bg-gold-gradient"
            style={{ width: `${Math.round(progres * 100)}%` }}
          />
        </div>
        <p className="tnum text-[12px] text-ink-muted">
          {bulanTercatat} dari {VALUASI_BUTUH_BULAN} bulan
          {sisa > 0 ? ` · ${sisa} bulan lagi` : " · siap dibuka"}
        </p>
      </div>
    </div>
  );
}
