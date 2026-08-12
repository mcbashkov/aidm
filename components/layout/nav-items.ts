import {
  Home,
  MessageSquarePlus,
  FileBarChart,
  Target,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Navigasi 5 tab: Beranda · Catat · Laporan · Misi · Akun (§13 v3.0).
 * Riset & Konten pindah ke /premium — bukan lagi tab utama (§7.8).
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/beranda", label: "Beranda", icon: Home },
  { href: "/catat", label: "Catat", icon: MessageSquarePlus },
  { href: "/laporan", label: "Laporan", icon: FileBarChart },
  { href: "/misi", label: "Misi", icon: Target },
  { href: "/akun", label: "Akun", icon: User },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
