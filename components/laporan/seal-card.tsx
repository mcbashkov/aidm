"use client";

import { ShieldCheck, Lock, Info, ExternalLink, LoaderCircle } from "lucide-react";
import { formatPeriodeID } from "@/lib/transactions";
import type { SealState } from "@/lib/laporan/types";

interface SealCardProps {
  period: string;
  state: SealState;
  /** Periode boleh disegel (sudah lewat sepenuhnya, §7.5). */
  boleh: boolean;
  /** Server siap menyegel (kontrak + relayer terpasang). */
  siap: boolean;
  /** Sedang mengirim segel — tombol terkunci, teks berubah. */
  menyegel: boolean;
  galat: string | null;
  onSegel: () => void;
}

/**
 * Kartu Segel Laporan (§7.5).
 *
 * Bahasanya sengaja dijaga: segel membuktikan laporan TIDAK BERUBAH sejak
 * disegel — bukan bahwa angkanya benar. §7.5 melarang keras framing
 * "terverifikasi/teraudit blockchain" atas kebenaran angka, dan larangan itu
 * berlaku untuk teks UI, bukan cuma materi pemasaran.
 */
export function SealCard({
  period,
  state,
  boleh,
  siap,
  menyegel,
  galat,
  onSegel,
}: SealCardProps) {
  const tersegel = state.status === "tersegel";
  const pending = state.status === "pending";
  const bisaKlik = boleh && siap && !menyegel && !pending;

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
          {tersegel ? "Tersegel" : pending ? "Menunggu jaringan" : "Belum tersegel"}
        </span>
      </div>

      <p className="text-[13px] leading-relaxed text-ink-muted">
        Menyegel menulis <strong>sidik jari</strong> laporan {formatPeriodeID(period)} ke
        opBNB. Angka keuanganmu tetap privat — yang naik ke blockchain hanya
        kode acak sepanjang 64 huruf, bukan nominalnya.
      </p>

      {(tersegel || pending) && state.hash ? (
        <div className="card-warm space-y-1 p-3">
          <p className="text-[11px] text-ink-subtle">Hash laporan</p>
          <p className="tnum break-all text-[12px] text-ink">{state.hash}</p>
          {state.explorerTx ? (
            <a
              href={state.explorerTx}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 pt-1 text-[12px] font-semibold text-gold-deep"
            >
              Lihat transaksi di opBNBScan
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : null}
        </div>
      ) : null}

      {galat ? (
        <p role="alert" className="text-[13px] text-danger">
          {galat}
        </p>
      ) : null}

      {tersegel ? (
        // Segel ulang diperbolehkan (§7.5 — mis. setelah koreksi entri);
        // riwayat versi lama tetap abadi di event on-chain.
        <button
          type="button"
          onClick={onSegel}
          disabled={!bisaKlik}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill bg-surface-warm text-[14px] font-semibold text-ink disabled:opacity-40"
        >
          {menyegel ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Lock className="h-4 w-4" aria-hidden />
          )}
          {menyegel ? "Menyegel ulang…" : "Segel ulang (setelah koreksi)"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onSegel}
          disabled={!bisaKlik}
          title={
            !boleh
              ? "Periode berjalan belum bisa disegel"
              : !siap
                ? "Segel on-chain belum aktif di server ini"
                : undefined
          }
          className="btn-primary disabled:opacity-40"
        >
          {menyegel || pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Lock className="h-4 w-4" aria-hidden />
          )}
          {menyegel
            ? "Menyegel…"
            : pending
              ? "Menunggu konfirmasi jaringan…"
              : boleh
                ? `Segel laporan ${formatPeriodeID(period)}`
                : "Segel laporan"}
        </button>
      )}

      {!boleh ? (
        <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-subtle">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Periode yang masih berjalan belum bisa disegel — tunggu bulannya
          selesai.
        </p>
      ) : !siap && !tersegel ? (
        <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-ink-subtle">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Segel on-chain belum aktif di server ini — fiturnya menyusul, angka
          laporanmu tidak terpengaruh.
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
