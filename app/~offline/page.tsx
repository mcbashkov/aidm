import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="AIDM" className="h-14 w-14" />
      <h1>Kamu sedang offline</h1>
      <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted">
        Riwayat riset yang tersimpan tetap bisa dibuka. Sambungkan internet
        untuk riset baru.
      </p>
      <a href="/beranda" className="btn-primary mt-2 max-w-[220px]">
        Coba lagi
      </a>
    </div>
  );
}
