"use client";

import Link from "next/link";
import { Zap, Sparkles } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { isPrivyConfigured } from "@/lib/privy/config";
import { useSafeLogin } from "@/lib/privy/use-safe-login";
import { useMe } from "@/components/providers/me-provider";
import { cn, formatCompactID, formatNumberID } from "@/lib/utils";

/** 4 karakter terakhir alamat wallet — bentuk ringkas dipakai di semua layar. */
function walletTail(address?: string | null): string {
  if (!address) return "—";
  return address.slice(-4);
}

/**
 * Satu segmen (Kredit/IDMX/Wallet). Mobile: tanpa kapsul, area sentuh
 * transparan ≥44px di sekitar ikon+angka kecil. Desktop/tablet (md:): jadi
 * bagian dari pill tunggal — padding lega, hover latar surface-warm, sudut
 * membulat hanya di segmen pertama/terakhir.
 */
const SEGMENT_CLASS =
  "flex min-h-11 min-w-11 items-center justify-center gap-1.5 transition-colors " +
  "md:min-h-0 md:min-w-0 md:justify-start md:gap-2 md:px-4 md:py-2 " +
  "md:hover:bg-surface-warm md:first:rounded-l-pill md:last:rounded-r-pill";

function Divider() {
  return (
    <span
      aria-hidden
      className="hidden self-center md:block md:h-[26px] md:w-px md:bg-[rgba(33,28,21,0.10)]"
    />
  );
}

function CreditSegment({ credits }: { credits: number }) {
  return (
    <Link
      href="/premium"
      aria-label={`Saldo Kredit AI: ${credits}`}
      className={SEGMENT_CLASS}
    >
      <Zap
        className="h-4 w-4 shrink-0 fill-gold text-gold"
        aria-hidden
      />
      <span className="tnum text-[13px] font-semibold text-ink">
        {formatNumberID(credits)}
      </span>
      <span className="hidden text-[13px] text-ink-muted md:inline">
        kredit
      </span>
    </Link>
  );
}

function IdmxSegment({ idmx }: { idmx: number }) {
  return (
    <Link
      href="/misi"
      aria-label={`Saldo IDMX: ${idmx}`}
      className={SEGMENT_CLASS}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-gold-light" aria-hidden />
      <span className="tnum text-[13px] font-semibold text-ink">
        {formatCompactID(idmx)}
      </span>
      <span className="hidden text-[13px] text-ink-muted md:inline">
        IDMX
      </span>
    </Link>
  );
}

function DemoWalletSegment() {
  return (
    <span
      aria-label="Wallet mode demo"
      className={cn(SEGMENT_CLASS, "cursor-default")}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-ink-subtle"
        aria-hidden
      />
      <span className="text-[13px] font-semibold text-ink">Demo</span>
    </span>
  );
}

function PrivyWalletSegment() {
  const { ready, authenticated, user } = usePrivy();
  const { start: startLogin, error } = useSafeLogin();

  if (!ready) {
    return (
      <span className="flex min-h-11 min-w-11 items-center justify-center md:min-h-0 md:min-w-0 md:px-4 md:py-2">
        <span className="skeleton h-4 w-10 rounded-pill" />
      </span>
    );
  }
  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={startLogin}
        title={error ?? undefined}
        className={cn(SEGMENT_CLASS, "font-semibold text-gold-deep")}
      >
        <span className="text-[13px]">{error ? "Coba lagi" : "Masuk"}</span>
      </button>
    );
  }

  const address = user?.wallet?.address;
  return (
    <Link
      href="/akun"
      aria-label={`Wallet terhubung, akhiran ${walletTail(address)}`}
      className={SEGMENT_CLASS}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden />
      <span className="tnum text-[13px] font-semibold text-ink">
        {walletTail(address)}
      </span>
    </Link>
  );
}

function WalletSegment() {
  if (!isPrivyConfigured) return <DemoWalletSegment />;
  return <PrivyWalletSegment />;
}

/**
 * Cluster status header — Kredit · IDMX · Wallet — satu komponen dipakai di
 * semua breakpoint. Mobile (<768px): baris ikon+angka polos, tanpa kapsul,
 * tanpa latar/border. Desktop/tablet (md:): satu pill bg-surface dengan
 * pemisah vertikal 1px antar segmen.
 */
export function HeaderStats() {
  const me = useMe();
  const credits = typeof me?.credits === "number" ? me.credits : 10;
  const idmx = typeof me?.idmx === "number" ? me.idmx : 0;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-4",
        "md:h-11 md:items-stretch md:gap-0 md:rounded-pill md:border md:border-[rgba(33,28,21,0.08)] md:bg-surface md:shadow-card",
      )}
    >
      <CreditSegment credits={credits} />
      <Divider />
      <IdmxSegment idmx={idmx} />
      <Divider />
      <WalletSegment />
    </div>
  );
}
