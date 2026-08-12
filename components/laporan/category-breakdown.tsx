import { formatPersen, formatRupiah } from "@/lib/transactions";
import type { BarisKategori } from "@/lib/mock/finance";

interface CategoryBreakdownProps {
  judul: string;
  baris: BarisKategori[];
  /** Warna batang mengikuti arah uang; identitas tetap dibawa label teks. */
  nada: "masuk" | "keluar";
}

/** Rincian kategori 5 teratas (§7.3 #4). */
export function CategoryBreakdown({
  judul,
  baris,
  nada,
}: CategoryBreakdownProps) {
  return (
    <div className="card space-y-3 p-5">
      <h3>{judul}</h3>

      {baris.length === 0 ? (
        <p className="text-[13px] text-ink-muted">
          Belum ada data di periode ini.
        </p>
      ) : (
        <ul className="space-y-3">
          {baris.map((b) => (
            <li key={b.slug} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-medium text-ink">
                  {b.nama}
                </span>
                <span className="tnum shrink-0 text-[14px] font-semibold text-ink">
                  {formatRupiah(b.total)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-warm">
                  <div
                    className={
                      nada === "masuk"
                        ? "h-full rounded-pill bg-success"
                        : "h-full rounded-pill bg-danger"
                    }
                    style={{ width: `${Math.round(b.persen * 100)}%` }}
                  />
                </div>
                <span className="tnum w-9 shrink-0 text-right text-[12px] text-ink-subtle">
                  {formatPersen(b.persen)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
