import type { MetadataRoute } from "next";
import { brand } from "@/lib/design/tokens";

/**
 * Penanda versi aset ikon — dinaikkan SETIAP KALI logo berganti.
 *
 * Bukan cache-busting biasa. Ikon aplikasi yang sudah terpasang di desktop
 * maupun layar utama ponsel diambil sistem operasi pada detik pemasangan, dan
 * sejak itu tidak pernah disentuh lagi oleh header HTTP maupun service worker.
 * Yang memicu pembaruannya hanya satu: browser mendeteksi MANIFEST-nya berubah.
 *
 * Selama `src` ikonnya sama persis, manifest byte-identik dan tidak ada
 * perubahan yang bisa dideteksi — logo baru terbit di server, dan setiap
 * pengguna lama tetap melihat lambang lama di layar utamanya sampai ia
 * kebetulan memasang ulang aplikasinya. Praktis: selamanya.
 *
 * Menaikkan angka ini mengubah manifest, browser membacanya sebagai versi
 * baru, lalu mengambil ulang ikonnya. Berkasnya sendiri tidak perlu berganti
 * nama — query string sudah cukup untuk membuat manifest-nya berbeda.
 */
const V_IKON = 2;

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
        src: `/icons/icon-192.png?v=${V_IKON}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icons/icon-512.png?v=${V_IKON}`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/icons/maskable-192.png?v=${V_IKON}`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `/icons/maskable-512.png?v=${V_IKON}`,
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
        icons: [{ src: `/icons/icon-192.png?v=${V_IKON}`, sizes: "192x192" }],
      },
      {
        name: "Laporan keuangan",
        short_name: "Laporan",
        url: "/laporan",
        icons: [{ src: `/icons/icon-192.png?v=${V_IKON}`, sizes: "192x192" }],
      },
    ],
  };
}
