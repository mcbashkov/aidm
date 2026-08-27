"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { DEFAULT_CHAIN, SUPPORTED_CHAINS } from "@/lib/chains/opbnb";
import { bsc, bscTestnet } from "@/lib/chains/bsc";
import {
  PRIVY_APP_ID,
  PRIVY_LOGIN_METHODS,
  isPrivyConfigured,
} from "@/lib/privy/config";
import { ErrorBoundary } from "@/components/error-boundary";

/**
 * Layar cadangan saat PrivyProvider sendiri gagal init. Tidak bisa merender
 * `children`: komponen di bawah memanggil `usePrivy()` yang melempar tanpa
 * provider, jadi kita tampilkan pesan berdiri sendiri + tombol coba lagi.
 */
function AuthUnavailable({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <div className="card w-full max-w-md space-y-3 p-6 text-center">
        <h1 className="font-serif text-card-title font-semibold text-ink">
          Layanan masuk sedang bermasalah
        </h1>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Kami tidak bisa menyiapkan halaman masuk saat ini. Datamu aman — coba
          muat ulang sebentar lagi.
        </p>
        <div className="flex justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={reset}
            className="rounded-pill bg-cta px-5 py-2.5 text-[13px] font-semibold text-ink-invert"
          >
            Coba lagi
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-pill bg-surface-warm px-5 py-2.5 text-[13px] font-semibold text-ink"
          >
            Muat ulang
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Provider global. Prinsip §7.1: "punya akun = punya wallet" → embedded wallet
 * dibuat otomatis untuk SEMUA user (createOnLogin: "all-users"), tanpa seed
 * phrase, jaringan default opBNB.
 *
 * Dibungkus error boundary supaya kegagalan init Privy (mis. metode login yang
 * belum diaktifkan di dashboard) berhenti sebagai layar yang rapi, bukan
 * unhandled runtime error yang menjatuhkan seluruh aplikasi.
 */
/**
 * URL kembali untuk alur OAuth — DIPATOK, tidak pernah diturunkan dari halaman
 * yang sedang dibuka.
 *
 * Tanpa ini SDK Privy memakai `window.location.href` apa adanya, dan Privy
 * mencocokkan URL UTUH itu dengan allowlist dashboard. Query string apa pun
 * membuatnya tidak pernah cocok — termasuk `?next=%2Fberanda` yang ditulis
 * middleware kita sendiri, yang membuat setiap klik "Lanjut dengan Google"
 * dijawab `401 Redirect URL is not allowed` betapa pun banyak entri
 * ditambahkan ke allowlist. Fragmen ditolak dengan cara yang sama.
 *
 * `origin` dibaca dari browser supaya tiap lingkungan mengirim origin-nya
 * sendiri (produksi, pratinjau, localhost) tanpa satu pun env yang harus
 * ingat diganti. `NEXT_PUBLIC_APP_URL` hanya cadangan saat dirender di server,
 * di mana alur OAuth tidak pernah berjalan.
 */
function oauthRedirectUrl(): string | undefined {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
  return origin ? `${origin}/masuk` : undefined;
}

export function Providers({ children }: { children: ReactNode }) {
  if (!isPrivyConfigured) {
    // Mode placeholder (NEXT_PUBLIC_PRIVY_APP_ID belum diisi).
    return <>{children}</>;
  }

  const config: PrivyClientConfig = {
    embeddedWallets: {
      createOnLogin: "all-users",
    },
    loginMethods:
      PRIVY_LOGIN_METHODS as unknown as PrivyClientConfig["loginMethods"],
    customOAuthRedirectUrl: oauthRedirectUrl(),
    defaultChain: DEFAULT_CHAIN,
    // BSC ikut didaftarkan meski aplikasi berumah di opBNB: langkah kedua alur
    // Tukar menebus IDM Reborn di BSC, dan `switchChain` ke jaringan yang tidak
    // terdaftar di sini akan MELEMPAR — voucher yang sah pun jadi tak bisa
    // diklaim. Keduanya (mainnet + testnet) didaftarkan sekaligus supaya
    // pergantian fase tidak menuntut perubahan di berkas ini.
    supportedChains: [...SUPPORTED_CHAINS, bsc, bscTestnet],
    appearance: {
      theme: "light",
      accentColor: "#F0B90B",
      // Modal Privy memberi slot lebar untuk logo, jadi kunci horizontal yang
      // dipakai di sini — sama dengan layar /masuk yang memanggilnya.
      logo: "/brand/idmtokenlogo.png",
      walletChainType: "ethereum-only",
    },
  };

  return (
    <ErrorBoundary
      label="privy-provider"
      fallback={({ reset }) => <AuthUnavailable reset={reset} />}
    >
      <PrivyProvider appId={PRIVY_APP_ID} config={config}>
        {children}
      </PrivyProvider>
    </ErrorBoundary>
  );
}
