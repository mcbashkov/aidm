"use client";

import { useState } from "react";
import { Copy, Check, ArrowLeftRight, Link2, ExternalLink } from "lucide-react";
import { shortenAddress, formatCompactID } from "@/lib/utils";

interface WalletCardProps {
  address?: string | null;
  idmx?: number;
  idm?: number;
  externalLinked?: boolean;
}

/** Kartu wallet gelap-emas premium — aksen Web3 (§7.9 / §9.9 / §13). */
export function WalletCard({
  address,
  idmx = 0,
  idm = 0,
  externalLinked = false,
}: WalletCardProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* abaikan */
    }
  }

  return (
    <div className="relative overflow-hidden rounded-card bg-wallet-gradient p-5 text-wallet-ink shadow-wallet">
      {/* aksen cahaya emas */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20 blur-2xl"
        style={{ background: "var(--gold)" }}
        aria-hidden
      />

      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-wallet-muted">
          Wallet AIDM
        </span>
        <span className="rounded-pill border border-wallet-line px-2 py-0.5 text-[11px] font-semibold text-wallet-muted">
          opBNB
        </span>
      </div>

      <button
        type="button"
        onClick={copy}
        className="mt-1.5 flex items-center gap-2 text-[14px] font-medium tracking-wide"
      >
        <span className="tnum">{shortenAddress(address)}</span>
        {copied ? (
          <Check className="h-4 w-4 text-gold" aria-hidden />
        ) : (
          <Copy className="h-4 w-4 text-wallet-muted" aria-hidden />
        )}
      </button>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-wallet-line p-3">
          <p className="text-[11px] text-wallet-muted">Saldo IDMX</p>
          <p className="num-display mt-1 text-[24px] text-gold-light">
            {formatCompactID(idmx)}
          </p>
        </div>
        <div className="rounded-2xl border border-wallet-line p-3">
          <p className="text-[11px] text-wallet-muted">IDM Reborn</p>
          <p className="num-display mt-1 text-[24px] text-gold-light">
            {formatCompactID(idm)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          title="Aktif setelah kontrak di testnet (M4)"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-pill bg-gold-gradient px-5 text-[13px] font-semibold text-cta"
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden />
          Tukar IDMX → IDM
        </button>
        <button
          type="button"
          title="Aktif di M5 (WalletConnect)"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-pill border border-wallet-line px-5 text-[13px] font-medium text-wallet-ink"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          {externalLinked ? "Wallet tertaut" : "Hubungkan Wallet"}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1 text-[11px] text-wallet-muted">
        <ExternalLink className="h-3 w-3" aria-hidden />
        Lihat di opBNBScan · Ekspor wallet (menu lanjutan)
      </div>
    </div>
  );
}
