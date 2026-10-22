"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { WalletCard } from "@/components/wallet/wallet-card";
import { useMeKeadaan, useSaldoIdmx } from "@/components/providers/me-provider";
import { SwapSheet } from "@/components/wallet/swap-sheet";
import { VoucherPanel } from "@/components/wallet/voucher-panel";
import { SettingsList } from "@/components/account/settings-list";
import { LogoutButton } from "@/components/account/logout-button";
import { DeleteAccount } from "@/components/account/delete-account";
import { LanggananBerkas } from "@/components/account/langganan-berkas";
import { earnerLabel } from "@/lib/earner";
import { panggil } from "@/lib/api/panggil";
import { isPrivyConfigured } from "@/lib/privy/config";
import { chainDariId } from "@/lib/swap/chains-klien";
import type { SwapConfig } from "@/lib/swap/tipe";
import { Skeleton } from "@/components/ui/skeleton";


export default function AkunPage() {
  // Identitas dari cache bersama (KueriProvider). TIGA keadaan, bukan dua:
  // "belum terbaca" dan "gagal dibaca" adalah hal berbeda, dan layar ini dulu
  // menyamakan keduanya lewat `me === null` — itu yang membuat kartu Wallet
  // menampilkan "Menyiapkan…" tanpa akhir saat satu permintaan tersendat.
  const meK = useMeKeadaan();
  const me = meK.keadaan === "terbaca" ? meK.data : null;
  // Saldo datang dari jalurnya sendiri (/api/wallet/saldo) — kegagalan RPC
  // tidak boleh ikut mengosongkan nama usaha atau status langganan di layar ini.
  const saldo = useSaldoIdmx();
  const [swapConfig, setSwapConfig] = useState<SwapConfig | null>(null);
  const [sheetTerbuka, setSheetTerbuka] = useState(false);
  // Dinaikkan setiap kali burn berhasil — memberi tahu panel voucher bahwa ada
  // sesuatu yang layak ditunggu, sekaligus menyegarkan saldo.
  const [pemicuMuat, setPemicuMuat] = useState(0);

  // Setelah burn berhasil, identitas dibaca ulang lewat cache yang sama —
  // bukan lewat permintaan kedua yang tidak diketahui layar lain.
  const muatUlangMe = meK.keadaan === "memuat" ? null : meK.muatUlang;
  useEffect(() => {
    if (pemicuMuat > 0) muatUlangMe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pemicuMuat]);

  useEffect(() => {
    void panggil<SwapConfig>("/api/swap/config").then((h) => {
      if (h.ok && h.data.configured) setSwapConfig(h.data);
    });
  }, []);

  // `me === null` berarti BELUM TERBACA, bukan "tidak ada". Membedakan
  // keduanya adalah seluruh isi P0-1: layar ini dulu menuliskan "Mode demo"
  // dan "Dompet belum siap" pada render pertama SETIAP kali halaman dibuka —
  // dua pernyataan tentang akun pengguna yang diucapkan sebelum satu byte pun
  // datang dari server, lalu diralat sendiri sedetik kemudian.
  const memuat = meK.keadaan === "memuat";
  const gagalBaca = meK.keadaan === "gagal";
  const kota = me?.user?.kota;
  const namaUsaha = me?.user?.nama_usaha;
  // v3.0: identitas pengguna dibaca dari earner_type (§7.1); `role` lama hanya
  // dipakai sebagai cadangan untuk akun yang dibuat sebelum pivot.
  // "Mode demo" DICABUT dari sini (2026-09-08). Label itu melayani dua keadaan
  // yang sama sekali berbeda — pengguna sungguhan yang profilnya belum diisi,
  // dan pembacaan yang gagal — lalu mengucapkan kalimat yang hanya benar untuk
  // keadaan ketiga (server tanpa kredensial) pada keduanya. P2-5 menutup kasus
  // MEMUAT tapi meninggalkan kasus PROFIL KOSONG, dan kasus itulah yang dilihat
  // setiap akun baru: kalimat pertama yang dibaca pengguna tentang akunnya
  // sendiri adalah pernyataan bahwa akunnya tidak nyata.
  //
  // Gagal baca sengaja TIDAK punya label di sini. Kartu dompet di bawah sudah
  // mengatakannya sekali berikut tombol Coba lagi; mengulanginya di header
  // berarti satu kegagalan diumumkan dua kali dengan kalimat berbeda.
  const peranLabel = memuat || gagalBaca
    ? null
    : me?.user?.earner_type
      ? earnerLabel(me.user.earner_type)
      : me?.user?.role
        ? "Pemilik usaha"
        : "Profil belum lengkap";

  const alamat = me?.wallet?.address ?? null;

  // Urutan alasan mengikuti urutan yang bisa diperbaiki pengguna: yang paling
  // bisa ia tindaklanjuti disebut lebih dulu.
  const swapAlasan = memuat
    ? "Menyiapkan…"
    : gagalBaca
      // BUKAN "Dompet belum siap." Dompetnya siap — alamatnya ada di database;
      // yang gagal adalah pembacaan kita. Menyalahkan dompet pengguna untuk
      // kegagalan kita adalah kegagalan yang menyamar, kelas P0-1 yang sama.
      ? "Datamu belum terbaca. Coba lagi."
      : !alamat
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
        {/* Skeleton hanya untuk MEMUAT. Sebelumnya setiap `peranLabel` kosong
            digambar sebagai skeleton, sehingga pembacaan yang gagal tampil
            sebagai shimmer yang berkedip selamanya — "memuat" yang tidak
            pernah selesai, kelas bug yang sama dengan "Menyiapkan…" tanpa
            akhir yang sudah dicabut di §7c. */}
        {memuat ? (
          <Skeleton className="mt-1.5 h-4 w-40" />
        ) : peranLabel ? (
          <p className="mt-1 text-[13px] text-ink-subtle">
            {peranLabel}
            {kota ? ` · ${kota}` : ""}
          </p>
        ) : null}
      </header>

      <WalletCard
        memuat={memuat}
        gagalBaca={gagalBaca}
        onCobaLagi={muatUlangMe ?? undefined}
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

      {/* Langganan & berkas (§1.3 poin 5) — bukan lagi pintu penjualan utama;
          pintu utama ada di Laporan. */}
      <LanggananBerkas />

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
