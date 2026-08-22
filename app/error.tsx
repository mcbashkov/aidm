"use client";

import { useEffect } from "react";

/**
 * Layar galat tak terduga berbahasa Indonesia (§13).
 *
 * Prioritas kalimatnya bukan menjelaskan errornya, melainkan menjawab
 * pertanyaan yang sebenarnya ada di kepala pengguna aplikasi pembukuan saat
 * layar gagal: "catatanku hilang, tidak?" Karena itu jaminan datanya
 * disebut lebih dulu daripada tombol coba lagi.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] error tak tertangani:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <div className="card w-full max-w-md space-y-4 p-6 text-center">
        <h1 className="font-serif text-[22px] font-semibold text-ink">
          Ada yang bermasalah di layar ini
        </h1>
        <p className="text-[14px] leading-relaxed text-ink-muted">
          Catatan dan laporanmu tersimpan aman — yang gagal hanya tampilan
          halaman ini.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <button type="button" onClick={reset} className="btn-primary px-6">
            Coba lagi
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/beranda")}
            className="inline-flex min-h-[44px] items-center rounded-pill bg-surface-warm px-6 text-[15px] font-semibold text-ink"
          >
            Ke Beranda
          </button>
        </div>
        {error.digest ? (
          <p className="pt-1 text-[11.5px] text-ink-subtle">
            Kode rujukan: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
