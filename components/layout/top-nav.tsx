"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActivePath } from "./nav-items";
import { cn } from "@/lib/utils";

/** Top navigation gaya aplikasi exchange, hanya untuk desktop (§13, ≥1024px). */
export function TopNav({ right }: { right?: ReactNode }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden bg-bg/85 backdrop-blur lg:block">
      {/* Sama persis dengan kolom konten (main, §13): max-w-[1320px] + px-6 +
          mx-auto — supaya logo segaris dengan judul halaman dan HeaderStats
          segaris dengan tepi kanan kartu konten.
          Grid 3-kolom (bukan flex justify-between): kolom tengah (nav) auto,
          kolom kiri & kanan minmax(0,1fr) — dipaksa SAMA LEBAR secara
          matematis, bukan content-based, jadi nav presisi di tengah dan TIDAK
          bergeser berapa pun lebar logo/HeaderStats (verified ≥1280px). Di
          bawah 1280px kolom kembali ke content-based (1fr auto 1fr) — ruang
          di situ tidak cukup untuk kolom kiri/kanan yang benar-benar sama
          lebar tanpa membuat HeaderStats tumpang tindih dengan nav. */}
      <div className="mx-auto grid h-16 w-full max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 min-[1280px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Link
          href="/beranda"
          className="flex shrink-0 items-center justify-self-start gap-2"
        >
          <Image
            src="/icons/icon-192.png"
            alt="AIDM"
            width={28}
            height={28}
            priority
          />
          <span className="font-serif text-card-title font-semibold tracking-tight">
            AIDM
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="flex items-center justify-self-center gap-1"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-pill px-3.5 py-2 text-[14px] font-medium transition-colors",
                  active
                    ? "bg-gold-tint text-ink"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-gold-deep" : "text-ink-subtle",
                  )}
                  aria-hidden
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-self-end gap-3">
          {right}
        </div>
      </div>
    </header>
  );
}
