"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { isPrivyConfigured } from "@/lib/privy/config";
import { shortenAddress } from "@/lib/utils";

function DemoBadge() {
  return (
    <span className="rounded-pill bg-surface-warm px-3.5 py-2 text-[12px] font-medium text-ink-muted">
      Mode demo
    </span>
  );
}

function PrivyStatus() {
  const { ready, authenticated, user, login } = usePrivy();

  if (!ready) {
    return <span className="skeleton h-9 w-24 rounded-pill" />;
  }
  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={() => login()}
        className="rounded-pill bg-cta px-4 py-2.5 text-[13px] font-semibold text-ink-invert"
      >
        Masuk
      </button>
    );
  }
  return (
    <Link
      href="/akun"
      className="flex items-center gap-2 rounded-pill bg-surface px-3.5 py-2 text-[13px] font-medium text-ink shadow-card"
    >
      <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
      {shortenAddress(user?.wallet?.address)}
    </Link>
  );
}

/** Status auth di kanan-atas top nav. Aman di mode placeholder (tanpa Privy). */
export function AuthStatus() {
  if (!isPrivyConfigured) return <DemoBadge />;
  return <PrivyStatus />;
}
