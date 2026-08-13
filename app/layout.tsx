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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "AIDM — Catatan Usaha & Laporan Keuangan",
    template: "%s · AIDM",
  },
  description: brand.tagline,
  applicationName: "AIDM",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AIDM",
  },
  formatDetection: { telephone: false },
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
