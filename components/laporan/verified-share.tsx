import { ShieldCheck, Wallet } from "lucide-react";
import { formatPersen, formatRupiah } from "@/lib/transactions";

interface VerifiedShareProps {
  masuk: number;
  masukTerverifikasi: number;
}

/**
 * Porsi transaksi terverifikasi (§7.3 #5).
 *
 * Meter bertumpuk, bukan donut: satu nilai yang dibelah dua paling terbaca
 * sebagai garis, dan label persen di HP tidak muat di dalam arc. Persentase
 * ditulis sebagai teks bertoken ink — emas dipakai untuk marka, tidak untuk
 * angka, karena kontrasnya di bawah 3:1 terhadap kartu putih.
 */
export function VerifiedShare({
  masuk,
  masukTerverifikasi,
}: VerifiedShareProps) {
  const tunai = Math.max(0, masuk - masukTerverifikasi);
  const rasio = masuk > 0 ? masukTerverifikasi / masuk : 0;
  const persenVerified = Math.round(rasio * 100);

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3>Porsi terverifikasi</h3>
        <span className="num-display shrink-0 text-[26px] leading-none text-ink">
          {formatPersen(rasio)}
        </span>
      </div>

      {masuk === 0 ? (
        <p className="text-[13px] text-ink-muted">
          Belum ada pemasukan di periode ini.
        </p>
      ) : (
        <>
          {/* Meter: dua segmen dipisah jarak 2px supaya batasnya terbaca
              tanpa mengandalkan perbedaan warna saja. */}
          <div
            className="flex h-3 gap-[2px] overflow-hidden rounded-pill bg-surface-warm"
            role="img"
            aria-label={`${persenVerified} persen pemasukan lewat QRIS, transfer, atau e-wallet`}
          >
            <span
              className="rounded-pill bg-gold-deep"
              style={{ width: `${persenVerified}%` }}
            />
            <span
              className="rounded-pill bg-surface-warm"
              style={{ width: `${100 - persenVerified}%` }}
            />
          </div>

          <dl className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep"
                aria-hidden
              />
              <div>
                <dt className="text-[12px] text-ink-subtle">
                  QRIS · transfer · e-wallet
                </dt>
                <dd className="tnum text-[14px] font-semibold text-ink">
                  {formatRupiah(masukTerverifikasi)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Wallet
                className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle"
                aria-hidden
              />
              <div>
                <dt className="text-[12px] text-ink-subtle">Tunai</dt>
                <dd className="tnum text-[14px] font-semibold text-ink">
                  {formatRupiah(tunai)}
                </dd>
              </div>
            </div>
          </dl>

          <p className="text-[12px] leading-relaxed text-ink-muted">
            Transaksi lewat QRIS atau transfer meninggalkan jejak di pihak
            ketiga, sehingga lebih dipercaya lembaga keuangan.
          </p>
        </>
      )}
    </div>
  );
}
