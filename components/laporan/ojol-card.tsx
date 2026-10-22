"use client";

import { Bike } from "lucide-react";
import { formatRupiah } from "@/lib/transactions";
import type { RekapOjol } from "@/lib/laporan/ojol";

/**
 * Rekap peran ojol di Laporan (PERINTAH-AGEN-PREMIUM §Batch 10): pemasukan
 * per platform (kotor), pengeluaran kendaraan, dan "bersih harian rata-rata"
 * = (pemasukan − pengeluaran usaha) ÷ hari aktif. Hanya dirender bila server
 * mengirim `ojol` (earner_type ojol). Tanpa kata "laba".
 */
export function OjolCard({ data }: { data: RekapOjol }) {
  const kosong = data.platform.length === 0 && data.kendaraan.length === 0;
  return (
    <section className="card space-y-4 p-5" aria-label="Rekap pendapatan ojol">
      <div className="flex items-center gap-2">
        <Bike className="h-5 w-5 text-gold-deep" aria-hidden />
        <h3>Pendapatan per platform</h3>
      </div>

      {kosong ? (
        <p className="text-[13px] text-ink-muted">
          Belum ada catatan ojek di periode ini. Sebut platformnya saat mencatat
          (&quot;narik gojek 150rb&quot;) supaya rekapnya terisi.
        </p>
      ) : (
        <>
          <div className="rounded-2xl bg-surface-warm px-4 py-3">
            <p className="text-[12px] text-ink-muted">Bersih harian rata-rata</p>
            <p className="tnum text-[20px] font-semibold text-ink">
              {data.bersihHarianRata === null ? "—" : formatRupiah(data.bersihHarianRata)}
            </p>
            <p className="text-[11.5px] text-ink-subtle">
              (pemasukan − pengeluaran usaha) ÷ {data.hariAktif} hari aktif
            </p>
          </div>

          {data.platform.length > 0 ? (
            <ul className="space-y-2">
              {data.platform.map((p) => (
                <li key={p.platform ?? "tanpa"} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="text-ink">
                      {p.label} <span className="text-ink-subtle">· {p.jml} catatan</span>
                    </span>
                    <span className="tnum font-semibold text-ink">{formatRupiah(p.total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-pill bg-surface-warm">
                    <div className="h-full rounded-pill bg-gold-gradient" style={{ width: `${Math.round(p.persen * 100)}%` }} />
                  </div>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3 border-t border-line pt-2 text-[13px]">
                <span className="text-ink-muted">Total pemasukan ojek (kotor)</span>
                <span className="tnum font-semibold text-ink">{formatRupiah(data.totalOjek)}</span>
              </li>
            </ul>
          ) : null}

          {data.kendaraan.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold text-ink-muted">Pengeluaran kendaraan</p>
              <ul className="space-y-1">
                {data.kendaraan.map((k) => (
                  <li key={k.sub} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="text-ink">{k.label}</span>
                    <span className="tnum text-ink">{formatRupiah(k.total)}</span>
                  </li>
                ))}
                <li className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5 text-[13px]">
                  <span className="text-ink-muted">Total kendaraan</span>
                  <span className="tnum font-semibold text-ink">{formatRupiah(data.totalKendaraan)}</span>
                </li>
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
