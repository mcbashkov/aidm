import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatRupiah, formatRupiahCompact } from "@/lib/transactions";
import type { Ringkasan } from "@/lib/laporan/types";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  kini: Ringkasan;
  sebelumnya?: Ringkasan | null;
}

/**
 * Hari tercatat minimum sebelum persentase boleh ditampilkan.
 *
 * Terlihat di produksi: "+1057% vs periode lalu" pada 7 hari data. Angka itu
 * benar secara aritmetika dan tidak berarti apa-apa secara akuntansi — ia
 * hanya mengukur bahwa periode sebelumnya nyaris kosong. Yang dibaca pengguna
 * bukan "datamu masih sedikit", melainkan "usahaku tumbuh sepuluh kali lipat",
 * dan aplikasi pembukuan yang memasang angka semacam itu berhenti terlihat
 * serius pada detik pertama.
 *
 * Di bawah ambang ini, SELISIH RUPIAH yang ditampilkan: ia tetap jujur berapa
 * pun sedikitnya data, karena tidak dibagi apa pun.
 */
const HARI_MIN_PERSEN = 14;

function Delta({
  kini,
  lalu,
  hariAktif,
}: {
  kini: number;
  lalu?: number;
  hariAktif: number;
}) {
  if (lalu === undefined) return null;

  const selisih = kini - lalu;
  const naik = selisih > 0;
  const turun = selisih < 0;
  const Icon = naik ? TrendingUp : turun ? TrendingDown : Minus;

  // Persentase hanya bila datanya cukup panjang DAN pembaginya bukan nol.
  const bolehPersen = hariAktif >= HARI_MIN_PERSEN && lalu !== 0;
  const rasio = bolehPersen ? selisih / Math.abs(lalu) : 0;

  return (
    <span
      className={cn(
        "mt-1 inline-flex items-center gap-1 text-[12px] font-semibold",
        naik ? "text-success" : turun ? "text-danger" : "text-ink-subtle",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {bolehPersen ? (
        <>
          {naik ? "+" : ""}
          {Math.round(rasio * 100)}%
        </>
      ) : (
        <>
          {naik ? "+" : turun ? "−" : ""}
          {formatRupiahCompact(Math.abs(selisih))}
        </>
      )}
      <span className="font-normal text-ink-subtle">vs periode lalu</span>
    </span>
  );
}

/**
 * Kartu ringkasan periode (§7.3 #2).
 *
 * "Sisa uang", BUKAN "laba" dalam bentuk apa pun. Angkanya adalah arus kas —
 * pemasukan dikurangi SELURUH pengeluaran, termasuk prive dan pembelian alat.
 * Laba kotor adalah pemasukan dikurangi harga pokok penjualan saja, dan HPP
 * belum ada di aplikasi ini. Menyebutnya "laba kotor" memberi nama akuntansi
 * yang salah kepada angka yang benar — dan pengguna memakainya untuk keputusan
 * nyata, termasuk membawanya ke pihak ketiga.
 *
 * Rumusnya TIDAK berubah. Yang berubah hanya namanya.
 */
export function SummaryCards({ kini, sebelumnya }: SummaryCardsProps) {
  const surplus = kini.sisa >= 0;

  return (
    <div className="space-y-3">
      {/* Sisa — angka pahlawan, serif besar */}
      <div className="card p-5">
        <p className="text-[13px] font-medium text-ink-subtle">Sisa uang</p>
        <p
          className={cn(
            "num-display mt-1 text-[38px] leading-none",
            surplus ? "text-ink" : "text-danger",
          )}
        >
          {formatRupiah(kini.sisa)}
        </p>
        <Delta kini={kini.sisa} lalu={sebelumnya?.sisa} hariAktif={kini.hariAktif} />
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
          <Delta
            kini={kini.masuk}
            lalu={sebelumnya?.masuk}
            hariAktif={kini.hariAktif}
          />
        </div>
        <div className="card p-4">
          <p className="text-[12px] font-medium text-ink-subtle">Pengeluaran</p>
          <p className="num-display mt-1 text-[22px] leading-tight text-ink">
            {formatRupiahCompact(kini.keluar)}
          </p>
          <Delta
            kini={kini.keluar}
            lalu={sebelumnya?.keluar}
            hariAktif={kini.hariAktif}
          />
        </div>
      </div>
    </div>
  );
}
