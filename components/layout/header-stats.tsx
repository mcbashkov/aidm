"use client";

import Link from "next/link";
import { Zap, Sparkles } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { isPrivyConfigured } from "@/lib/privy/config";
import { useMe, useSaldoIdmx } from "@/components/providers/me-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { SaldoIdmx } from "@/lib/token/tipe";
import { cn, formatCompactID, formatNumberID } from "@/lib/utils";

/** 4 karakter terakhir alamat wallet — bentuk ringkas dipakai di semua layar. */
function walletTail(address?: string | null): string {
  if (!address) return "—";
  return address.slice(-4);
}

/**
 * Satu segmen (Kredit/IDMX/Wallet). Mobile & tablet (<1024px): tanpa kapsul,
 * area sentuh transparan ≥44px di sekitar ikon+angka kecil. Desktop (lg:,
 * ≥1024px — selaras dengan breakpoint TopNav di AppLayout): jadi bagian dari
 * pill tunggal — padding lega, hover latar surface-warm, sudut membulat
 * hanya di segmen pertama/terakhir.
 */
const SEGMENT_CLASS =
  "flex min-h-11 min-w-11 items-center justify-center gap-1.5 transition-colors " +
  "lg:min-h-0 lg:min-w-0 lg:justify-start lg:gap-2 lg:px-4 lg:py-2 " +
  "lg:hover:bg-surface-warm lg:first:rounded-l-pill lg:last:rounded-r-pill";

function Divider() {
  return (
    <span
      aria-hidden
      className="hidden self-center lg:block lg:h-[26px] lg:w-px lg:bg-[rgba(33,28,21,0.10)]"
    />
  );
}

/**
 * Kredit adalah mata uang di aplikasi ini, jadi ia diperlakukan seperti uang:
 * tidak pernah dirender sebelum nilai aslinya tiba.
 *
 * Sebelumnya baris ini menampilkan `10` sebagai nilai cadangan lalu berganti
 * ke angka sungguhan (terekam: 10→100 di HP, 10→50 di desktop). Itu kelas bug
 * yang persis sama dengan dataset mock yang baru dicabut dari Beranda —
 * menggambar nilai yang belum pasti seolah ia benar.
 */
function CreditSegment({ credits }: { credits: number | null }) {
  const memuat = credits === null;
  return (
    <Link
      href="/premium"
      aria-label={
        memuat ? "Saldo Kredit AI sedang dimuat" : `Saldo Kredit AI: ${credits}`
      }
      className={SEGMENT_CLASS}
    >
      <Zap
        className="h-4 w-4 shrink-0 fill-gold text-gold"
        aria-hidden
      />
      {memuat ? (
        <Skeleton className="h-3.5 w-6" />
      ) : (
        <span className="tnum text-[13px] font-semibold text-ink">
          {formatNumberID(credits)}
        </span>
      )}
      <span className="hidden text-[13px] text-ink-muted lg:inline">
        kredit
      </span>
    </Link>
  );
}

/**
 * Tiga keadaan saldo (lib/token/tipe.ts). Di header yang sempit, "gagal"
 * cukup diwakili "—" dengan penjelasan di `title` dan label aksesibilitas —
 * kalimat penuh "Saldo tidak terbaca" hidup di kartu wallet, tempat ruangnya
 * memang ada. Yang penting sama di kedua tempat: selama memuat tidak ada
 * tuduhan apa pun, hanya shimmer.
 */
function IdmxSegment({ saldo }: { saldo: SaldoIdmx }) {
  const label =
    saldo.keadaan === "terbaca"
      ? `Saldo IDMX: ${saldo.nilai}`
      : saldo.keadaan === "gagal"
        ? "Saldo IDMX tidak terbaca"
        : "Saldo IDMX sedang dimuat";

  return (
    <Link
      href="/misi"
      aria-label={label}
      title={saldo.keadaan === "gagal" ? "Saldo tidak terbaca." : undefined}
      className={SEGMENT_CLASS}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-gold-light" aria-hidden />
      {saldo.keadaan === "memuat" ? (
        <Skeleton className="h-3.5 w-8" />
      ) : (
        <span className="tnum text-[13px] font-semibold text-ink">
          {saldo.keadaan === "terbaca" ? formatCompactID(saldo.nilai) : "—"}
        </span>
      )}
      <span className="hidden text-[13px] text-ink-muted lg:inline">
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

  if (!ready) {
    return (
      <span className="flex min-h-11 min-w-11 items-center justify-center lg:min-h-0 lg:min-w-0 lg:px-4 lg:py-2">
        <span className="skeleton h-4 w-10 rounded-pill" />
      </span>
    );
  }
  if (!authenticated) {
    // Mengarah ke layar /masuk kita sendiri, BUKAN membuka modal Privy.
    // Modal itu berbahasa Inggris dan tidak bisa diterjemahkan (SDK v2.25
    // tidak punya opsi locale sama sekali) — membiarkannya di sini akan
    // membuka pintu belakang ke layar Inggris yang justru sedang dihapus.
    return (
      <Link
        href="/masuk"
        className={cn(SEGMENT_CLASS, "font-semibold text-gold-deep")}
      >
        <span className="text-[13px]">Masuk</span>
      </Link>
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
 * semua breakpoint. Mobile & tablet (<1024px): baris ikon+angka polos, tanpa
 * kapsul, tanpa latar/border. Desktop (lg:, ≥1024px): satu pill bg-surface
 * dengan pemisah vertikal 1px antar segmen.
 */
export function HeaderStats() {
  const me = useMe();
  const saldo = useSaldoIdmx();
  // `null` selama /api/me belum menjawab — bukan angka tebakan. Kalau
  // permintaannya gagal, `me` tetap null dan kredit tetap shimmer; itu jawaban
  // yang jujur, dan sisa layar tidak ikut terpengaruh.
  const credits = typeof me?.credits === "number" ? me.credits : null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-4",
        "lg:h-11 lg:items-stretch lg:gap-0 lg:rounded-pill lg:border lg:border-[rgba(33,28,21,0.08)] lg:bg-surface lg:shadow-card",
      )}
    >
      <CreditSegment credits={credits} />
      <Divider />
      <IdmxSegment saldo={saldo} />
      <Divider />
      <WalletSegment />
    </div>
  );
}
