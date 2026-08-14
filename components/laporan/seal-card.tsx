"use client";

import { ShieldCheck, Lock, Info } from "lucide-react";
import { formatPeriodeID } from "@/lib/transactions";
import type { SealState } from "@/lib/laporan/types";

interface SealCardProps {
  period: string;
  state: SealState;
  boleh: boolean;
}

/**
 * Kartu Segel Laporan (§7.5).
 *
 * Bahasanya sengaja dijaga: segel membuktikan laporan TIDAK BERUBAH sejak
 * disegel — bukan bahwa angkanya benar. §7.5 melarang keras framing
 * "terverifikasi/teraudit blockchain" atas kebenaran angka, dan larangan itu
 * berlaku untuk teks UI, bukan cuma materi pemasaran.
 */
export function SealCard({ period, state, boleh }: SealCardProps) {
  const tersegel = state.status === "tersegel";

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-tint">
            <ShieldCheck className="h-5 w-5 text-gold-deep" aria-hidden />
          </span>
          <h3>Segel laporan</h3>
        </div>
        <span
          className={
            tersegel
              ? "shrink-0 rounded-pill bg-gold-tint px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-deep"
              : "shrink-0 rounded-pill bg-surface-warm px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted"
          }
        >
          {tersegel ? "Tersegel" : "Belum tersegel"}
        </span>
      </div>

      <p className="text-[13px] leading-relaxed text-ink-muted">
        Menyegel menulis <strong>sidik jari</strong> laporan {formatPeriodeID(period)} ke
        opBNB. Angka keuanganmu tetap privat — yang naik ke blockchain hanya
        kode acak sepanjang 64 huruf, bukan nominalnya.
      </p>

      {tersegel && state.hash ? (
        <div className="card-warm space-y-1 p-3">
          <p className="text-[11px] text-ink-subtle">Hash laporan</p>
          <p className="tnum break-all text-[12px] text-ink">{state.hash}</p>
        </div>
      ) : null}

      <button
        type="button"
        disabled
        title="Segel on-chain aktif di M4"
        className="btn-primary disabled:opacity-40"
      >
        <Lock className="h-4 w-4" aria-hidden />
        {boleh ? `Segel laporan ${formatPeriodeID(period)}` : "Segel laporan"}
      </button>

      {!boleh ? (
        <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-subtle">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Periode yang masih berjalan belum bisa disegel — tunggu bulannya
          selesai.
        </p>
      ) : (
        <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-subtle">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Segel membuktikan laporan tidak berubah sejak tanggal disegel. Ini
          bukan audit dan bukan penilaian kelayakan kredit.
        </p>
      )}
    </div>
  );
}
