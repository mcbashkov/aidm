"use client";

import { HeaderStats } from "./header-stats";

/**
 * Header mobile: hanya baris status IDMX · Wallet, rata kanan.
 * Logo TIDAK tampil di sini — hanya di splash/login dan manifest/ikon.
 * Aktif di <1024px (pola mobile berlaku sampai tablet — lihat AppLayout).
 */
export function MobileTopBar() {
  return (
    <header className="pt-safe sticky top-0 z-40 bg-bg/85 backdrop-blur lg:hidden">
      <div className="mx-auto flex h-12 w-full max-w-2xl items-center justify-end px-4">
        <HeaderStats />
      </div>
    </header>
  );
}
