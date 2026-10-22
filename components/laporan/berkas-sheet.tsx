"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { KATALOG, formatHargaIdr, labelBerkasPeran, syaratBeli } from "@/lib/langganan/katalog";
import { ambilPratinjau, pesanBerkas, urlUnduhBerkas } from "@/lib/berkas/client";
import type { KesiapanResponse } from "@/lib/kesiapan/client";
import { cn } from "@/lib/utils";

type Kode = "berkas6" | "berkas12";

/**
 * Sheet pratinjau Berkas Pengajuan (§1.3 poin 1): halaman 1 PDF terbuka penuh
 * dari data nyata pengguna, halaman berikutnya terkunci, harga, tombol bayar.
 * Bukan paywall generik. Pola sheet sama dengan TransactionSheet.
 *
 * Dua jalur beli (§1.5): Plus aktif → dokumen langsung dibuat; selain itu →
 * Midtrans Snap. Midtrans yang belum siap (501/502) tampil sebagai "sedang
 * disiapkan", bukan galat merah.
 */
export function BerkasSheet({
  terbuka,
  onClose,
  kesiapan,
}: {
  terbuka: boolean;
  onClose: () => void;
  kesiapan: KesiapanResponse;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [kode, setKode] = useState<Kode>("berkas6");
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [selesai, setSelesai] = useState<{ id: string; nomor: string } | null>(null);

  const muatPratinjau = useCallback(async (k: Kode) => {
    setMemuat(true);
    const blob = await ambilPratinjau(k);
    setPratinjau((lama) => {
      if (lama) URL.revokeObjectURL(lama);
      return blob ? URL.createObjectURL(blob) : null;
    });
    setMemuat(false);
  }, []);

  useEffect(() => {
    if (!terbuka) return;
    setPesan(null);
    setSelesai(null);
    void muatPratinjau(kode);
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
  }, [terbuka, kode, onClose, muatPratinjau]);

  useEffect(() => () => { if (pratinjau) URL.revokeObjectURL(pratinjau); }, [pratinjau]);

  if (!terbuka) return null;

  const produk = KATALOG[kode];
  const syarat = syaratBeli(kode, kesiapan);
  const label = labelBerkasPeran(kesiapan.earnerType, produk.bulan as 6 | 12);

  async function beli() {
    setSibuk(true);
    setPesan(null);
    const res = await pesanBerkas(kode);
    setSibuk(false);
    if (res.ok) {
      if (res.data.jalur === "bayar") {
        window.location.href = res.data.redirectUrl;
        return;
      }
      setSelesai({ id: res.data.berkas.id, nomor: res.data.berkas.nomorDokumen });
      return;
    }
    if (res.offline) setPesan("Kamu sedang offline — coba lagi saat tersambung.");
    else if (res.status === 409) setPesan(res.error);
    else if (res.status === 501 || res.status === 502) setPesan("Pembayaran sedang disiapkan — coba lagi nanti.");
    else setPesan(res.error || "Belum bisa diproses. Coba lagi ya.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 animate-fade-in bg-black/50" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="pb-safe relative max-h-[92dvh] w-full animate-slide-up overflow-y-auto rounded-t-sheet bg-surface px-5 pt-5 outline-none md:max-w-md md:rounded-sheet md:pb-6"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-[20px]">{label}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="tap grid place-items-center rounded-full bg-surface-warm">
            <X className="h-5 w-5 text-ink-muted" aria-hidden />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {(["berkas6", "berkas12"] as Kode[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kode === k}
              onClick={() => setKode(k)}
              disabled={sibuk || memuat}
              className={cn(
                "min-h-[44px] rounded-pill text-[13px] font-semibold transition-colors",
                kode === k ? "bg-cta text-ink-invert" : "bg-surface-warm text-ink-muted",
              )}
            >
              {KATALOG[k].bulan} bulan · {formatHargaIdr(KATALOG[k].hargaIdr)}
            </button>
          ))}
        </div>

        {selesai ? (
          <div className="card space-y-3 p-5">
            <p className="text-[15px] font-semibold text-ink">Dokumen {selesai.nomor} sudah dibuat.</p>
            <p className="text-[13px] leading-relaxed text-ink-muted">
              Termasuk dalam AIDM Plus — tanpa bayar per dokumen. Bisa diunduh ulang kapan saja dari Akun.
            </p>
            <a href={urlUnduhBerkas(selesai.id)} className="btn-primary" target="_blank" rel="noreferrer">
              Unduh PDF
            </a>
          </div>
        ) : (
          <>
            {/* Halaman 1 — sampul dari data nyata pengguna */}
            <div className="overflow-hidden rounded-card border border-line bg-white">
              {memuat || !pratinjau ? (
                <div className="grid h-[46vh] place-items-center text-[13px] text-ink-muted">
                  {memuat ? "Menyusun pratinjau…" : "Pratinjau belum bisa dibuat."}
                </div>
              ) : (
                <iframe src={pratinjau} title="Pratinjau halaman 1" className="h-[46vh] w-full" />
              )}
            </div>
            {pratinjau ? (
              <a href={pratinjau} target="_blank" rel="noreferrer" className="mt-1 block text-[12px] font-semibold text-gold-deep">
                Buka pratinjau di tab baru
              </a>
            ) : null}

            {/* Halaman berikutnya terkunci */}
            <div className="relative mt-3 space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 rounded-card border border-line bg-surface-warm blur-[2px]" aria-hidden />
              ))}
              <p className="absolute inset-0 grid place-items-center text-[12.5px] font-semibold text-ink-muted">
                Pratinjau — ringkasan per bulan, rincian, dan halaman notarisasi terbuka setelah pembelian
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[13px] text-ink-muted">
                <span className="tnum font-semibold text-ink">{formatHargaIdr(produk.hargaIdr)}</span> · sekali bayar per dokumen · termasuk dalam AIDM Plus
              </p>
              {pesan ? (
                <p role="alert" className="text-[12.5px] text-ink-muted">{pesan}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void beli()}
                disabled={sibuk || !syarat.boleh}
                className="btn-primary disabled:opacity-50"
              >
                {sibuk ? "Memproses…" : `Buat ${label}`}
              </button>
              {!syarat.boleh ? (
                <p className="text-[12px] leading-relaxed text-ink-subtle">{syarat.alasan}</p>
              ) : null}
              <p className="text-[11.5px] leading-relaxed text-ink-subtle">
                Dokumen ini disusun dari catatanmu. AIDM tidak mengajukan, menilai, atau memperantarai pinjaman.{" "}
                <Link href="/pengembalian-dana" className="underline">Kebijakan pengembalian dana</Link>.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
