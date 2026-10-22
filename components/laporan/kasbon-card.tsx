"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  formatRupiah,
  formatTanggalPendekID,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/transactions";
import { daftarKasbon, hapusKasbon, lunasiKasbon } from "@/lib/kasbon/client";
import type { KasbonDaftar, KasbonItem } from "@/lib/kasbon/tipe";
import { cn } from "@/lib/utils";

interface KasbonCardProps {
  /** Dipanggil saat pelunasan MEMBUAT transaksi — angka laporan di atas
   *  berubah dan perlu dibaca ulang dari server. */
  onLaporanBerubah: () => void;
}

/**
 * Kartu "Kasbon belum lunas" (Batch 2, §Laporan).
 *
 * Kasbon bukan uang yang sudah berpindah, jadi ia tidak pernah ikut "Sisa
 * uang", grafik, PDF, maupun segel — kartu ini satu-satunya tempat ia
 * terlihat di Laporan, dan ia mengatakan itu terang-terangan.
 *
 * Tidak mengikuti pemilih periode: kasbon aktif adalah keadaan SEKARANG.
 * Tidak dirender sama sekali bila tidak ada kasbon aktif, di mode demo, atau
 * saat pemuatan pertama — kartu kosong untuk fitur yang belum dipakai hanya
 * menambah satu hal untuk dibaca.
 */
export function KasbonCard({ onLaporanBerubah }: KasbonCardProps) {
  const judulId = useId();
  const [data, setData] = useState<KasbonDaftar | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [melunasi, setMelunasi] = useState<KasbonItem | null>(null);
  const [konfirmHapus, setKonfirmHapus] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);

  const muat = useCallback(async () => {
    const res = await daftarKasbon();
    if (res.ok) {
      setData(res.data);
      setGalat(null);
    } else if (res.demo) {
      setDemo(true);
    } else {
      setGalat(
        res.offline
          ? "Kamu sedang offline — daftar kasbon belum bisa dibaca."
          : "Daftar kasbon belum bisa dibaca.",
      );
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  // Tautan "Kelola" dari kartu Catat menuju /laporan#kasbon. Browser mencari
  // jangkar itu saat halaman dimuat — sebelum kartu ini ada, karena ia baru
  // dirender setelah datanya tiba. Jadi gulirnya dilakukan di sini, sekali,
  // begitu kartunya benar-benar tampil.
  const sudahGulir = useRef(false);
  const adaIsi = Boolean(
    data && (data.piutang.length > 0 || data.utang.length > 0),
  );
  useEffect(() => {
    if (!adaIsi || sudahGulir.current) return;
    if (window.location.hash !== "#kasbon") return;
    sudahGulir.current = true;
    document.getElementById("kasbon")?.scrollIntoView({ block: "start" });
  }, [adaIsi]);

  async function hapus(id: string) {
    setSibuk(id);
    const res = await hapusKasbon(id);
    setSibuk(null);
    setKonfirmHapus(null);
    if (!res.ok) {
      setGalat(
        res.offline
          ? "Kamu sedang offline — kasbon belum terhapus."
          : "Kasbon belum terhapus. Coba lagi ya.",
      );
      return;
    }
    await muat();
  }

  if (demo) return null;

  if (galat && !data) {
    return (
      <section id="kasbon" className="card space-y-2 p-5">
        <h3>Kasbon belum lunas</h3>
        <p className="text-[13px] text-ink-muted">{galat}</p>
        <button
          type="button"
          onClick={() => void muat()}
          className="tap rounded-pill bg-surface-warm px-3.5 text-[12px] font-semibold text-ink"
        >
          Coba lagi
        </button>
      </section>
    );
  }

  if (!data || (data.piutang.length === 0 && data.utang.length === 0)) {
    return null;
  }

  const kelompok = [
    {
      kunci: "piutang",
      judul: "Orang berutang padamu",
      total: data.totalPiutang,
      baris: data.piutang,
    },
    {
      kunci: "utang",
      judul: "Kamu berutang",
      total: data.totalUtang,
      baris: data.utang,
    },
  ].filter((k) => k.baris.length > 0);

  return (
    <div>
      <section
        id="kasbon"
        aria-labelledby={judulId}
        className="card scroll-mt-16 space-y-4 p-5"
      >
        <div>
          <h3 id={judulId}>Kasbon belum lunas</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
            Belum dihitung di Sisa uang. Masuk laporan pada hari kamu
            menandainya lunas.
          </p>
        </div>

        {galat ? (
          <p role="alert" className="text-[12.5px] text-danger">
            {galat}
          </p>
        ) : null}

        {kelompok.map((k) => (
          <div key={k.kunci} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold text-ink">{k.judul}</p>
              <p className="tnum text-[14px] font-semibold text-ink">
                {formatRupiah(k.total)}
              </p>
            </div>

            <ul className="divide-y divide-line">
              {k.baris.map((b) => (
                <li key={b.id} className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">
                        {b.pihak ?? (b.tipe === "piutang" ? "Pelanggan" : "Pemasok")}
                      </p>
                      <p className="truncate text-[12px] text-ink-subtle">
                        {formatTanggalPendekID(b.occurredAt)}
                        {ringkasBarang(b) ? ` · ${ringkasBarang(b)}` : ""}
                      </p>
                    </div>
                    <p className="tnum shrink-0 text-[14px] font-semibold text-ink">
                      {formatRupiah(b.amount)}
                    </p>
                  </div>

                  {konfirmHapus === b.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] text-ink-muted">
                        Hapus kasbon ini? Pilih ini hanya kalau salah catat.
                      </span>
                      <button
                        type="button"
                        onClick={() => void hapus(b.id)}
                        disabled={sibuk === b.id}
                        className="tap rounded-pill bg-danger px-3.5 text-[12px] font-semibold text-ink-invert disabled:opacity-50"
                      >
                        {sibuk === b.id ? "Menghapus…" : "Ya, hapus"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setKonfirmHapus(null)}
                        className="tap rounded-pill bg-surface-warm px-3.5 text-[12px] font-semibold text-ink"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMelunasi(b)}
                        className="tap rounded-pill bg-surface-warm px-3.5 text-[12px] font-semibold text-ink"
                      >
                        Tandai lunas
                      </button>
                      <button
                        type="button"
                        onClick={() => setKonfirmHapus(b.id)}
                        className="tap rounded-pill px-3 text-[12px] font-medium text-ink-subtle"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* Di LUAR <section>, di dalam <div> polos: induk yang memakai
          `space-y-*` memberi margin-top pada anaknya, dan wadah `fixed inset-0`
          yang ikut bergeser 16px tidak lagi menutup bagian atas layar. Pola
          yang sama dengan DeleteAccount (overlay di pembungkus tanpa space-y). */}
      <LunasSheet
        kasbon={melunasi}
        onClose={() => setMelunasi(null)}
        onSelesai={async (catat) => {
          setMelunasi(null);
          await muat();
          if (catat) onLaporanBerubah();
        }}
      />
    </div>
  );
}

function ringkasBarang(k: KasbonItem): string {
  if (k.items && k.items.length > 0) {
    return k.items
      .map((i) => (i.jumlah ? `${i.jumlah} ${i.nama}` : i.nama))
      .join(", ");
  }
  return k.catatan ?? "";
}

/**
 * Sheet "Tandai lunas". Dua pilihan, keduanya eksplisit, karena salah satu
 * tebakan menggandakan uang di laporan:
 *   · "Catat pembayarannya sekarang" — membuat transaksi hari ini;
 *   · "Sudah kucatat" — pembayarannya sudah diketik di Catat, jadi yang
 *     ditutup hanya kasbonnya.
 * Pola sheet sama dengan TransactionSheet (Escape menutup, latar terkunci).
 */
function LunasSheet({
  kasbon,
  onClose,
  onSelesai,
}: {
  kasbon: KasbonItem | null;
  onClose: () => void;
  onSelesai: (catat: boolean) => Promise<void>;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [metode, setMetode] = useState<PaymentMethod>("tunai");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (!kasbon) return;
    setMetode("tunai");
    setGalat(null);
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
  }, [kasbon, onClose]);

  if (!kasbon) return null;

  const piutang = kasbon.tipe === "piutang";
  const siapa = kasbon.pihak ?? (piutang ? "Pelanggan" : "pemasok");

  async function kirim(catat: boolean) {
    if (!kasbon) return;
    setSibuk(true);
    setGalat(null);
    const res = await lunasiKasbon(kasbon.id, catat, metode);
    setSibuk(false);
    if (res.ok) {
      await onSelesai(catat);
      return;
    }
    setGalat(
      res.offline
        ? "Kamu sedang offline — coba lagi saat tersambung."
        : res.status === 409
          ? "Kasbon ini sudah lunas atau sudah dihapus."
          : "Belum tersimpan. Coba lagi ya.",
    );
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
            Tandai lunas
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

        <div className="space-y-5 pb-5">
          <p className="text-[14px] leading-relaxed text-ink">
            {piutang
              ? `${siapa} membayar `
              : `Kamu membayar ${kasbon.pihak ? `${kasbon.pihak} ` : ""}`}
            <span className="tnum font-semibold">
              {formatRupiah(kasbon.amount)}
            </span>
            .
          </p>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-ink">Dibayar pakai</p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={metode === m.value}
                  onClick={() => setMetode(m.value)}
                  disabled={sibuk}
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
          </div>

          {galat ? (
            <p role="alert" className="text-[12.5px] text-danger">
              {galat}
            </p>
          ) : null}

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void kirim(true)}
              disabled={sibuk}
              className="btn-primary disabled:opacity-50"
            >
              {sibuk ? "Menyimpan…" : "Catat pembayarannya sekarang"}
            </button>
            <p className="text-[11.5px] leading-relaxed text-ink-subtle">
              Dicatat sebagai {piutang ? "pemasukan" : "pengeluaran"} hari ini.
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void kirim(false)}
              disabled={sibuk}
              className="min-h-[48px] w-full rounded-pill bg-surface-warm text-[14px] font-semibold text-ink disabled:opacity-50"
            >
              Sudah kucatat — tutup kasbonnya saja
            </button>
            <p className="text-[11.5px] leading-relaxed text-ink-subtle">
              Pilih ini kalau pembayarannya sudah kamu ketik di Catat, supaya
              uangnya tidak terhitung dua kali.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
