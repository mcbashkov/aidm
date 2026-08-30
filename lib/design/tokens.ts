/**
 * Token desain AIDM (mirror dari app/globals.css) untuk dipakai di JS/TS:
 * manifest PWA, meta theme-color, warna chart, dsb. Satu sumber untuk nilai
 * yang perlu dibaca runtime.
 */

export const colors = {
  bg: "#FAF7F0",
  surface: "#FFFFFF",
  surfaceWarm: "#F4EFE6",
  line: "#ECE5D8",
  ink: "#211C15",
  inkMuted: "#6B6156",
  inkSubtle: "#8A8175",
  cta: "#1B1B1B",
  charcoal: "#1B1B1B",
  gold: "#F0B90B",
  goldLight: "#FCD535",
  goldDeep: "#D89E0A",
  goldTint: "#FDF3D7",
  walletBg: "#14110B",
  walletCard: "#1E1A12",
  success: "#17864A",
  danger: "#C0392B",
} as const;

export const brand = {
  name: "AIDM",
  shortName: "AIDM",
  tagline: "Catatan usaha dan laporan keuangan untuk UMKM Indonesia",
  /** Bilah status SELAMA aplikasi terbuka — aplikasinya cream, jadi cream. */
  themeColor: colors.bg,
  /**
   * Latar splash yang digambar sistem operasi sebelum aplikasi hidup.
   * HITAM, menyambung dengan ikon maskable (#000) dan dengan splash kita
   * sendiri di rute `/`. Cream di sini menghasilkan kedipan terang tepat pada
   * peralihan ikon → splash, lalu gelap lagi — dua kedipan untuk satu bukaan.
   */
  backgroundColor: "#000000",
  accent: colors.gold,
} as const;

export type ColorToken = keyof typeof colors;
