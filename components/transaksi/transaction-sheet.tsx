"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";
import {
  KATEGORI_MASUK,
  KATEGORI_KELUAR,
  PAYMENT_METHODS,
  type Jenis,
  type PaymentMethod,
  type Transaction,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

interface TransactionSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

/** Ambil "YYYY-MM-DD" untuk <input type="date"> dari ISO. */
function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Sheet detail & edit transaksi (§13 layar 5).
 * Naik dari bawah, satu kolom, target sentuh ≥ 44px (§12).
 */
export function TransactionSheet({
  transaction,
  onClose,
  onSave,
  onDelete,
}: TransactionSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [jenis, setJenis] = useState<Jenis>("masuk");
  const [amount, setAmount] = useState("");
  const [kategori, setKategori] = useState("lainnya");
  const [metode, setMetode] = useState<PaymentMethod>("tunai");
  const [tanggal, setTanggal] = useState("");
  const [catatan, setCatatan] = useState("");
  const [konfirmHapus, setKonfirmHapus] = useState(false);

  // Muat ulang field tiap kali transaksi berganti supaya sheet tidak
  // menampilkan sisa data entri sebelumnya.
  useEffect(() => {
    if (!transaction) return;
    setJenis(transaction.jenis);
    setAmount(String(transaction.amount));
    setKategori(transaction.kategori);
    setMetode(transaction.paymentMethod);
    setTanggal(toDateInput(transaction.occurredAt));
    setCatatan(transaction.catatan ?? "");
    setKonfirmHapus(false);
  }, [transaction]);

  // Escape menutup sheet (§1 escape-routes) + kunci scroll latar.
  useEffect(() => {
    if (!transaction) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [transaction, onClose]);

  if (!transaction) return null;

  const kategoriOptions = jenis === "masuk" ? KATEGORI_MASUK : KATEGORI_KELUAR;
  const nominal = Number(amount);
  const valid = Number.isFinite(nominal) && nominal > 0 && tanggal.length === 10;

  function simpan() {
    if (!valid || !transaction) return;
    onSave({
      ...transaction,
      jenis,
      amount: Math.round(nominal),
      kategori,
      paymentMethod: metode,
      // Hanya tanggal yang bisa diubah. Komponen jam ISO dibawa apa adanya:
      // tidak pernah ditampilkan di UI, tapi menyetelnya ke 00.00 bisa
      // menggeser tanggal WIB baris ini kalau dibaca dari zona lain.
      occurredAt: `${tanggal}T${transaction.occurredAt.slice(11)}`,
      catatan: catatan.trim() || null,
      parsedBy: "manual",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/50"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="pb-safe relative max-h-[92dvh] w-full animate-slide-up overflow-y-auto rounded-t-sheet bg-surface px-5 pt-5 outline-none md:max-w-md md:rounded-sheet md:pb-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-[20px]">
            Detail transaksi
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="tap grid place-items-center rounded-full bg-surface-warm"
          >
            <X className="h-5 w-5 text-ink-muted" aria-hidden />
          </button>
        </div>

        <div className="space-y-5">
          {/* Jenis */}
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-ink">Jenis</p>
            <div className="grid grid-cols-2 gap-2">
              {(["masuk", "keluar"] as Jenis[]).map((j) => (
                <button
                  key={j}
                  type="button"
                  aria-pressed={jenis === j}
                  onClick={() => {
                    setJenis(j);
                    setKategori("lainnya");
                  }}
                  className={cn(
                    "min-h-[48px] rounded-pill text-[14px] font-semibold transition-colors",
                    jenis === j
                      ? j === "masuk"
                        ? "bg-success text-ink-invert"
                        : "bg-danger text-ink-invert"
                      : "bg-surface-warm text-ink-muted",
                  )}
                >
                  {j === "masuk" ? "Masuk" : "Keluar"}
                </button>
              ))}
            </div>
          </div>

          {/* Nominal */}
          <div className="space-y-2">
            <label
              htmlFor="tx-amount"
              className="block text-[13px] font-semibold text-ink"
            >
              Nominal
            </label>
            <div className="flex items-center gap-2 rounded-card bg-surface-warm px-4 py-3">
              <span className="text-[15px] font-semibold text-ink-muted">
                Rp
              </span>
              <input
                id="tx-amount"
                type="number"
                inputMode="numeric"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="num-display min-w-0 flex-1 bg-transparent text-[22px] text-ink outline-none"
              />
            </div>
            {!valid && amount.length > 0 ? (
              <p role="alert" className="text-[12px] text-danger">
                Nominal harus lebih dari 0.
              </p>
            ) : null}
          </div>

          {/* Kategori */}
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-ink">Kategori</p>
            <div className="flex flex-wrap gap-2">
              {kategoriOptions.map((k) => (
                <button
                  key={k.slug}
                  type="button"
                  aria-pressed={kategori === k.slug}
                  onClick={() => setKategori(k.slug)}
                  className={cn(
                    "chip",
                    kategori === k.slug && "chip-active",
                  )}
                >
                  {k.nama}
                </button>
              ))}
            </div>
          </div>

          {/* Metode bayar */}
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-ink">Metode bayar</p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={metode === m.value}
                  onClick={() => setMetode(m.value)}
                  className={cn(
                    "min-h-[44px] rounded-pill px-2 text-[12px] font-semibold transition-colors",
                    metode === m.value
                      ? "bg-cta text-ink-invert"
                      : "bg-surface-warm text-ink-muted",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-ink-subtle">
              QRIS, transfer, dan e-wallet dihitung sebagai transaksi
              terverifikasi di laporan.
            </p>
          </div>

          {/* Tanggal */}
          <div className="space-y-2">
            <label
              htmlFor="tx-date"
              className="block text-[13px] font-semibold text-ink"
            >
              Tanggal
            </label>
            <input
              id="tx-date"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full rounded-card bg-surface-warm px-4 py-3 text-[15px] text-ink outline-none"
            />
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <label
              htmlFor="tx-note"
              className="block text-[13px] font-semibold text-ink"
            >
              Catatan
            </label>
            <input
              id="tx-note"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="mis. jual 3 nasi goreng"
              className="w-full rounded-card bg-surface-warm px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle"
            />
          </div>

          <button
            type="button"
            onClick={simpan}
            disabled={!valid}
            className="btn-primary"
          >
            Simpan perubahan
          </button>

          {/* Hapus — dipisahkan dari aksi utama (§9 destructive-nav-separation) */}
          {konfirmHapus ? (
            <div className="card-warm space-y-3 p-4">
              <p className="text-[13px] text-ink">
                Hapus transaksi ini? Progres misi terkait ikut dibatalkan.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(transaction.id);
                    onClose();
                  }}
                  className="min-h-[44px] flex-1 rounded-pill bg-danger text-[14px] font-semibold text-ink-invert"
                >
                  Ya, hapus
                </button>
                <button
                  type="button"
                  onClick={() => setKonfirmHapus(false)}
                  className="min-h-[44px] flex-1 rounded-pill bg-surface-warm text-[14px] font-semibold text-ink"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setKonfirmHapus(true)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-pill text-[14px] font-semibold text-danger"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Hapus transaksi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
