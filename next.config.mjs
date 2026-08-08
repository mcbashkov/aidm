import withSerwistInit from "@serwist/next";

// Service worker (Serwist / Workbox-grade) — precache app-shell + runtime cache +
// halaman offline. Dinonaktifkan saat dev agar tidak mengganggu HMR.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision: "offline-v1" }],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Tanpa optimizer server (tak perlu sharp). Kita rujuk aset yang sudah
    // di-resize (public/icons/*). Optimasi gambar lanjutan bisa diaktifkan nanti.
    unoptimized: true,
  },
};

export default withSerwist(nextConfig);
