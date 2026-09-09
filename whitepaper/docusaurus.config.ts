import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

/**
 * ⚠ LOGO BELUM ADA. `static/img/logo-idm-reborn.svg` sengaja TIDAK dibuat:
 * spesifikasi §7 melarang menggambar ulang atau memakai placeholder, dan
 * berkas logo IDM Reborn tidak ditemukan di repo landing page (aset/ hanya
 * memuat PNG untuk AIDM, IDM Film, dan SkemGuard — ketiganya logo PILAR,
 * bukan induknya). Rujukan di bawah dipertahankan pada nama yang benar supaya
 * ia langsung bekerja begitu berkasnya ditaruh; sampai saat itu navbar tampil
 * tanpa gambar, dan itu jujur.
 */
const LOGO = "img/logo-idm-reborn.svg";

const config: Config = {
  title: "IDM Whitepaper",
  tagline: "IDM Reborn — dokumen teknis dan ekonomi",
  url: "https://docs.idmtoken.com",
  baseUrl: "/",
  favicon: LOGO,
  organizationName: "mcbashkov",
  projectName: "aidm",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",
  i18n: {
    defaultLocale: "id",
    locales: ["id", "en"],
    localeConfigs: {
      id: { label: "Bahasa Indonesia", htmlLang: "id-ID" },
      en: { label: "English", htmlLang: "en-US" },
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
    navbar: {
      title: "IDM Whitepaper",
      logo: { alt: "IDM Reborn", src: LOGO },
      items: [
        { type: "localeDropdown", position: "right" },
        { href: "https://idmtoken.com", label: "idmtoken.com", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      copyright: "PT IDM Film Sejahtera · NIB 1006240127505",
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
