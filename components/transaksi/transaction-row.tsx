"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Mic,
} from "lucide-react";
import {
  formatJamID,
  formatRupiahSigned,
  formatTanggalPendekID,
  isTerverifikasi,
  kategoriLabel,
  paymentLabel,
  type Transaction,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

interface TransactionRowProps {
  tx: Transaction;
  onClick?: (tx: Transaction) => void;
  /** Tampilkan tanggal (daftar lintas hari) atau jam saja (dalam satu hari). */
  showDate?: boolean;
}

/** Satu baris transaksi — dipakai di Beranda, Laporan, dan Riwayat. */
export function TransactionRow({
  tx,
  onClick,
  showDate = true,
}: TransactionRowProps) {
  const masuk = tx.jenis === "masuk";
  const Icon = masuk ? ArrowDownLeft : ArrowUpRight;

  return (
    <button
      type="button"
      onClick={() => onClick?.(tx)}
      disabled={!onClick}
      className="flex w-full items-center gap-3 p-4 text-left transition-colors disabled:cursor-default"
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
          masuk ? "bg-success-tint" : "bg-danger-tint",
        )}
      >
        <Icon
          className={cn("h-5 w-5", masuk ? "text-success" : "text-danger")}
          aria-hidden
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold text-ink">
            {tx.catatan || kategoriLabel(tx.jenis, tx.kategori)}
          </span>
          {tx.source === "voice" ? (
            <Mic
              className="h-3 w-3 shrink-0 text-ink-subtle"
              aria-label="Dicatat lewat suara"
            />
          ) : null}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-subtle">
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
          <span aria-hidden>·</span>
          <span>
            {showDate
              ? formatTanggalPendekID(tx.occurredAt)
              : formatJamID(tx.occurredAt)}
          </span>
        </span>
      </span>

      <span
        className={cn(
          "tnum shrink-0 text-[14px] font-bold",
          masuk ? "text-success" : "text-ink",
        )}
      >
        {formatRupiahSigned(tx.amount, tx.jenis)}
      </span>
    </button>
  );
}
