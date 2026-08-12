"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, ListFilter } from "lucide-react";
import { SummaryCards } from "@/components/laporan/summary-cards";
import { CashflowChart } from "@/components/laporan/cashflow-chart";
import { CategoryBreakdown } from "@/components/laporan/category-breakdown";
import { VerifiedShare } from "@/components/laporan/verified-share";
import { SealCard } from "@/components/laporan/seal-card";
import { ValuationLocked } from "@/components/laporan/valuation-locked";
import {
  PERIOD_OPTIONS,
  bolehSegel,
  breakdownKategori,
  bulanTercatat,
  periodeSebelumnya,
  ringkas,
  seriesHarian,
  statusSegel,
  transaksiPeriode,
} from "@/lib/mock/finance";
import { cn } from "@/lib/utils";

/**
 * Tab Laporan (§7.3 / §13 layar 4).
 *
 * SEMENTARA: agregasi dihitung dari data mock di klien. Di produksi seluruh
 * perhitungan pindah ke SQL server-side (§7.3 ketentuan: "tidak mengirim
 * seluruh transaksi ke klien untuk dihitung di browser").
 */
export function LaporanView() {
  const [period, setPeriod] = useState("2026-08");

  const data = useMemo(() => {
    const txs = transaksiPeriode(period);
    const lalu = periodeSebelumnya(period);
    return {
      kini: ringkas(txs),
      sebelumnya: lalu ? ringkas(transaksiPeriode(lalu)) : null,
      series: seriesHarian(period),
      masuk: breakdownKategori(period, "masuk"),
      keluar: breakdownKategori(period, "keluar"),
      segel: statusSegel(period),
      boleh: bolehSegel(period),
    };
  }, [period]);

  const kosong = data.kini.jmlTransaksi === 0;

  return (
    <div className="space-y-section">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1>Laporan</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            Dihitung otomatis dari catatanmu. Gratis.
          </p>
        </div>
        <Link
          href="/riwayat"
          className="flex shrink-0 items-center gap-1.5 rounded-pill bg-surface-warm px-3.5 py-2 text-[12px] font-semibold text-ink"
        >
          <ListFilter className="h-3.5 w-3.5" aria-hidden />
          Riwayat
        </Link>
      </header>

      {/* Pemilih periode (§7.3 #1) */}
      <div
        role="tablist"
        aria-label="Periode laporan"
        className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1"
      >
        {PERIOD_OPTIONS.map((p) => {
          const aktif = p.value === period;
          return (
            <button
              key={p.value}
              role="tab"
              type="button"
              aria-selected={aktif}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "min-h-[44px] shrink-0 rounded-pill px-5 text-[14px] font-semibold transition-colors",
                aktif
                  ? "bg-cta text-ink-invert"
                  : "bg-surface-warm text-ink-muted",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {kosong ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <h2>Belum ada catatan di periode ini</h2>
          <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted">
            Begitu kamu mencatat, ringkasan dan grafiknya muncul di sini
            otomatis.
          </p>
          <Link href="/catat" className="btn-primary mt-2 max-w-[220px]">
            Mulai mencatat
          </Link>
        </div>
      ) : (
        <>
          <SummaryCards kini={data.kini} sebelumnya={data.sebelumnya} />
          <CashflowChart data={data.series} />
          <CategoryBreakdown
            judul="Pemasukan per kategori"
            baris={data.masuk}
            nada="masuk"
          />
          <CategoryBreakdown
            judul="Pengeluaran per kategori"
            baris={data.keluar}
            nada="keluar"
          />
          <VerifiedShare
            masuk={data.kini.masuk}
            masukTerverifikasi={data.kini.masukTerverifikasi}
          />
          <SealCard
            period={period}
            state={data.segel}
            boleh={data.boleh}
          />

          <button
            type="button"
            disabled
            title="Ekspor PDF aktif di M3"
            className="btn-primary disabled:opacity-40"
          >
            <Download className="h-4 w-4" aria-hidden />
            Unduh PDF
          </button>

          <ValuationLocked bulanTercatat={bulanTercatat()} />
        </>
      )}
    </div>
  );
}
