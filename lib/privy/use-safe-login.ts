"use client";

import { useCallback, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

/**
 * Menerjemahkan kegagalan Privy jadi pesan yang bisa dibaca user. Kasus yang
 * paling sering: metode login diminta di config tapi belum diaktifkan di
 * dashboard Privy (mis. "Login with Google not allowed").
 */
export function loginErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (/not allowed|not enabled|disabled|unsupported/i.test(raw)) {
    return "Metode masuk itu belum aktif. Coba pakai email atau nomor HP ya.";
  }
  if (/network|fetch|timeout/i.test(raw)) {
    return "Koneksi ke layanan masuk terganggu. Coba lagi sebentar lagi.";
  }
  return "Gagal membuka halaman masuk. Coba lagi ya.";
}

/**
 * Pembungkus `login()` Privy yang tidak pernah melempar ke atas. Kegagalan satu
 * metode login berhenti jadi pesan di UI, bukan unhandled runtime error yang
 * menjatuhkan halaman.
 */
export function useSafeLogin() {
  const { login } = usePrivy();
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(() => {
    setError(null);
    try {
      // Privy v2 mengembalikan void, tapi versi/jalur tertentu mengembalikan
      // promise — tangani keduanya supaya rejection tidak lolos jadi unhandled.
      const result: unknown = login();
      if (
        result &&
        typeof (result as PromiseLike<unknown>).then === "function"
      ) {
        void Promise.resolve(result).catch((err: unknown) => {
          console.error("[privy] login gagal:", err);
          setError(loginErrorMessage(err));
        });
      }
    } catch (err) {
      console.error("[privy] login gagal:", err);
      setError(loginErrorMessage(err));
    }
  }, [login]);

  return { start, error, clearError: () => setError(null) };
}
