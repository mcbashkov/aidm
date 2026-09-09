import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

/**
 * Logo: PNG langsung, bukan SVG (keputusan PO 9 Sep 2026).
 *
 * Sumbernya `public/brand/idmlogo.png` di repo AIDM — lambang belah ketupat
 * yang dipakai sebelum pergantian brand AIDM. Dipilih setelah dibandingkan
 * dengan berkas yang dikirim PO: artwork-nya sama (RMSE 0,039 sesudah kedua
 * sisi dipangkas ke konten — sisa selisihnya artefak JPEG), tetapi arsipnya
 * PNG 2048×2048 BERALPHA sedangkan kiriman JPG 640 berlatar abu solid.
 * Latar transparan penting di sini: navbar Docusaurus berganti warna antara
 * tema terang dan gelap, dan lambang yang membawa kotak latarnya sendiri akan
 * tampak seperti stiker tertempel di salah satunya.
 */
const LOGO = "img/logo.png";

/**
 * Docusaurus membangun tiap locale sebagai proses terpisah dan menaruh
 * locale-nya di env, jadi teks themeConfig bisa dwibahasa tanpa swizzle —
 * `announcementBar` dan `footer.copyright` memang tidak ikut berkas terjemahan
 * JSON bawaan.
 */
const LOCALE = (process.env.DOCUSAURUS_CURRENT_LOCALE ?? "en") as "id" | "en";
const TEKS = {
  id: {
    pengumuman:
      "Draf dalam pengembangan. Seluruh angka, alamat, dan jadwal dapat berubah hingga penerapan mainnet.",
    versi: "v0.1 — DRAF",
    proyek: "Proyek",
  },
  en: {
    pengumuman:
      "Work-in-progress draft. All figures, addresses, and schedules may change until mainnet deployment.",
    versi: "v0.1 — DRAFT",
    proyek: "Projects",
  },
}[LOCALE];

const config: Config = {
  title: "IDM Whitepaper",
  tagline: "IDM Reborn — dokumen teknis dan ekonomi",
  url: "https://docs.idmtoken.com",
  baseUrl: "/",
  favicon: LOGO,
  organizationName: "mcbashkov",
  projectName: "aidm",
  onBrokenLinks: "throw",
  /**
   * ⚠ SELURUH SITUS `noindex, nofollow` SELAMA MASIH DRAF.
   *
   * Situs ini hidup di URL publik sementara seluruh angkanya masih bisa
   * berubah sampai penerapan mainnet. Draf yang terlanjur terindeks bertahan
   * di hasil pencarian jauh setelah angkanya berubah — dan yang menemukannya
   * lewat mesin pencari tidak punya cara tahu bahwa ia membaca versi mati.
   *
   * CABUT baris ini saat versi 1.0 terbit, bukan sebelumnya.
   */
  noIndex: true,
  onBrokenMarkdownLinks: "throw",
  /**
   * INGGRIS adalah locale bawaan sejak 9 Sep 2026 (keputusan PO).
   *
   * Konsekuensinya pada URL, dan ini perlu diketahui sebelum menautkan apa
   * pun: `/` kini melayani bahasa Inggris, sedangkan bahasa Indonesia pindah
   * ke `/id/`. Tautan lama ke halaman Indonesia tanpa awalan `/id/` akan
   * mendarat di versi Inggrisnya, bukan 404 — jadi tidak ada yang rusak, tapi
   * bahasanya berganti.
   *
   * Isi bahasa Indonesia tidak berkurang sedikit pun; ia hanya berpindah dari
   * `docs/` ke `i18n/id/`.
   */
  i18n: {
    defaultLocale: "en",
    locales: ["en", "id"],
    localeConfigs: {
      en: { label: "English", htmlLang: "en-US" },
      id: { label: "Bahasa Indonesia", htmlLang: "id-ID" },
    },
  },
  presets: [
    ["classic", {
      docs: {
        routeBasePath: "/",
        sidebarPath: "./sidebars.ts",
        showLastUpdateTime: true,
        showLastUpdateAuthor: false,
        editUrl: undefined,
      },
      blog: false,
      theme: { customCss: "./src/css/custom.css" },
    } satisfies Preset.Options],
  ],
  themeConfig: {
    /**
     * Tidak bisa ditutup pengguna (`isCloseable: false`). Peringatan yang bisa
     * ditutup akan ditutup pada halaman pertama, lalu sebelas halaman
     * berikutnya dibaca seolah angkanya final.
     */
    announcementBar: {
      id: "draf-v0-1",
      content: TEKS.pengumuman,
      backgroundColor: "#edb415",
      textColor: "#1b1b1b",
      isCloseable: false,
    },
    navbar: {
      title: "IDM Whitepaper",
      logo: { alt: "IDM Reborn", src: LOGO },
      items: [
        {
          type: "dropdown",
          label: TEKS.proyek,
          position: "left",
          items: [
            { to: "/projects/aidm", label: "AIDM" },
            { to: "/projects/skemguard", label: "SkemGuard" },
            { to: "/projects/film", label: "IDM Film" },
            { to: "/projects/idm-chain", label: "IDM Chain" },
          ],
        },
        { type: "localeDropdown", position: "right" },
        { href: "https://idmtoken.com", label: "idmtoken.com", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      copyright: `${TEKS.versi} · PT IDM Film Sejahtera · NIB 1006240127505`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
