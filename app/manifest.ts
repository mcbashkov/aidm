import type { MetadataRoute } from "next";
import { brand } from "@/lib/design/tokens";

/** Manifest PWA (§9.5) — display standalone, ikon maskable+any, shortcut. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AIDM — Intelijen Pasar UMKM",
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
    shortcuts: [
      {
        name: "Riset Tren",
        short_name: "Riset",
        url: "/riset",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Misi & Reward",
        short_name: "Misi",
        url: "/misi",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
