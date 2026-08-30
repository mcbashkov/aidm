"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  ArrowLeftRight,
  ExternalLink,
  CircleAlert,
} from "lucide-react";
import { shortenAddress, formatCompactID } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { SaldoIdmx } from "@/lib/token/tipe";

interface WalletCardProps {
  address?: string | null;
  /** Profil belum terbaca dari server — jangan menyatakan apa pun tentang
   *  dompet pengguna sampai jawabannya datang. */
  memuat?: boolean;
  /** Pembacaan profil GAGAL. Berbeda dari `memuat`, dan berbeda dari "tidak
   *  punya dompet": alamatnya ada di database, kita yang tidak berhasil
   *  membacanya. Shimmer selamanya untuk keadaan ini adalah kebohongan diam —
   *  layar mengaku sedang bekerja padahal sudah menyerah. */
  gagalBaca?: boolean;
  onCobaLagi?: () => void;
  /** Tiga keadaan (lib/token/tipe.ts): memuat → shimmer, terbaca → angka,
   *  gagal → "—" + penjelasan. Menyamakan "belum dimuat" dengan "tidak bisa
   *  dibaca" pernah membuat pesan kegagalan terbaca padahal fetch-nya masih
   *  berjalan. */
  saldo: SaldoIdmx;
  /** Alasan tombol Tukar nonaktif; `null` = boleh ditekan. */
  swapAlasan?: string | null;
  onSwap?: () => void;
  explorerUrl?: string | null;
}

/**
 * Kartu wallet gelap-emas (§7.9 / §9 / §13).
 *
 * Hanya IDMX yang ditampilkan. IDM Reborn TIDAK punya kotak di sini karena ia
 * hidup di BSC dan tidak pernah menyentuh opBNB (Opsi B §9) — menampilkan
 * saldo yang tidak berada di jaringan kartu ini hanya menimbulkan pertanyaan
 * "kenapa nol" yang jawabannya panjang dan tidak berguna.
 *
 * Tombol "Hubungkan Wallet" juga dihapus: setiap akun SUDAH punya dompet
 * bawaan sejak login (§7.1), jadi tombol itu menawarkan sesuatu yang bukan
 * kebutuhan pengguna dan menyiratkan dompetnya belum siap. Penggantinya
 * indikator "Dompet bawaan · aktif".
 */
export function WalletCard({
  address,
  memuat = false,
  gagalBaca = false,
  onCobaLagi,
  saldo,
  swapAlasan = null,
  onSwap,
  explorerUrl,
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

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[12px] font-medium text-wallet-muted">
            Wallet AIDM
          </span>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {memuat ? (
              // Alamat DAN status ditahan bersama: "Dompet bawaan · aktif"
              // adalah klaim tentang dompet pengguna, dan ia tidak boleh
              // diucapkan sebelum alamatnya benar-benar terbaca.
              <Skeleton className="h-5 w-52 bg-white/15" />
            ) : gagalBaca ? (
              // Mengaku, lalu memberi jalan keluar. Yang dilarang di sini
              // bukan menampilkan kegagalan — melainkan menyembunyikannya di
              // balik animasi memuat yang tidak pernah berakhir.
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-wallet-muted">
                Alamat dompet belum terbaca.
                {onCobaLagi ? (
                  <button
                    type="button"
                    onClick={onCobaLagi}
                    className="font-semibold text-gold underline-offset-2 hover:underline"
                  >
                    Coba lagi
                  </button>
                ) : null}
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-2 text-[14px] font-medium tracking-wide"
                >
                  <span className="tnum">{shortenAddress(address)}</span>
                  {copied ? (
                    <Check className="h-4 w-4 text-gold" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4 text-wallet-muted" aria-hidden />
                  )}
                </button>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-wallet-muted">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-[#5FBF8A]"
                    aria-hidden
                  />
                  Dompet bawaan · aktif
                </span>
              </>
            )}
          </div>
        </div>
        <span className="shrink-0 rounded-pill border border-wallet-line px-2 py-0.5 text-[11px] font-semibold text-wallet-muted">
          opBNB
        </span>
      </div>

      {/* Dua zona di layar lebar (saldo kiri / aksi kanan), menumpuk di mobile
          — mengikuti mockup docs/mockups/aidm-wallet-card.html. */}
      <div className="relative mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-wallet-muted">
            Saldo IDMX
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            {saldo.keadaan === "memuat" ? (
              <Skeleton className="h-[34px] w-32" />
            ) : (
              <span className="num-display text-[34px] leading-none text-gold-light">
                {saldo.keadaan === "terbaca" ? formatCompactID(saldo.nilai) : "—"}
              </span>
            )}
            <span className="text-[13px] font-semibold text-wallet-muted">
              IDMX
            </span>
          </div>
          {/* Penjelasan kegagalan HANYA setelah permintaan benar-benar selesai
              dan gagal. Selama memuat, baris ini tetap kalimat biasa — layar
              tidak boleh menuduh jaringan saat dirinya sendiri belum selesai. */}
          <p className="mt-2 max-w-[34ch] text-[12.5px] leading-relaxed text-wallet-muted">
            {saldo.keadaan === "gagal"
              ? "Saldo tidak terbaca. Coba lagi."
              : "Terkumpul dari misi harian. Tukar ke IDM Reborn kapan pun kamu siap."}
          </p>
        </div>

        <div className="sm:min-w-[220px] sm:border-l sm:border-wallet-line sm:pl-6">
          <button
            type="button"
            onClick={onSwap}
            disabled={!!swapAlasan}
            title={swapAlasan ?? undefined}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-pill bg-gold-gradient px-5 text-[13px] font-semibold text-cta disabled:cursor-not-allowed disabled:bg-none disabled:bg-wallet-line disabled:text-wallet-muted"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden />
            Tukar IDMX → IDM
          </button>

          {swapAlasan ? (
            <p className="mt-2 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-wallet-muted">
              <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
              {swapAlasan}
            </p>
          ) : (
            <p className="mt-2 text-[11.5px] leading-relaxed text-wallet-muted">
              Klaim <b className="font-semibold">IDM Reborn</b> ke wallet-mu di
              BSC. Ongkos jaringan BSC kamu tanggung sendiri.
            </p>
          )}

          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-wallet-muted underline-offset-2 hover:underline"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              Lihat di opBNBScan
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
