import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { TautanLegal } from "@/components/layout/tautan-legal";

/**
 * Shell halaman publik: dokumen hukum yang HARUS terbuka tanpa login.
 *
 * Sengaja BUKAN shell aplikasi. Halaman ini dibaca oleh orang yang belum punya
 * akun — termasuk peninjau merchant Midtrans — dan menyeret nav bawah, header
 * saldo, serta pembacaan `/api/me` ke sana hanya menampilkan aplikasi yang
 * tidak bisa mereka pakai. Yang mereka butuhkan cuma teksnya.
 *
 * Rute di grup ini tidak terdaftar di `PROTECTED` middleware, jadi tidak ada
 * pemantulan ke `/masuk`.
 */
export default function PublikLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-2xl items-center px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={28}
              height={28}
              priority
            />
            <span className="font-serif text-[19px] font-semibold tracking-tight text-ink">
              AIDM
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-line px-4 py-6">
        <TautanLegal />
      </footer>
    </div>
  );
}
