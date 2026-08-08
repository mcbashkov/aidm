"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { DEFAULT_CHAIN, SUPPORTED_CHAINS } from "@/lib/chains/opbnb";
import { PRIVY_APP_ID, isPrivyConfigured } from "@/lib/privy/config";

/**
 * Provider global. Prinsip §7.1: "punya akun = punya wallet" → embedded wallet
 * dibuat otomatis untuk SEMUA user (createOnLogin: "all-users"), tanpa seed
 * phrase, jaringan default opBNB.
 */
export function Providers({ children }: { children: ReactNode }) {
  if (!isPrivyConfigured) {
    // Mode placeholder (NEXT_PUBLIC_PRIVY_APP_ID belum diisi).
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        embeddedWallets: {
          createOnLogin: "all-users",
        },
        loginMethods: ["email", "sms", "google"],
        defaultChain: DEFAULT_CHAIN,
        supportedChains: [...SUPPORTED_CHAINS],
        appearance: {
          theme: "light",
          accentColor: "#F0B90B",
          logo: "/brand/logo_idm.png",
          walletChainType: "ethereum-only",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
