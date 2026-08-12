import { NextResponse, type NextRequest } from "next/server";
import { isPrivyConfigured } from "@/lib/privy/config";
import { SESSION_COOKIE } from "@/lib/auth/constants";

const PROTECTED = [
  "/beranda",
  "/catat",
  "/laporan",
  "/riwayat",
  "/premium",
  "/misi",
  "/akun",
  // Rute lama v2.0 yang kini mengalihkan ke /premium (§7.8)
  "/riset",
  "/konten",
];

export function middleware(req: NextRequest) {
  // Mode placeholder (Privy belum dikonfigurasi) → izinkan demo UI.
  if (!isPrivyConfigured) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/masuk";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/beranda/:path*",
    "/catat/:path*",
    "/laporan/:path*",
    "/riwayat/:path*",
    "/premium/:path*",
    "/misi/:path*",
    "/akun/:path*",
    "/riset/:path*",
    "/konten/:path*",
  ],
};
