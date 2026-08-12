import type { Metadata } from "next";
import { OfflineCatatForm } from "@/components/catat/offline-catat-form";

export const metadata: Metadata = { title: "Offline" };

/**
 * Layar offline (§9.5). Bukan halaman "maaf gagal": pelaku mikro justru sering
 * mencatat di tempat tanpa sinyal — warung, jalanan, pasar — jadi mencatat
 * harus tetap bisa dilakukan di sini.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="AIDM" className="h-14 w-14" />
      <h1>Kamu sedang offline</h1>
      <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted">
        Tetap catat transaksimu — tersimpan di perangkat dan terkirim otomatis
        begitu internet kembali.
      </p>

      <OfflineCatatForm />

      <a href="/beranda" className="mt-2 text-[13px] font-semibold text-gold-deep">
        Coba sambungkan lagi
      </a>
    </div>
  );
}
