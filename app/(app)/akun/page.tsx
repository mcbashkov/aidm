"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Bell,
  Shield,
  KeyRound,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { WalletCard } from "@/components/wallet/wallet-card";
import { LogoutButton } from "@/components/account/logout-button";
import { DeleteAccount } from "@/components/account/delete-account";
import { earnerLabel } from "@/lib/earner";

interface Me {
  authenticated: boolean;
  user?: {
    role?: string;
    earner_type?: string;
    nama_usaha?: string;
    kota?: string;
  } | null;
  wallet?: { address?: string } | null;
  idmx?: number;
  idm?: number;
}

const SETTINGS = [
  { icon: MessageSquare, label: "Gaya bahasa jawaban AI" },
  { icon: Bell, label: "Notifikasi" },
  { icon: Shield, label: "Kebijakan privasi (UU PDP)" },
  { icon: KeyRound, label: "Ekspor wallet" },
];

export default function AkunPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: Me) => setMe(d))
      .catch(() => setMe({ authenticated: false }));
  }, []);

  const kota = me?.user?.kota;
  const namaUsaha = me?.user?.nama_usaha;
  // v3.0: identitas pengguna dibaca dari earner_type (§7.1); `role` lama hanya
  // dipakai sebagai cadangan untuk akun yang dibuat sebelum pivot.
  const peranLabel = me?.user?.earner_type
    ? earnerLabel(me.user.earner_type)
    : me?.user?.role
      ? "Pemilik usaha"
      : "Mode demo";

  return (
    <div className="space-y-section">
      <header>
        <h1>{namaUsaha || "Akun"}</h1>
        <p className="mt-1 text-[13px] text-ink-subtle">
          {peranLabel}
          {kota ? ` · ${kota}` : ""}
        </p>
      </header>

      <WalletCard
        address={me?.wallet?.address ?? null}
        idmx={me?.idmx ?? 0}
        idm={me?.idm ?? 0}
      />

      {/* Pintu masuk fitur premium — bukan bottom-nav lagi (§7.8 / §13 #10) */}
      <Link
        href="/premium"
        className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-float"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-tint">
          <Sparkles className="h-6 w-6 text-gold-deep" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block font-serif text-card-title font-semibold text-ink">
            Fitur premium
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
            Riset tren, peluang usaha, dan generator konten.
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
      </Link>

      <section className="space-y-2">
        <h2 className="px-1">Pengaturan</h2>
        <div className="card overflow-hidden divide-y divide-line p-0">
          {SETTINGS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors active:bg-surface-warm"
            >
              <Icon className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
              <span className="flex-1 text-[14px] text-ink">{label}</span>
              <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
            </button>
          ))}
          {/* Hapus akun punya alur konfirmasinya sendiri (§12 hak penghapusan). */}
          <DeleteAccount />
        </div>
      </section>

      <LogoutButton />
    </div>
  );
}
