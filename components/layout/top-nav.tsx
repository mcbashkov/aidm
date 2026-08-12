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
      {/* Sama persis dengan kolom konten (main, §13): max-w-[860px] + px-6 +
          mx-auto — supaya logo segaris dengan judul halaman dan HeaderStats
          segaris dengan tepi kanan kartu konten. Nav ikon-saja (dengan
          title/aria-label per tab) sengaja dipakai di sini karena kolom
          konten 860px tidak cukup lebar untuk logo + 5 label nav + status
          penuh dalam satu baris. */}
      <div className="mx-auto flex h-16 w-full max-w-[860px] items-center gap-4 px-6">
        <Link href="/beranda" className="flex shrink-0 items-center gap-2">
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

        <nav aria-label="Navigasi utama" className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                title={label}
                className={cn(
                  "flex shrink-0 items-center rounded-pill p-3 transition-colors",
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
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">{right}</div>
      </div>
    </header>
  );
}
