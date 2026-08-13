import type { MetadataRoute } from "next";
import { brand } from "@/lib/design/tokens";

/** Manifest PWA (§9.5) — display standalone, ikon maskable+any, shortcut. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AIDM — Catatan Usaha & Laporan Keuangan",
    short_name: "AIDM",
    description: brand.tagline,
    id: "/",
    start_url: "/beranda",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: brand.backgroundColor,
    theme_color: brand.themeColor,
    lang: "id",
    dir: "ltr",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Shortcut v3.0: Catat & Laporan (§9.5) — menggantikan Riset & Misi.
    shortcuts: [
      {
        name: "Catat transaksi",
        short_name: "Catat",
        url: "/catat",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Laporan keuangan",
        short_name: "Laporan",
        url: "/laporan",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
