"use client";

import Link from "next/link";
import {
  MessageSquarePlus,
  Target,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { TransactionRow } from "@/components/transaksi/transaction-row";
import { useMe } from "@/components/providers/me-provider";
import { DEFAULT_MISSIONS } from "@/lib/missions";
import {
  MOCK_ANCHOR,
  ringkasHariIni,
  transaksiTerakhir,
} from "@/lib/mock/finance";
import {
  formatRupiah,
  formatRupiahCompact,
  formatTanggalPanjangID,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

/**
 * Beranda v3.0 (§13 layar 2). Maksimal 4 blok (aturan hierarki v2.0):
 * kartu hari ini · tombol Catat · misi hari ini · transaksi terakhir.
 */
export default function BerandaPage() {
  const me = useMe();

  const hariIni = ringkasHariIni();
  const terakhir = transaksiTerakhir(3);
  const surplus = hariIni.sisa >= 0;

  // Sapaan pakai nama usaha bila sudah diisi saat onboarding; kalau belum,
  // tetap "Halo 👋" tanpa koma menggantung.
  const nama = me?.user?.nama_usaha?.trim();

  return (
    <div className="space-y-section">
      <header>
        <p className="text-[13px] font-medium text-ink-subtle">
          {formatTanggalPanjangID(MOCK_ANCHOR)}
        </p>
        <h1 className="mt-1">{nama ? `Halo, ${nama} 👋` : "Halo 👋"}</h1>
      </header>

      {/* Blok 1 — kartu hari ini */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-medium text-ink-subtle">
            Sisa hari ini
          </p>
          <Link
            href="/laporan"
            className="shrink-0 text-[12px] font-semibold text-gold-deep"
          >
            Lihat laporan
          </Link>
        </div>
        <p
          className={cn(
            "num-display mt-1 text-[38px] leading-none",
            surplus ? "text-ink" : "text-danger",
          )}
        >
          {formatRupiah(hariIni.sisa)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-surface-warm p-2.5 sm:gap-2.5 sm:p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-success-tint sm:h-9 sm:w-9">
              <ArrowDownLeft className="h-4 w-4 text-success sm:h-5 sm:w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-ink-subtle">Masuk</p>
              <p className="tnum truncate whitespace-nowrap text-[clamp(0.625rem,3.4vw,0.9375rem)] font-bold text-ink">
                {formatRupiahCompact(hariIni.masuk)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-surface-warm p-2.5 sm:gap-2.5 sm:p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-danger-tint sm:h-9 sm:w-9">
              <ArrowUpRight className="h-4 w-4 text-danger sm:h-5 sm:w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-ink-subtle">Keluar</p>
              <p className="tnum truncate whitespace-nowrap text-[clamp(0.625rem,3.4vw,0.9375rem)] font-bold text-ink">
                {formatRupiahCompact(hariIni.keluar)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Blok 2 — aksi utama */}
      <Link href="/catat" className="btn-primary">
        <MessageSquarePlus className="h-5 w-5" aria-hidden />
        Catat transaksi
      </Link>

      {/* Blok 3 — misi hari ini */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2>Misi hari ini</h2>
          <Link href="/misi" className="text-[13px] font-medium text-gold-deep">
            Lihat semua
          </Link>
        </div>
        <div className="space-y-2">
          {DEFAULT_MISSIONS.filter((m) => m.tipe === "daily")
            .slice(0, 2)
            .map((m) => (
              <div key={m.code} className="card flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-tint">
                  <Target className="h-5 w-5 text-gold-deep" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-ink">
                    {m.judul}
                  </p>
                  <p className="text-[12px] text-ink-subtle">{m.deskripsi}</p>
                </div>
                <span className="tnum rounded-pill bg-gold-tint px-2.5 py-1 text-[12px] font-bold text-gold-deep">
                  +{m.reward}
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* Blok 4 — transaksi terakhir */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2>Transaksi terakhir</h2>
          <Link
            href="/riwayat"
            className="flex items-center gap-0.5 text-[13px] font-medium text-gold-deep"
          >
            Riwayat
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {terakhir.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-tint">
              <Sparkles className="h-5 w-5 text-gold-deep" aria-hidden />
            </span>
            <p className="text-[14px] font-semibold text-ink">
              Belum ada transaksi
            </p>
            <p className="max-w-xs text-[13px] leading-relaxed text-ink-muted">
              Ceritakan penjualan atau pengeluaran pertamamu di tab Catat.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {terakhir.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
