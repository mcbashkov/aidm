// Service worker AIDM (Serwist / Workbox-grade).
// Di-compile terpisah oleh @serwist/next → public/sw.js.
// File ini dikecualikan dari tsconfig & eslint (konteks WebWorker).
import { defaultCache } from "@serwist/next/worker";
import type {
  PrecacheEntry,
  RuntimeCaching,
  SerwistGlobalConfig,
} from "serwist";
import {
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Jalur autentikasi yang TIDAK BOLEH disentuh service worker.
 *
 * Alur masuk selalu berupa rantai pengalihan ber-query-string: middleware
 * memantulkan rute terlindungi ke `/masuk?next=/beranda`, lalu setelah sesi
 * terbentuk klien berpindah ke `/onboarding/*`. Aturan bawaan `defaultCache`
 * milik @serwist/next melewatkan seluruh navigasi itu ke `NetworkFirst`
 * (cache `pages-rsc-prefetch` / `pages-rsc` / `others`) — sebuah strategi yang
 * boleh menjawab dari cache. Untuk halaman auth itu salah dua kali:
 *
 *   1. Isinya tidak pernah berguna offline — login mustahil tanpa jaringan.
 *   2. Di tengah rantai pengalihan, jawaban cache/kegagalan strategi muncul
 *      sebagai `no-response` dan navigasi berhenti diam-diam. Gejalanya persis
 *      yang terjadi di produksi: tombol membeku di "Menyiapkan akun…" dan
 *      pengguna harus memuat ulang halaman secara manual.
 *
 * Serwist sendiri sudah memperlakukan `/api/auth/*` sebagai `NetworkOnly` di
 * bawaannya; aturan di bawah memperluas alasan yang sama ke HALAMAN auth, dan
 * menuliskannya eksplisit supaya tidak diam-diam berubah saat dependensi naik
 * versi.
 *
 * Catatan: request non-GET (POST/PATCH/DELETE ke `/api/*`) tidak perlu
 * didaftarkan — `RuntimeCaching.method` bawaannya `"GET"`, jadi router service
 * worker memang tidak pernah menyentuhnya.
 */
const JALUR_TANPA_SW = ["/masuk", "/onboarding", "/api/auth"];

function jalurAuth(pathname: string): boolean {
  return JALUR_TANPA_SW.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Jangan pernah SIMPAN respons hasil pengalihan.
 *
 * Ini penutup akar masalahnya, dan berlaku untuk semua rute — bukan cuma
 * halaman auth. Pengalihannya sendiri lahir di rute TERLINDUNGI: middleware
 * memantulkan `/beranda` (tanpa cookie sesi) ke `/masuk?next=/beranda`. Untuk
 * request navigasi, `fetch()` di dalam service worker mengembalikan respons
 * bertipe `opaqueredirect` berstatus 0, dan `cache.put()` MENOLAK respons
 * seperti itu. Di `NetworkFirst`, penolakan itu dihitung sebagai "jaringan
 * gagal" → strategi lalu mencari di cache → tidak ada apa-apa di sana →
 * `no-response`, navigasi berhenti tanpa suara.
 *
 * Dengan menolak penyimpanan lebih awal, respons pengalihan tetap DIKEMBALIKAN
 * apa adanya ke browser (yang memang tahu cara mengikutinya), hanya tidak ikut
 * disimpan. Dukungan offline untuk halaman biasa tidak berkurang sedikit pun —
 * yang hilang cuma penyimpanan respons yang sejak awal tidak layak disimpan.
 */
const janganSimpanPengalihan = {
  cacheWillUpdate: async ({ response }: { response: Response }) =>
    response.type === "opaqueredirect" ||
    response.redirected ||
    response.status !== 200
      ? null
      : response,
};

// Ditaruh di DEPAN defaultCache: router Serwist memakai rute pertama yang
// cocok, jadi urutan ini yang membuat aturan bawaan tidak kebagian.
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && jalurAuth(url.pathname),
    handler: new NetworkOnly(),
  },
  {
    // Navigasi dokumen & muatan RSC (termasuk prefetch) — menggantikan aturan
    // `pages-*` bawaan defaultCache supaya penjaga pengalihan di atas ikut
    // terpasang pada jalur yang paling sering mengalami pengalihan.
    matcher: ({ request, url, sameOrigin }) =>
      sameOrigin &&
      !url.pathname.startsWith("/api/") &&
      (request.mode === "navigate" || request.headers.get("RSC") === "1"),
    handler: new NetworkFirst({
      cacheName: "pages",
      plugins: [
        janganSimpanPengalihan,
        new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 1440 * 60 }),
      ],
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          // Callback fallback hanya menerima `request` (HandlerDidErrorCallbackParam),
          // bukan URL yang sudah terurai seperti matcher rute — jadi path-nya
          // diurai di sini.
          //
          // Jalur auth sengaja TIDAK ikut fallback: menyajikan cangkang
          // offline di tengah rantai pengalihan login membuat alurnya berhenti
          // di halaman yang tidak bisa melanjutkan apa pun. Lebih jujur
          // membiarkan kegagalan jaringan tampil apa adanya di sana.
          if (jalurAuth(new URL(request.url).pathname)) return false;
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
