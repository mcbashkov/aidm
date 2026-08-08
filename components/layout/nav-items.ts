import {
  Home,
  Search,
  PenLine,
  Target,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Navigasi bawah mobile: Beranda · Riset · Konten · Misi · Akun (§13). */
export const NAV_ITEMS: NavItem[] = [
  { href: "/beranda", label: "Beranda", icon: Home },
  { href: "/riset", label: "Riset", icon: Search },
  { href: "/konten", label: "Konten", icon: PenLine },
  { href: "/misi", label: "Misi", icon: Target },
  { href: "/akun", label: "Akun", icon: User },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
