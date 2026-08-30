import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/privy/provider";
import { Pwa } from "@/components/pwa/pwa";
import { brand } from "@/lib/design/tokens";

// Serif display untuk judul/sapaan/pertanyaan/angka besar (§13).
// Sumbu `opsz` ikut diunduh supaya `font-optical-sizing: auto` benar-benar
// bekerja; weight 500–600 dipakai lewat @layer base di globals.css.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  display: "swap",
});

// Sans untuk body, label, chip, dan nav (§13)
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

/**
 * Alamat kanonik situs. Memakai env bila ada (supaya preview deployment &
 * localhost menunjuk dirinya sendiri), tapi CADANGANNYA domain produksi —
 * bukan localhost seperti sebelumnya. Alasannya khusus Open Graph: bila
 * `NEXT_PUBLIC_APP_URL` lupa diisi di produksi, cadangan localhost membuat URL
 * gambar preview jadi `http://localhost:3000/og-image.jpg` dan tautan yang
 * dibagikan tampil tanpa gambar — gagal diam-diam yang hanya ketahuan setelah
 * orang lain melihatnya.
 */
const SITUS = process.env.NEXT_PUBLIC_APP_URL || "https://ai.idmtoken.com";

const JUDUL_SOSIAL = "AIDM — Catat usahamu, dalam satu ucap.";
const DESKRIPSI_SOSIAL =
  "Buku usaha untuk UMKM, ojol, dan freelancer. Catat dengan bicara, laporannya rapi sendiri.";

// Ukuran ASLI berkas `public/og-image.jpg`. Angka ini wajib cocok dengan
// filenya: sebagian pengambil pratinjau memesan ruang tata letak dari angka
// yang dideklarasikan, jadi angka yang meleset membuat banner terpotong atau
// ter-stretch di aplikasi chat.
const OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1600,
  height: 844,
  alt: "AIDM — Catat usahamu, dalam satu ucap. Buku usaha untuk UMKM, ojol, dan freelancer.",
  type: "image/jpeg",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITUS),
  title: {
    default: "AIDM — Catatan Usaha & Laporan Keuangan",
    template: "%s · AIDM",
  },
  description:
    "Catat usahamu dalam satu ucap. Buku usaha untuk UMKM, ojol, dan freelancer — catat dengan bicara, laporannya rapi sendiri.",
  applicationName: brand.name,
  keywords: [
    "catatan usaha",
    "laporan keuangan UMKM",
    "pembukuan ojol",
    "pembukuan freelancer",
    "KUR mikro",
    "AIDM",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITUS,
    siteName: brand.name,
    title: JUDUL_SOSIAL,
    description: DESKRIPSI_SOSIAL,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: JUDUL_SOSIAL,
    description: DESKRIPSI_SOSIAL,
    images: [OG_IMAGE.url],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: brand.shortName,
  },
  formatDetection: { telephone: false },
  /**
   * `appleWebApp.capable` di atas menerbitkan `apple-mobile-web-app-capable`,
   * yang sudah lama diperingatkan usang oleh Chrome. Penggantinya yang baku
   * ditambahkan DI SAMPING-nya, bukan menggantikannya: Safari masih membaca
   * yang versi Apple untuk mode standalone, dan yang usang di sini adalah
   * peringatan Chrome — bukan pencabutan dukungan Apple. Menghapusnya untuk
   * membersihkan konsol berarti menukar satu peringatan dengan satu regresi.
   *
   * Next.js Metadata API tidak punya field untuk yang baku, jadi lewat `other`.
   */
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: brand.themeColor,
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Pwa />
      </body>
    </html>
  );
}
