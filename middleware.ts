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
  const punyaSesi = req.cookies.has(SESSION_COOKIE);

  /**
   * Sesi hidup TIDAK perlu melihat layar masuk.
   *
   * Dua keuntungan sekaligus, dan keduanya nyata. Pertama: pengguna yang sudah
   * masuk tidak lagi mendarat di layar yang akan memantulkannya. Kedua —
   * dan ini yang terukur — `/masuk` memuat SDK Privy (829 KB gzip, dua chunk),
   * sementara seluruh tab aplikasi 112–117 KB. Pemantulan ini terjadi di
   * middleware, SEBELUM satu byte JavaScript halaman dikirim, jadi pemilik
   * sesi tidak pernah membayar bundel itu sama sekali.
   *
   * Aman terhadap alur OAuth: callback Privy mendarat di `/masuk` justru pada
   * saat pengguna BELUM punya cookie sesi (cookie itu baru lahir setelah token
   * ditukar), jadi tidak ada callback yang bisa terpantul.
   */
  if (pathname === "/masuk" && punyaSesi) {
    const url = req.nextUrl.clone();
    url.pathname = "/beranda";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  if (!punyaSesi) {
    const url = req.nextUrl.clone();
    url.pathname = "/masuk";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/masuk",
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
