"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { isPrivyConfigured } from "@/lib/privy/config";
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

function ConfiguredLogin() {
  const router = useRouter();
  const { ready, authenticated, user, login, getAccessToken } = usePrivy();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let cancelled = false;
    setSyncing(true);
    (async () => {
      try {
        const accessToken = await getAccessToken();
        const authProvider = user?.google
          ? "google"
          : user?.phone
            ? "sms"
            : "email";
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            wallet: user?.wallet?.address,
            email: user?.email?.address,
            phone: user?.phone?.number,
            authProvider,
          }),
        });
      } catch {
        // biarkan — sesi akan disinkronkan ulang; UI tetap lanjut
      }
      if (!cancelled) router.replace("/onboarding/peran");
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, user, getAccessToken, router]);

  return (
    <div className="space-y-6">
      <Intro />
      <div className="space-y-3">
        <Button
          size="lg"
          fullWidth
          disabled={!ready || syncing}
          onClick={() => login()}
        >
          {syncing ? "Menyiapkan akun…" : "Masuk / Daftar"}
        </Button>
        <p className="text-center text-[12px] text-ink-subtle">
          Email · Nomor HP · Google — wallet dibuat otomatis, tanpa ribet.
        </p>
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
