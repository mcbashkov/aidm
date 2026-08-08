"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Bell,
  Shield,
  KeyRound,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { WalletCard } from "@/components/wallet/wallet-card";
import { LogoutButton } from "@/components/account/logout-button";
import { cn } from "@/lib/utils";

interface Me {
  authenticated: boolean;
  user?: { role?: string; kota?: string } | null;
  wallet?: { address?: string } | null;
  idmx?: number;
  idm?: number;
}

const SETTINGS = [
  { icon: MessageSquare, label: "Gaya bahasa jawaban AI" },
  { icon: Bell, label: "Notifikasi" },
  { icon: Shield, label: "Kebijakan privasi (UU PDP)" },
  { icon: KeyRound, label: "Ekspor wallet" },
  { icon: Trash2, label: "Hapus akun", danger: true },
];

export default function AkunPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: Me) => setMe(d))
      .catch(() => setMe({ authenticated: false }));
  }, []);

  const role = me?.user?.role;
  const kota = me?.user?.kota;
  const roleLabel = role
    ? role === "umkm"
      ? "Pemilik UMKM"
      : "Calon wirausaha"
    : "Mode demo";

  return (
    <div className="space-y-section">
      <header>
        <h1>Akun</h1>
        <p className="mt-1 text-[13px] text-ink-subtle">
          {roleLabel}
          {kota ? ` · ${kota}` : ""}
        </p>
      </header>

      <WalletCard
        address={me?.wallet?.address ?? null}
        idmx={me?.idmx ?? 0}
        idm={me?.idm ?? 0}
      />

      <section className="space-y-2">
        <h2 className="px-1">Pengaturan</h2>
        <div className="card overflow-hidden divide-y divide-line p-0">
          {SETTINGS.map(({ icon: Icon, label, danger }) => (
            <button
              key={label}
              type="button"
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors active:bg-surface-warm"
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  danger ? "text-danger" : "text-ink-subtle",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "flex-1 text-[14px]",
                  danger ? "text-danger" : "text-ink",
                )}
              >
                {label}
              </span>
              <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
            </button>
          ))}
        </div>
      </section>

      <LogoutButton />
    </div>
  );
}
