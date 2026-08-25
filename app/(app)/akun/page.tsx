"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { WalletCard } from "@/components/wallet/wallet-card";
import { useSaldoIdmx } from "@/components/providers/me-provider";
import { SwapSheet } from "@/components/wallet/swap-sheet";
import { VoucherPanel } from "@/components/wallet/voucher-panel";
import { SettingsList } from "@/components/account/settings-list";
import { LogoutButton } from "@/components/account/logout-button";
import { DeleteAccount } from "@/components/account/delete-account";
import { earnerLabel } from "@/lib/earner";
import { panggil } from "@/lib/api/panggil";
import { isPrivyConfigured } from "@/lib/privy/config";
import { chainDariId } from "@/lib/swap/chains-klien";
import type { SwapConfig } from "@/lib/swap/tipe";

interface Me {
  authenticated: boolean;
  user?: {
    role?: string;
    earner_type?: string;
    nama_usaha?: string;
    kota?: string;
  } | null;
  wallet?: { address?: string } | null;
}

export default function AkunPage() {
  const [me, setMe] = useState<Me | null>(null);
  // Saldo datang dari jalurnya sendiri (/api/wallet/saldo) — kegagalan RPC
  // tidak boleh ikut mengosongkan nama usaha atau kredit di layar ini.
  const saldo = useSaldoIdmx();
  const [swapConfig, setSwapConfig] = useState<SwapConfig | null>(null);
  const [sheetTerbuka, setSheetTerbuka] = useState(false);
  // Dinaikkan setiap kali burn berhasil — memberi tahu panel voucher bahwa ada
  // sesuatu yang layak ditunggu, sekaligus menyegarkan saldo.
  const [pemicuMuat, setPemicuMuat] = useState(0);

  const muatMe = useCallback(async () => {
    const hasil = await panggil<Me>("/api/me");
    setMe(hasil.ok ? hasil.data : { authenticated: false });
  }, []);

  useEffect(() => {
    void muatMe();
  }, [muatMe, pemicuMuat]);

  useEffect(() => {
    void panggil<SwapConfig>("/api/swap/config").then((h) => {
      if (h.ok && h.data.configured) setSwapConfig(h.data);
    });
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

  const alamat = me?.wallet?.address ?? null;

  // Urutan alasan mengikuti urutan yang bisa diperbaiki pengguna: yang paling
  // bisa ia tindaklanjuti disebut lebih dulu.
  const swapAlasan = !alamat
    ? "Dompet belum siap."
    : !swapConfig
      ? "Fitur Tukar belum aktif di server ini."
      : saldo.keadaan === "memuat"
        ? "Membaca saldo…"
        : saldo.keadaan === "gagal"
          ? "Saldo tidak terbaca. Coba lagi."
          : saldo.nilai === 0
            ? "Belum ada IDMX untuk ditukar. Selesaikan misi dulu ya."
            : null;

  const burnChain = chainDariId(swapConfig?.burnChainId);
  const explorerUrl =
    alamat && burnChain?.blockExplorers?.default.url
      ? `${burnChain.blockExplorers.default.url}/address/${alamat}`
      : null;

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
        address={alamat}
        saldo={saldo}
        swapAlasan={swapAlasan}
        onSwap={() => setSheetTerbuka(true)}
        explorerUrl={explorerUrl}
      />

      {swapConfig && alamat && isPrivyConfigured ? (
        <VoucherPanel
          config={swapConfig}
          address={alamat}
          pemicuMuat={pemicuMuat}
        />
      ) : null}

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
          <SettingsList />
          {/* Hapus akun punya alur konfirmasinya sendiri (§12 hak penghapusan). */}
          <DeleteAccount />
        </div>
      </section>

      <LogoutButton />

      {sheetTerbuka && swapConfig && alamat && isPrivyConfigured ? (
        <SwapSheet
          config={swapConfig}
          address={alamat}
          onClose={() => setSheetTerbuka(false)}
          onBerhasil={() => setPemicuMuat((n) => n + 1)}
        />
      ) : null}
    </div>
  );
}
