"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActivePath } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Bottom nav 5 tab untuk mobile (tanpa FAB tengah — §13).
 * Aktif di <1024px (pola mobile berlaku sampai tablet — lihat AppLayout).
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 bg-surface/95 shadow-nav backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="tap flex flex-col items-center gap-1 py-2"
              >
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-colors",
                    active ? "text-gold" : "text-ink-subtle",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[11px] font-medium transition-colors",
                    active ? "text-ink" : "text-ink-subtle",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
