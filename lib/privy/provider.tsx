"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { DEFAULT_CHAIN, SUPPORTED_CHAINS } from "@/lib/chains/opbnb";
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
    defaultChain: DEFAULT_CHAIN,
    supportedChains: [...SUPPORTED_CHAINS],
    appearance: {
      theme: "light",
      accentColor: "#F0B90B",
      logo: "/brand/logo_idm.png",
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
