import withSerwistInit from "@serwist/next";

// Service worker (Serwist / Workbox-grade) — precache app-shell + runtime cache +
// halaman offline. Dinonaktifkan saat dev agar tidak mengganggu HMR.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // `revision` ditulis tangan, jadi ia WAJIB dinaikkan setiap kali halaman
  // offline atau perilaku fallback berubah. Selama nilainya sama, Serwist
  // menganggap salinan yang sudah ada masih mutakhir dan tidak pernah
  // mengambil ulang — halaman offline lama akan bertahan di perangkat yang
  // aplikasinya sudah terpasang.
  additionalPrecacheEntries: [{ url: "/~offline", revision: "offline-v2" }],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // @react-pdf/renderer (§16 #9) memuat font & aset internal lewat resolusi
    // modul Node saat runtime. Kalau ikut di-bundle webpack, jalur itu putus
    // dan render PDF gagal di server. Biarkan Node yang me-require-nya.
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  images: {
    // Tanpa optimizer server (tak perlu sharp). Kita rujuk aset yang sudah
    // di-resize (public/icons/*). Optimasi gambar lanjutan bisa diaktifkan nanti.
    unoptimized: true,
  },
};

export default withSerwist(nextConfig);
