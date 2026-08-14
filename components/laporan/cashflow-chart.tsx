"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  formatRupiah,
  formatTanggalPanjangID,
  formatTanggalPendekID,
} from "@/lib/transactions";
import type { TitikHarian } from "@/lib/laporan/types";
import { cn } from "@/lib/utils";

interface CashflowChartProps {
  data: TitikHarian[];
}

/**
 * Grafik arus kas harian (§7.3 #3).
 *
 * Bentuknya DIVERGEN — masuk ke atas garis nol, keluar ke bawah — bukan dua
 * batang berdampingan. Alasannya bukan estetika: pasangan hijau/merah hanya
 * berjarak ΔE 4,8 pada penglihatan deutan, jadi warna saja tidak cukup
 * membedakan keduanya. Posisi relatif garis nol yang membawa identitas; warna
 * tinggal menguatkan. Sekaligus saldo bersih harian jadi terbaca sekilas.
 */
export function CashflowChart({ data }: CashflowChartProps) {
  const [aktif, setAktif] = useState<number | null>(null);
  const [tabelTerbuka, setTabelTerbuka] = useState(false);

  if (data.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-1 p-8 text-center">
        <p className="text-[14px] font-semibold text-ink">Belum ada data</p>
        <p className="text-[13px] text-ink-muted">
          Catat transaksi pertamamu untuk melihat arus kas.
        </p>
      </div>
    );
  }

  const puncak = Math.max(
    1,
    ...data.map((d) => Math.max(d.masuk, d.keluar)),
  );
  const titik = aktif !== null ? data[aktif] : null;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <h3>Arus kas harian</h3>
        {/* Legenda wajib untuk ≥2 seri; warna tidak pernah jadi penanda tunggal */}
        <div className="flex shrink-0 items-center gap-3 text-[11px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
            Masuk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" aria-hidden />
            Keluar
          </span>
        </div>
      </div>

      {/* Tooltip — satu baris, tidak menggeser layout saat kosong */}
      <p
        className="mt-3 min-h-[34px] text-[12px] leading-snug"
        role="status"
        aria-live="polite"
      >
        {titik ? (
          <>
            <span className="font-semibold text-ink">
              {formatTanggalPanjangID(titik.tanggal)}
            </span>
            <br />
            <span className="text-success">
              Masuk {formatRupiah(titik.masuk)}
            </span>
            <span className="text-ink-subtle"> · </span>
            <span className="text-danger">
              Keluar {formatRupiah(titik.keluar)}
            </span>
          </>
        ) : (
          <span className="text-ink-subtle">
            Ketuk batang untuk melihat rincian harinya.
          </span>
        )}
      </p>

      {/* Plot */}
      <div
        className="mt-2 flex h-[168px] items-stretch gap-[2px]"
        onMouseLeave={() => setAktif(null)}
      >
        {data.map((d, i) => {
          const tinggiMasuk = (d.masuk / puncak) * 100;
          const tinggiKeluar = (d.keluar / puncak) * 100;
          const sorot = aktif === i;
          return (
            <button
              key={d.tanggal}
              type="button"
              onMouseEnter={() => setAktif(i)}
              onFocus={() => setAktif(i)}
              onClick={() => setAktif(sorot ? null : i)}
              aria-label={`${formatTanggalPanjangID(d.tanggal)}: masuk ${formatRupiah(
                d.masuk,
              )}, keluar ${formatRupiah(d.keluar)}`}
              className="group flex flex-1 flex-col rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {/* Separuh atas: pemasukan, tumbuh dari garis nol ke atas */}
              <span className="flex flex-1 flex-col justify-end">
                <span
                  className={cn(
                    "w-full rounded-t-[4px] bg-success transition-opacity",
                    sorot ? "opacity-100" : "opacity-80",
                  )}
                  style={{ height: `${tinggiMasuk}%` }}
                  aria-hidden
                />
              </span>
              {/* Garis nol */}
              <span className="h-px w-full bg-line" aria-hidden />
              {/* Separuh bawah: pengeluaran, tumbuh ke bawah */}
              <span className="flex flex-1 flex-col justify-start">
                <span
                  className={cn(
                    "w-full rounded-b-[4px] bg-danger transition-opacity",
                    sorot ? "opacity-100" : "opacity-80",
                  )}
                  style={{ height: `${tinggiKeluar}%` }}
                  aria-hidden
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* Sumbu waktu — hanya ujung & tengah supaya tidak berdesakan di HP */}
      <div className="mt-2 flex justify-between text-[11px] text-ink-subtle">
        <span>{formatTanggalPendekID(data[0].tanggal)}</span>
        {data.length > 4 ? (
          <span>
            {formatTanggalPendekID(data[Math.floor(data.length / 2)].tanggal)}
          </span>
        ) : null}
        <span>{formatTanggalPendekID(data[data.length - 1].tanggal)}</span>
      </div>

      {/* Padanan tabel — grafik saja tidak ramah pembaca layar */}
      <div className="mt-4 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setTabelTerbuka((v) => !v)}
          aria-expanded={tabelTerbuka}
          className="flex w-full items-center justify-between text-[12px] font-semibold text-ink-muted"
        >
          Lihat sebagai tabel
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              tabelTerbuka && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {tabelTerbuka ? (
          <div className="mt-3 max-h-64 overflow-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-ink-subtle">
                  <th scope="col" className="py-1.5 text-left font-semibold">
                    Tanggal
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    Masuk
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold">
                    Keluar
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.tanggal} className="border-t border-line">
                    <td className="py-1.5 text-ink-muted">
                      {formatTanggalPendekID(d.tanggal)}
                    </td>
                    <td className="tnum py-1.5 text-right text-ink">
                      {formatRupiah(d.masuk)}
                    </td>
                    <td className="tnum py-1.5 text-right text-ink">
                      {formatRupiah(d.keluar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
