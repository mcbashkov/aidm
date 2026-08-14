"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, ListFilter, WifiOff } from "lucide-react";
import { SummaryCards } from "@/components/laporan/summary-cards";
import { CashflowChart } from "@/components/laporan/cashflow-chart";
import { CategoryBreakdown } from "@/components/laporan/category-breakdown";
import { VerifiedShare } from "@/components/laporan/verified-share";
import { SealCard } from "@/components/laporan/seal-card";
import { ValuationLocked } from "@/components/laporan/valuation-locked";
import { PERIOD_OPTIONS, laporanDemo } from "@/lib/mock/finance";
import { periodeSekarang } from "@/lib/catat/client";
import { ambilLaporan, urlPdfLaporan } from "@/lib/laporan/client";
import type { LaporanResponse } from "@/lib/laporan/types";
import { cn } from "@/lib/utils";

/**
 * Tab Laporan (§7.3 / §13 layar 4).
 *
 * Seluruh agregasi dihitung server (`GET /api/laporan`) — layar ini tidak
 * pernah menjumlah transaksi sendiri, sesuai ketentuan §7.3 "tidak mengirim
 * seluruh transaksi ke klien untuk dihitung di browser".
 *
 * Tiga keadaan dibedakan tegas, sama seperti Riwayat:
 *   online — angka nyata dari server;
 *   demo   — server memang belum dikonfigurasi (401/501) → dataset contoh;
 *   gagal  — jaringan/server bermasalah → katakan apa adanya. Menampilkan
 *            data contoh di sini akan membuat pemilik usaha membaca omzet
 *            fiktif sebagai omzetnya sendiri.
 */
export function LaporanView() {
  const [period, setPeriod] = useState(() => periodeSekarang()[0].value);
  const [data, setData] = useState<LaporanResponse | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [demo, setDemo] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  // Penghitung muat-ulang; menyetel `period` ke nilai yang sama tidak memicu
  // efek apa pun karena React membandingkan state dengan Object.is.
  const [percobaan, setPercobaan] = useState(0);

  const reqSeq = useRef(0);

  useEffect(() => {
    const seq = ++reqSeq.current;
    setMemuat(true);
    setGalat(null);
    void ambilLaporan(period).then((res) => {
      if (seq !== reqSeq.current) return; // respons kedaluwarsa
      if (res.ok) {
        setDemo(false);
        setData(res.data);
      } else if (res.demo) {
        setDemo(true);
        setData(laporanDemo(period));
      } else {
        setData(null);
        setGalat(
          res.offline
            ? "Kamu sedang offline. Laporan butuh koneksi karena dihitung di server."
            : "Gagal memuat laporan. Coba lagi sebentar lagi.",
        );
      }
      setMemuat(false);
    });
  }, [period, percobaan]);

  const periodOptions = demo ? PERIOD_OPTIONS : periodeSekarang();
  const kosong = !!data && data.kini.jmlTransaksi === 0;

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
        {periodOptions.map((p) => {
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

      {memuat && !data ? (
        <div className="space-y-3">
          <div className="skeleton h-32 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
          <div className="skeleton h-48 w-full" />
        </div>
      ) : galat ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <WifiOff className="h-8 w-8 text-ink-subtle" aria-hidden />
          <h2>Laporan belum bisa ditampilkan</h2>
          <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted">
            {galat}
          </p>
          <button
            type="button"
            onClick={() => setPercobaan((n) => n + 1)}
            className="btn-primary mt-2 max-w-[220px]"
          >
            Coba lagi
          </button>
        </div>
      ) : kosong ? (
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
      ) : data ? (
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
          <SealCard period={period} state={data.segel} boleh={data.bolehSegel} />

          {/* Unduhan dilayani server (§11 GET /api/laporan/pdf) — di mode demo
              tidak ada apa pun untuk diunduh karena datanya bukan milik siapa
              pun. */}
          <a
            href={demo ? undefined : urlPdfLaporan(period)}
            aria-disabled={demo}
            title={demo ? "Masuk dulu untuk mengunduh laporanmu" : undefined}
            className={cn("btn-primary", demo && "pointer-events-none opacity-40")}
          >
            <Download className="h-4 w-4" aria-hidden />
            Unduh PDF
          </a>

          <ValuationLocked bulanTercatat={data.bulanTercatat} />
        </>
      ) : null}
    </div>
  );
}
