"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Download, X } from "lucide-react";
import { TransactionRow } from "@/components/transaksi/transaction-row";
import { TransactionSheet } from "@/components/transaksi/transaction-sheet";
import { getTransactions, PERIOD_OPTIONS } from "@/lib/mock/finance";
import {
  daftarTransaksi,
  ubahTransaksi,
  hapusTransaksi,
  periodeSekarang,
} from "@/lib/catat/client";
import {
  KATEGORI_KELUAR,
  KATEGORI_MASUK,
  formatRupiah,
  formatTanggalPanjangID,
  kategoriLabel,
  paymentLabel,
  type Jenis,
  type Transaction,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

type FilterJenis = "semua" | Jenis;

const PAGE_SIZE = 50;

/** Unduh CSV di sisi klien — tanpa server, tanpa data keluar dari perangkat. */
function unduhCsv(rows: Transaction[]) {
  const header = [
    "tanggal", "jenis", "nominal", "kategori", "metode", "catatan",
  ];
  const body = rows.map((t) => [
    t.occurredAt.slice(0, 10),
    t.jenis,
    String(t.amount),
    kategoriLabel(t.jenis, t.kategori),
    paymentLabel(t.paymentMethod),
    // Tanda kutip di dalam sel di-escape supaya kolom tidak bergeser.
    `"${(t.catatan ?? "").replace(/"/g, '""')}"`,
  ]);
  const csv = [header, ...body].map((r) => r.join(",")).join("\n");
  const url = URL.createObjectURL(
    new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "transaksi-aidm.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Riwayat transaksi (§13 layar 6 / §7.7) — data nyata dari GET /api/transaksi
 * (filter & paginasi server-side, §11). Saat server belum dikonfigurasi
 * (401/501) jatuh ke dataset mock supaya demo tetap hidup.
 */
export function RiwayatView() {
  const [period, setPeriod] = useState("semua");
  const [jenis, setJenis] = useState<FilterJenis>("semua");
  const [kategori, setKategori] = useState("semua");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [editing, setEditing] = useState<Transaction | null>(null);

  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [memuat, setMemuat] = useState(true);
  const [demo, setDemo] = useState(false);

  // Perubahan lokal di mode demo (server tidak menyimpan apa-apa).
  const [dihapus, setDihapus] = useState<string[]>([]);
  const [diubah, setDiubah] = useState<Record<string, Transaction>>({});

  const reqSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const muat = useCallback(
    async (halaman: number, tambah: boolean) => {
      const seq = ++reqSeq.current;
      setMemuat(true);
      const res = await daftarTransaksi({
        period,
        jenis,
        kategori,
        q: qDebounced,
        page: halaman,
        pageSize: PAGE_SIZE,
      });
      if (seq !== reqSeq.current) return; // respons kedaluwarsa
      if (res.ok) {
        setDemo(false);
        setItems((prev) => (tambah ? [...prev, ...res.data.items] : res.data.items));
        setTotal(res.data.total);
        setPage(halaman);
      } else if (res.demo) {
        // HANYA saat server belum dikonfigurasi (401/501) → dataset mock.
        // Gagal jaringan TIDAK boleh menampilkan data palsu seolah milik
        // user — biarkan daftar apa adanya (kosong/stale).
        setDemo(true);
      }
      setMemuat(false);
    },
    [period, jenis, kategori, qDebounced],
  );

  useEffect(() => {
    void muat(0, false);
  }, [muat]);

  /* ── Mode demo: dataset mock + filter klien (perilaku lama) ────────────── */
  const ANCHOR_MS = useMemo(
    () => new Date("2026-08-12T00:00:00+07:00").getTime(),
    [],
  );
  const hasilDemo = useMemo(() => {
    if (!demo) return [];
    const cari = qDebounced.toLowerCase();
    return getTransactions()
      .filter((t) => !dihapus.includes(t.id))
      .map((t) => diubah[t.id] ?? t)
      .filter((t) => t.status !== "deleted")
      .filter((t) => {
        if (period === "semua") return true;
        if (period === "30d")
          return new Date(t.occurredAt).getTime() >= ANCHOR_MS - 30 * 86_400_000;
        return t.occurredAt.slice(0, 7) === period;
      })
      .filter((t) => (jenis === "semua" ? true : t.jenis === jenis))
      .filter((t) => (kategori === "semua" ? true : t.kategori === kategori))
      .filter((t) =>
        cari
          ? (t.catatan ?? "").toLowerCase().includes(cari) ||
            kategoriLabel(t.jenis, t.kategori).toLowerCase().includes(cari)
          : true,
      );
  }, [demo, period, jenis, kategori, qDebounced, dihapus, diubah, ANCHOR_MS]);

  const hasil = demo ? hasilDemo : items;
  const adaLagi = !demo && items.length < total;

  // Kelompokkan per hari supaya daftar panjang tetap punya jangkar waktu.
  const perHari = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of hasil) {
      const key = t.occurredAt.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()];
  }, [hasil]);

  const totalSelisih = hasil.reduce(
    (s, t) => s + (t.jenis === "masuk" ? t.amount : -t.amount),
    0,
  );
  const kategoriOptions =
    jenis === "masuk" ? KATEGORI_MASUK : jenis === "keluar" ? KATEGORI_KELUAR : [];
  const adaFilter =
    period !== "semua" || jenis !== "semua" || kategori !== "semua" || q !== "";
  const periodOptions = demo ? PERIOD_OPTIONS : periodeSekarang();

  function resetFilter() {
    setPeriod("semua");
    setJenis("semua");
    setKategori("semua");
    setQ("");
  }

  function simpanEdit(tx: Transaction) {
    if (demo) {
      setDiubah((prev) => ({ ...prev, [tx.id]: tx }));
      return;
    }
    // Optimistic + kirim ke server; gagal → muat ulang supaya jujur.
    setItems((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
    void ubahTransaksi(tx.id, {
      jenis: tx.jenis,
      amount: tx.amount,
      kategori: tx.kategori,
      payment_method: tx.paymentMethod,
      occurred_at: tx.occurredAt,
      catatan: tx.catatan ?? null,
    }).then((res) => {
      if (res.ok) {
        setItems((prev) =>
          prev.map((t) => (t.id === tx.id ? res.data.entry : t)),
        );
      } else {
        void muat(0, false);
      }
    });
  }

  function hapusEntri(id: string) {
    if (demo) {
      setDihapus((prev) => [...prev, id]);
      return;
    }
    setItems((prev) => prev.filter((t) => t.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
    void hapusTransaksi(id).then((res) => {
      if (!res.ok && res.status !== 404) void muat(0, false);
    });
  }

  return (
    <div className="space-y-section">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1>Riwayat</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            Semua transaksi yang pernah kamu catat.
          </p>
        </div>
        <button
          type="button"
          onClick={() => unduhCsv(hasil)}
          disabled={hasil.length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-pill bg-surface-warm px-3.5 py-2 text-[12px] font-semibold text-ink disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          CSV
        </button>
      </header>

      {/* Pencarian */}
      <div className="flex items-center gap-2 rounded-pill bg-surface px-5 py-3 shadow-card transition-shadow focus-within:shadow-float">
        <Search className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari catatan atau kategori…"
          aria-label="Cari transaksi"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-subtle"
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Hapus pencarian"
            className="shrink-0"
          >
            <X className="h-4 w-4 text-ink-subtle" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Filter */}
      <div className="space-y-2">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {[{ value: "semua", label: "Semua" }, ...periodOptions].map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={period === p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "min-h-[40px] shrink-0 rounded-pill px-4 text-[13px] font-semibold transition-colors",
                period === p.value
                  ? "bg-cta text-ink-invert"
                  : "bg-surface-warm text-ink-muted",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["semua", "masuk", "keluar"] as FilterJenis[]).map((j) => (
            <button
              key={j}
              type="button"
              aria-pressed={jenis === j}
              onClick={() => {
                setJenis(j);
                setKategori("semua");
              }}
              className={cn(
                "min-h-[40px] rounded-pill px-4 text-[13px] font-semibold transition-colors",
                jenis === j
                  ? "bg-gold-tint text-gold-deep"
                  : "bg-surface-warm text-ink-muted",
              )}
            >
              {j === "semua" ? "Semua jenis" : j === "masuk" ? "Masuk" : "Keluar"}
            </button>
          ))}

          {kategoriOptions.length > 0 ? (
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              aria-label="Filter kategori"
              className="min-h-[40px] rounded-pill bg-surface-warm px-4 text-[13px] font-semibold text-ink-muted outline-none"
            >
              <option value="semua">Semua kategori</option>
              {kategoriOptions.map((k) => (
                <option key={k.slug} value={k.slug}>
                  {k.nama}
                </option>
              ))}
            </select>
          ) : null}

          {adaFilter ? (
            <button
              type="button"
              onClick={resetFilter}
              className="min-h-[40px] rounded-pill px-3 text-[13px] font-semibold text-ink-subtle underline"
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      {/* Ringkasan hasil filter */}
      {hasil.length > 0 ? (
        <p className="text-[12px] text-ink-muted">
          {demo ? hasil.length : total} transaksi · selisih{" "}
          <span className="tnum font-semibold text-ink">
            {formatRupiah(totalSelisih)}
          </span>
        </p>
      ) : null}

      {/* Daftar */}
      {memuat && hasil.length === 0 ? (
        <div className="space-y-2">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      ) : hasil.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <h2>{adaFilter ? "Tidak ada yang cocok" : "Belum ada transaksi"}</h2>
          <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted">
            {adaFilter
              ? "Coba longgarkan filter atau ubah kata pencarianmu."
              : "Catatan pertamamu akan muncul di sini."}
          </p>
          {adaFilter ? (
            <button
              type="button"
              onClick={resetFilter}
              className="btn-primary mt-2 max-w-[220px]"
            >
              Reset filter
            </button>
          ) : (
            <Link href="/catat" className="btn-primary mt-2 max-w-[220px]">
              Mulai mencatat
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {perHari.map(([tanggal, itemsHari]) => (
            <section key={tanggal} className="space-y-2">
              <h2 className="px-1 text-[13px] font-semibold uppercase tracking-wide text-ink-subtle">
                {formatTanggalPanjangID(tanggal)}
              </h2>
              <div className="card divide-y divide-line overflow-hidden">
                {itemsHari.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    onClick={setEditing}
                    showDate={false}
                  />
                ))}
              </div>
            </section>
          ))}

          {adaLagi ? (
            <button
              type="button"
              onClick={() => void muat(page + 1, true)}
              disabled={memuat}
              className="mx-auto flex min-h-[44px] items-center justify-center rounded-pill bg-surface-warm px-6 text-[13px] font-semibold text-ink disabled:opacity-50"
            >
              {memuat ? "Memuat…" : "Muat lebih banyak"}
            </button>
          ) : null}
        </div>
      )}

      <TransactionSheet
        transaction={editing}
        onClose={() => setEditing(null)}
        onSave={simpanEdit}
        onDelete={hapusEntri}
      />
    </div>
  );
}
