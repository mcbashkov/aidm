"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronRight, AlertTriangle } from "lucide-react";

const FRASA = "HAPUS";

/**
 * Hapus akun permanen (§12 privasi / UU PDP hak penghapusan).
 *
 * Konfirmasi memakai ketik-ulang frasa, bukan tombol "Yakin?" biasa: yang
 * hilang di sini adalah seluruh buku usaha — transaksi, laporan, segel — dan
 * tidak ada undo. Gesekan sengaja dibuat lebih besar daripada hapus satu
 * transaksi (yang cukup dua ketukan) karena akibatnya tidak sebanding.
 */
export function DeleteAccount() {
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [terbuka, setTerbuka] = useState(false);
  const [frasa, setFrasa] = useState("");
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (!terbuka) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTerbuka(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [terbuka]);

  function tutup() {
    if (memproses) return;
    setTerbuka(false);
    setFrasa("");
    setGalat(null);
  }

  async function hapus() {
    setMemproses(true);
    setGalat(null);
    try {
      const res = await fetch("/api/akun", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konfirmasi: FRASA }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setGalat(body.error ?? "Gagal menghapus akun. Coba lagi ya.");
        setMemproses(false);
        return;
      }
      // Sesi sudah dimatikan server; pindah keluar area terautentikasi dengan
      // reload penuh supaya tidak ada state klien sisa akun yang sudah hilang.
      window.location.href = "/masuk";
    } catch {
      setGalat("Jaringan bermasalah. Akunmu belum terhapus.");
      setMemproses(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setTerbuka(true)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors active:bg-surface-warm"
      >
        <Trash2 className="h-5 w-5 shrink-0 text-danger" aria-hidden />
        <span className="flex-1 text-[14px] text-danger">Hapus akun</span>
        <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
      </button>

      {terbuka ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <button
            type="button"
            aria-label="Tutup"
            onClick={tutup}
            className="absolute inset-0 animate-fade-in bg-black/50"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="pb-safe relative max-h-[92dvh] w-full animate-slide-up space-y-4 overflow-y-auto rounded-t-sheet bg-surface px-5 pb-5 pt-5 outline-none md:max-w-md md:rounded-sheet"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-danger/10">
                <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
              </span>
              <h2 id={titleId} className="text-[20px]">
                Hapus akun
              </h2>
            </div>

            <p className="text-[14px] leading-relaxed text-ink-muted">
              Semua catatan transaksi, laporan, dan segel milikmu akan{" "}
              <strong className="text-ink">dihapus permanen</strong> dan tidak
              bisa dikembalikan. Sebaiknya unduh CSV atau PDF laporanmu dulu.
            </p>

            <div className="space-y-1.5">
              <label
                htmlFor="konfirmasi-hapus"
                className="block text-[13px] text-ink-muted"
              >
                Ketik <strong className="text-ink">{FRASA}</strong> untuk
                melanjutkan
              </label>
              <input
                id="konfirmasi-hapus"
                value={frasa}
                onChange={(e) => setFrasa(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                className="min-h-[48px] w-full rounded-card bg-surface-warm px-4 text-[15px] text-ink outline-none focus:ring-2 focus:ring-danger/40"
              />
            </div>

            {galat ? (
              <p className="text-[13px] text-danger" role="alert">
                {galat}
              </p>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={hapus}
                disabled={frasa.trim().toUpperCase() !== FRASA || memproses}
                className="min-h-[48px] flex-1 rounded-pill bg-danger text-[14px] font-semibold text-ink-invert disabled:opacity-40"
              >
                {memproses ? "Menghapus…" : "Hapus akun saya"}
              </button>
              <button
                type="button"
                onClick={tutup}
                disabled={memproses}
                className="min-h-[48px] flex-1 rounded-pill bg-surface-warm text-[14px] font-semibold text-ink disabled:opacity-40"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
