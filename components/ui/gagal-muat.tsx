"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { pesanGagal } from "@/lib/api/keadaan";

interface GagalMuatProps {
  offline: boolean;
  /** Memicu permintaan ULANG — bukan `location.reload()`. Muat ulang halaman
   *  di dalam PWA terasa seperti aplikasi jatuh, bukan seperti mencoba lagi. */
  onCobaLagi: () => void;
  /** Sedang mencoba lagi; tombol dikunci supaya tidak menumpuk permintaan. */
  sedangMencoba?: boolean;
}

/**
 * Kartu untuk keadaan gagal memuat data.
 *
 * Sengaja TIDAK memuat angka, tanda hubung di posisi angka, maupun kalimat
 * "belum ada". Yang boleh muncul di sini hanya penjelasan dan jalan keluar —
 * begitu ada satu digit rupiah di layar keadaan gagal, pengguna akan
 * membacanya sebagai saldonya.
 */
export function GagalMuat({
  offline,
  onCobaLagi,
  sedangMencoba = false,
}: GagalMuatProps) {
  return (
    <div
      role="status"
      className="card flex flex-col items-center gap-3 p-8 text-center"
    >
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-tint">
        <CloudOff className="h-5 w-5 text-gold-deep" aria-hidden />
      </span>
      <p className="max-w-xs text-[13.5px] leading-relaxed text-ink-muted">
        {pesanGagal(offline)}
      </p>
      <button
        type="button"
        onClick={onCobaLagi}
        disabled={sedangMencoba}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-surface-warm px-5 text-[14px] font-semibold text-ink disabled:opacity-60"
      >
        <RefreshCw
          className={`h-4 w-4 ${sedangMencoba ? "animate-spin" : ""}`}
          aria-hidden
        />
        {sedangMencoba ? "Mencoba…" : "Coba lagi"}
      </button>
    </div>
  );
}
