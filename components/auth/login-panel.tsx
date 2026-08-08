"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { isPrivyConfigured } from "@/lib/privy/config";
import { useSafeLogin } from "@/lib/privy/use-safe-login";
import { Button } from "@/components/ui/button";

function Intro() {
  return (
    <div className="space-y-3">
      <h1>Riset pasar, dalam satu tanya.</h1>
      <p className="text-[15px] leading-relaxed text-ink-muted">
        Temukan produk yang lagi naik, ide konten siap pakai, dan peluang usaha —
        khusus UMKM Indonesia.
      </p>
    </div>
  );
}

/** Batas tunggu tukar sesi — server mati/menggantung tidak boleh membuat
 *  tombol membeku di "Menyiapkan akun…" tanpa jalan keluar. */
const SESSION_TIMEOUT_MS = 15_000;

function ConfiguredLogin() {
  const router = useRouter();
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const { start: startLogin, error: loginError } = useSafeLogin();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  // Menandai sinkronisasi sudah dimulai. `user` & `getAccessToken` berganti
  // identitas tiap kali state Privy berubah, jadi tanpa penjaga ini effect
  // bisa berjalan berulang: POST /api/auth/session bertubi-tubi + router
  // .replace berulang — persis pola yang bisa membekukan tab.
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    setSyncing(true);
    setSyncError(null);

    (async () => {
      try {
        const accessToken = await getAccessToken();
        const authProvider = user?.google
          ? "google"
          : user?.phone
            ? "sms"
            : "email";
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            wallet: user?.wallet?.address,
            email: user?.email?.address,
            phone: user?.phone?.number,
            authProvider,
          }),
          signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!cancelled) router.replace("/onboarding/peran");
      } catch (err) {
        // Tanpa cookie sesi, middleware akan memantulkan balik ke /masuk —
        // jadi JANGAN redirect saat gagal. Berhenti di sini dengan jalan keluar.
        console.error("[auth] tukar sesi gagal:", err);
        if (!cancelled) {
          startedRef.current = false;
          setSyncing(false);
          setSyncError(
            "Akun kamu sudah masuk, tapi sesi ke server belum terbentuk. Coba lagi ya.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, user, getAccessToken, router, retry]);

  const problem = syncError ?? loginError;

  return (
    <div className="space-y-6">
      <Intro />
      <div className="space-y-3">
        <Button
          size="lg"
          fullWidth
          disabled={!ready || syncing}
          onClick={() => (syncError ? setRetry((n) => n + 1) : startLogin())}
        >
          {syncing
            ? "Menyiapkan akun…"
            : syncError
              ? "Coba lagi"
              : "Masuk / Daftar"}
        </Button>
        {problem ? (
          <p
            role="alert"
            className="rounded-card bg-gold-tint px-4 py-3 text-center text-[12px] leading-relaxed text-ink-muted"
          >
            {problem}
          </p>
        ) : (
          <p className="text-center text-[12px] text-ink-subtle">
            Email · Nomor HP · Google — wallet dibuat otomatis, tanpa ribet.
          </p>
        )}
      </div>
    </div>
  );
}

function PlaceholderLogin() {
  return (
    <div className="space-y-6">
      <Intro />
      <div className="card space-y-1 p-4">
        <p className="text-[13px] font-semibold text-ink">Mode demo</p>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Auth Privy belum dikonfigurasi. Isi{" "}
          <code className="rounded bg-gold-tint px-1 py-0.5 text-[12px]">
            NEXT_PUBLIC_PRIVY_APP_ID
          </code>{" "}
          di <code className="text-[12px]">.env.local</code> untuk mengaktifkan
          login email/HP/Google + wallet otomatis.
        </p>
      </div>
      <Link href="/beranda" className="btn-primary">
        Lihat demo Beranda
      </Link>
    </div>
  );
}

export function LoginPanel() {
  return isPrivyConfigured ? <ConfiguredLogin /> : <PlaceholderLogin />;
}
