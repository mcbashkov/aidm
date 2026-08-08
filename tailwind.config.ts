import type { Config } from "tailwindcss";

/**
 * Sistem desain AIDM (PRD §13, blok "Design token final") — ivory hangat,
 * near-black hangat, aksen emas, kartu "mengambang" (shadow lembut, bukan
 * border 1px). Kartu gelap-emas hanya untuk area Wallet/Reward.
 * Sumber kebenaran nilai warna ada di app/globals.css (CSS variables).
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          warm: "var(--surface-warm)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
          subtle: "var(--ink-subtle)",
          invert: "var(--ink-invert)",
        },
        line: "var(--line)",
        // CTA pill (§13). `charcoal` dipertahankan sebagai alias agar utilitas
        // lama tetap valid; keduanya menunjuk nilai yang sama.
        cta: "var(--cta)",
        charcoal: {
          DEFAULT: "var(--charcoal)",
          soft: "var(--charcoal-soft)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          light: "var(--gold-light)",
          deep: "var(--gold-deep)",
          tint: "var(--gold-tint)",
        },
        wallet: {
          bg: "var(--wallet-bg)",
          card: "var(--wallet-card)",
          line: "var(--wallet-line)",
          ink: "var(--wallet-ink)",
          muted: "var(--wallet-muted)",
        },
        success: "var(--success)",
        danger: "var(--danger)",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-jakarta)", "system-ui", "-apple-system", "sans-serif"],
      },
      // Skala §13 — H1 32→44px, H2 22→26px, judul kartu 18px, body 15px.
      // Dipakai lewat h1/h2/h3 di @layer base; token ini untuk kasus khusus.
      fontSize: {
        display: [
          "clamp(2.25rem, 1.6rem + 2.8vw, 3.25rem)",
          { lineHeight: "1.05", letterSpacing: "-0.02em" },
        ],
        h1: [
          "clamp(2rem, 1.55rem + 2.2vw, 2.75rem)",
          { lineHeight: "1.08", letterSpacing: "-0.015em" },
        ],
        h2: [
          "clamp(1.375rem, 1.3rem + 0.5vw, 1.625rem)",
          { lineHeight: "1.15", letterSpacing: "-0.01em" },
        ],
        "card-title": ["1.125rem", { lineHeight: "1.25" }],
        body: ["0.9375rem", { lineHeight: "1.55" }],
      },
      spacing: {
        // Jarak antar-section 24–32px (§13)
        section: "1.75rem",
      },
      borderRadius: {
        card: "24px",
        sheet: "28px",
        pill: "999px",
      },
      boxShadow: {
        // Shadow lembut §13 menggantikan border tipis sebagai pemisah utama
        soft: "var(--shadow-card)",
        card: "var(--shadow-card)",
        float: "var(--shadow-card-lg)",
        // Bottom nav — arah bayangan ke atas
        nav: "0 -4px 24px rgba(33, 28, 21, 0.06)",
        gold: "0 10px 34px rgba(240,185,11,0.28)",
        wallet: "0 18px 48px rgba(0,0,0,0.38)",
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(135deg, var(--gold-deep) 0%, var(--gold) 45%, var(--gold-light) 100%)",
        "wallet-gradient":
          "linear-gradient(145deg, #241f16 0%, #14110b 55%, #0d0b07 100%)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
