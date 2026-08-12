"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  ShieldCheck,
  CloudOff,
} from "lucide-react";
import {
  formatRupiah,
  isTerverifikasi,
  kategoriLabel,
  paymentLabel,
  type Transaction,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

interface EntryCardProps {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  /** Entri masih di antrean offline, belum tersinkron ke server. */
  antre?: boolean;
}

/**
 * Kartu konfirmasi entri (§7.2 prinsip #2). Entri SUDAH tersimpan saat kartu
 * ini muncul — kartu adalah laporan hasil baca, bukan formulir yang menunggu
 * disubmit. Karena itu aksinya "Ubah", bukan "Simpan".
 */
export function EntryCard({ tx, onEdit, antre }: EntryCardProps) {
  const masuk = tx.jenis === "masuk";
  const Icon = masuk ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            masuk ? "bg-success-tint" : "bg-danger-tint",
          )}
        >
          <Icon
            className={cn("h-5 w-5", masuk ? "text-success" : "text-danger")}
            aria-hidden
          />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">
              {masuk ? "Masuk" : "Keluar"}
            </span>
          </p>
          <p className="num-display text-[22px] leading-tight text-ink">
            {formatRupiah(tx.amount)}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-muted">
            <span>{kategoriLabel(tx.jenis, tx.kategori)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              {isTerverifikasi(tx.paymentMethod) ? (
                <ShieldCheck
                  className="h-3 w-3 text-gold-deep"
                  aria-label="Terverifikasi"
                />
              ) : null}
              {paymentLabel(tx.paymentMethod)}
            </span>
            {antre ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 text-ink-subtle">
                  <CloudOff className="h-3 w-3" aria-hidden />
                  menunggu sinkron
                </span>
              </>
            ) : null}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onEdit(tx)}
          className="tap flex shrink-0 items-center gap-1 rounded-pill bg-surface-warm px-3 text-[12px] font-semibold text-ink"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Ubah
        </button>
      </div>
    </div>
  );
}
