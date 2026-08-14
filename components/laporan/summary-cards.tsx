import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatRupiah, formatRupiahCompact } from "@/lib/transactions";
import type { Ringkasan } from "@/lib/laporan/types";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  kini: Ringkasan;
  sebelumnya?: Ringkasan | null;
}

function Delta({ kini, lalu }: { kini: number; lalu?: number }) {
  if (lalu === undefined || lalu === 0) return null;
  const rasio = (kini - lalu) / Math.abs(lalu);
  const naik = rasio > 0.005;
  const turun = rasio < -0.005;
  const Icon = naik ? TrendingUp : turun ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        "mt-1 inline-flex items-center gap-1 text-[12px] font-semibold",
        naik ? "text-success" : turun ? "text-danger" : "text-ink-subtle",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {naik ? "+" : ""}
      {Math.round(rasio * 100)}%
      <span className="font-normal text-ink-subtle">vs periode lalu</span>
    </span>
  );
}

/**
 * Kartu ringkasan periode (§7.3 #2). Sisa = laba KOTOR — istilah "laba bersih"
 * dilarang sebelum harga modal ada (Fase 2), karena angkanya akan salah dan
 * pengguna memakainya untuk keputusan nyata.
 */
export function SummaryCards({ kini, sebelumnya }: SummaryCardsProps) {
  const surplus = kini.sisa >= 0;

  return (
    <div className="space-y-3">
      {/* Sisa — angka pahlawan, serif besar */}
      <div className="card p-5">
        <p className="text-[13px] font-medium text-ink-subtle">
          Sisa (laba kotor)
        </p>
        <p
          className={cn(
            "num-display mt-1 text-[38px] leading-none",
            surplus ? "text-ink" : "text-danger",
          )}
        >
          {formatRupiah(kini.sisa)}
        </p>
        <Delta kini={kini.sisa} lalu={sebelumnya?.sisa} />
        <p className="mt-3 text-[12px] text-ink-muted">
          {kini.jmlTransaksi} transaksi · {kini.hariAktif} hari tercatat
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-[12px] font-medium text-ink-subtle">Pemasukan</p>
          <p className="num-display mt-1 text-[22px] leading-tight text-success">
            {formatRupiahCompact(kini.masuk)}
          </p>
          <Delta kini={kini.masuk} lalu={sebelumnya?.masuk} />
        </div>
        <div className="card p-4">
          <p className="text-[12px] font-medium text-ink-subtle">Pengeluaran</p>
          <p className="num-display mt-1 text-[22px] leading-tight text-ink">
            {formatRupiahCompact(kini.keluar)}
          </p>
          <Delta kini={kini.keluar} lalu={sebelumnya?.keluar} />
        </div>
      </div>
    </div>
  );
}
