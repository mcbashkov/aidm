"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Layout onboarding/auth: satu fokus per layar, tanpa nav (§13).
 * /masuk (§ revisi header): logo+judul+sub+tombol jadi satu blok, di-center
 * penuh di viewport — logonya dirender oleh LoginPanel sendiri, jadi di sini
 * cukup center children tanpa logo terpisah. Onboarding (peran/usaha) TIDAK
 * berubah: logo tetap pinned di atas seperti sebelumnya.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/masuk") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="pt-safe mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10">
        <Link href="/beranda" className="flex items-center gap-2 py-6">
          <Image src="/icons/icon-192.png" alt="AIDM" width={30} height={30} />
          <span className="font-serif text-[20px] font-semibold tracking-tight text-ink">
            AIDM
          </span>
        </Link>
        <div className="flex flex-1 flex-col justify-center">{children}</div>
      </div>
    </div>
  );
}
