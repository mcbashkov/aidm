"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther, type Chain } from "viem";
import { useWallets } from "@privy-io/react-auth";
import { X, ArrowDown, CircleAlert, ExternalLink } from "lucide-react";
import { formatNumberID, shortenAddress } from "@/lib/utils";
import { chainDariId } from "@/lib/swap/chains-klien";
import {
  bacaKeadaanKlaim,
  bacaKeadaanSwap,
  kirimSwap,
  publicClient,
  setujuiIdmx,
  type KeadaanKlaim,
  type KeadaanSwap,
} from "@/lib/swap/client";
import type { SwapConfig } from "@/lib/swap/tipe";

interface SwapSheetProps {
  config: SwapConfig;
  address: string;
  onClose: () => void;
  /** Dipanggil setelah burn berhasil, supaya layar induk menyegarkan saldo
   *  dan mulai menunggu voucher. */
  onBerhasil: () => void;
}

type Tahap = "muat" | "isi" | "menyetujui" | "menukar" | "selesai";

/**
 * Lembar Tukar IDMX → IDM Reborn (§9 · mockup docs/mockups/aidm-swap-sheet.html).
 *
 * Bentuknya bottom sheet di mobile dan modal di desktop — satu komponen, beda
 * posisi, karena isinya identik dan menduplikasinya hanya membuat dua tempat
 * untuk lupa memperbarui aturan.
 *
 * SEMUA penolakan ditegakkan kontrak di opBNB sebelum burn (§5). Yang di sini
 * hanya cermin: menonaktifkan tombol lebih awal supaya pengguna tidak membayar
 * gas untuk transaksi yang sudah pasti revert. Jangan pernah membalik
 * hubungannya — layar bukan sumber kebenaran.
 */
export function SwapSheet({
  config,
  address,
  onClose,
  onBerhasil,
}: SwapSheetProps) {
  const { wallets } = useWallets();
  const [tahap, setTahap] = useState<Tahap>("muat");
  const [swap, setSwap] = useState<KeadaanSwap | null>(null);
  const [klaim, setKlaim] = useState<KeadaanKlaim | null>(null);
  const [teks, setTeks] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [txUrl, setTxUrl] = useState<string | null>(null);

  const burnChain = useMemo(
    () => chainDariId(config.burnChainId),
    [config.burnChainId],
  );
  const claimChain = useMemo(
    () => chainDariId(config.claimChainId),
    [config.claimChainId],
  );

  const dompet = useMemo(
    () => wallets.find((w) => w.address.toLowerCase() === address.toLowerCase()),
    [wallets, address],
  );

  /* ── Muat keadaan kontrak ─────────────────────────────────────────────── */

  const muat = useCallback(async () => {
    if (!burnChain || !claimChain) {
      setGalat("Jaringan fitur Tukar tidak dikenali di aplikasi ini.");
      return;
    }
    try {
      const [s, k] = await Promise.all([
        bacaKeadaanSwap(
          burnChain,
          config.idmx,
          config.initiator,
          address as `0x${string}`,
        ),
        bacaKeadaanKlaim(claimChain, config.claim),
      ]);
      setSwap(s);
      setKlaim(k);
      setTahap("isi");
    } catch {
      setGalat("Gagal membaca data dari jaringan. Coba tutup dan buka lagi.");
    }
  }, [burnChain, claimChain, config, address]);

  useEffect(() => {
    void muat();
  }, [muat]);

  /* ── Hitungan ─────────────────────────────────────────────────────────── */

  const jumlahWei = useMemo(() => {
    const bersih = teks.replace(/[^\d]/g, "");
    if (!bersih) return 0n;
    try {
      return parseEther(bersih);
    } catch {
      return 0n;
    }
  }, [teks]);

  // Kurs berjalan searah: `rateIdmxPerIdm` IDMX menghasilkan 1 IDM. Pembagian
  // integer meniru persis yang dilakukan kontrak, supaya pratinjau tidak
  // pernah menjanjikan satu IDM lebih banyak daripada yang benar-benar dibayar.
  const kotor = klaim && klaim.kurs > 0n ? jumlahWei / klaim.kurs : 0n;
  const bersih = klaim && kotor > klaim.fee ? kotor - klaim.fee : 0n;

  const alasan: string | null = (() => {
    if (!swap || !klaim) return "Memuat…";
    if (swap.jeda) return "Fitur Tukar sedang dijeda sementara di jaringan.";
    if (klaim.jeda) return "Kolam klaim di BSC sedang dijeda sementara.";
    if (jumlahWei === 0n) return "Masukkan jumlah IDMX";
    if (jumlahWei < swap.minSwap)
      return `Minimum ${formatNumberID(Number(formatEther(swap.minSwap)))} IDMX`;
    if (jumlahWei > swap.saldoIdmx) return "Saldo IDMX tidak cukup";
    if (jumlahWei > swap.sisaJatahMinggu)
      return `Melebihi jatah minggu ini (sisa ${formatNumberID(Number(formatEther(swap.sisaJatahMinggu)))} IDMX)`;
    if (bersih === 0n) return "Jumlahnya terlalu kecil setelah biaya";
    return null;
  })();

  /* ── Aksi ─────────────────────────────────────────────────────────────── */

  async function konfirmasi() {
    if (!dompet || !swap || !burnChain || alasan) return;
    setGalat(null);
    try {
      const klien = publicClient(burnChain);

      // Izin diberikan HANYA bila kurang. Approve yang tidak perlu adalah
      // tanda tangan tambahan yang membingungkan dan gas yang terbuang.
      if (swap.izin < jumlahWei) {
        setTahap("menyetujui");
        const hash = await setujuiIdmx(
          dompet,
          burnChain,
          config.idmx,
          config.initiator,
          jumlahWei,
        );
        await klien.waitForTransactionReceipt({ hash });
      }

      setTahap("menukar");
      const hash = await kirimSwap(
        dompet,
        burnChain,
        config.initiator,
        jumlahWei,
      );
      const struk = await klien.waitForTransactionReceipt({ hash });
      if (struk.status !== "success") {
        throw new Error("Transaksi ditolak jaringan.");
      }

      const dasar = burnChain.blockExplorers?.default.url;
      setTxUrl(dasar ? `${dasar}/tx/${hash}` : null);
      setTahap("selesai");
      onBerhasil();
    } catch (err) {
      // Penolakan tanda tangan bukan kegagalan sistem — jangan menakuti
      // pengguna dengan pesan galat untuk sesuatu yang memang ia batalkan.
      const pesan = err instanceof Error ? err.message : "";
      const dibatalkan =
        /user rejected|denied|dibatalkan|User rejected the request/i.test(pesan);
      setGalat(
        dibatalkan
          ? null
          : "Tukar gagal dikirim. Saldo IDMX-mu tidak berkurang — coba lagi ya.",
      );
      setTahap("isi");
      void muat();
    }
  }

  /* ── Tampilan ─────────────────────────────────────────────────────────── */

  const sedangJalan = tahap === "menyetujui" || tahap === "menukar";
  const labelTombol =
    tahap === "menyetujui"
      ? "Menunggu izin di dompet…"
      : tahap === "menukar"
        ? "Menukar…"
        : (alasan ?? "Konfirmasi tukar");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Tutup"
        onClick={sedangJalan ? undefined : onClose}
        className="absolute inset-0 bg-[rgba(20,14,6,.55)] backdrop-blur-[1.5px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tukar IDMX ke IDM Reborn"
        className="relative w-full max-w-[420px] rounded-t-[26px] border-t border-wallet-line bg-wallet-card p-5 pb-7 text-wallet-ink shadow-wallet sm:rounded-[22px] sm:border"
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#4A4335] sm:hidden" />

        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-[21px] font-medium text-wallet-ink">
            {tahap === "selesai" ? "Tukar terkirim" : "Tukar IDMX → IDM"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={sedangJalan}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-wallet-muted transition-colors hover:bg-white/5 hover:text-wallet-ink disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {tahap === "selesai" ? (
          <SelesaiPanel txUrl={txUrl} onClose={onClose} />
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-wallet-muted">
              <span>Kamu tukar</span>
              <span className="normal-case tracking-normal">
                Saldo{" "}
                <b className="font-semibold text-[#C3AC69]">
                  {swap
                    ? formatNumberID(Number(formatEther(swap.saldoIdmx)))
                    : "—"}
                </b>{" "}
                IDMX
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-[15px] border border-wallet-line bg-[#100C07] px-4 py-3.5 focus-within:border-[rgba(243,198,74,.26)]">
              <input
                value={teks}
                onChange={(e) => {
                  const angka = e.target.value.replace(/[^\d]/g, "");
                  setTeks(angka ? formatNumberID(Number(angka)) : "");
                }}
                inputMode="numeric"
                placeholder="0"
                disabled={sedangJalan}
                aria-label="Jumlah IDMX"
                className="w-full min-w-0 bg-transparent font-serif text-[30px] font-medium text-wallet-ink outline-none placeholder:text-[#4A4335]"
              />
              <span className="shrink-0 rounded-[9px] border border-[rgba(243,198,74,.26)] px-2.5 py-1.5 text-[12px] font-bold tracking-wide text-[#C3AC69]">
                IDMX
              </span>
            </div>

            {swap ? (
              <div className="mt-3 flex gap-2">
                <Chip
                  label={formatNumberID(Number(formatEther(swap.minSwap)))}
                  onClick={() =>
                    setTeks(formatNumberID(Number(formatEther(swap.minSwap))))
                  }
                  disabled={sedangJalan}
                />
                <Chip
                  label="Maks"
                  onClick={() => {
                    // Maksimum sesungguhnya = yang lebih kecil antara saldo dan
                    // sisa jatah minggu ini. Menawarkan seluruh saldo padahal
                    // jatahnya lebih kecil berarti mengundang penolakan.
                    const maks =
                      swap.saldoIdmx < swap.sisaJatahMinggu
                        ? swap.saldoIdmx
                        : swap.sisaJatahMinggu;
                    setTeks(formatNumberID(Number(formatEther(maks))));
                  }}
                  disabled={sedangJalan}
                />
              </div>
            ) : null}

            <div className="my-4 flex justify-center">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-wallet-line bg-[#141009] text-[#C3AC69]">
                <ArrowDown className="h-4 w-4" aria-hidden />
              </span>
            </div>

            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-wallet-muted">
              Kamu terima
            </div>
            <div className="flex items-baseline gap-2.5 rounded-[15px] border border-wallet-line bg-[#141009] px-4 py-3.5">
              <span className="font-serif text-[34px] font-medium leading-none text-gold-light">
                {formatNumberID(Number(formatEther(bersih)))}
              </span>
              <span className="text-[13px] font-semibold text-wallet-muted">
                IDM Reborn
              </span>
            </div>

            <dl className="mt-5 flex flex-col gap-2.5 border-t border-wallet-line pt-4 text-[13px]">
              <Baris
                k="Kurs"
                v={klaim ? `${klaim.kurs} IDMX = 1 IDM` : "—"}
              />
              <Baris
                k="IDM Reborn (kotor)"
                v={`${formatNumberID(Number(formatEther(kotor)))} IDM`}
                redup
              />
              <Baris
                k="Biaya jaringan"
                v={
                  <>
                    −{klaim ? formatEther(klaim.fee) : "1"} IDM
                    <span className="ml-1.5 text-[11.5px] text-[#6F6656]">
                      seluruhnya dibakar
                    </span>
                  </>
                }
              />
              <Baris
                k="Diterima di"
                v={
                  <span className="inline-flex items-center gap-1.5">
                    {shortenAddress(address)}
                    <span className="rounded-md border border-[rgba(243,198,74,.26)] px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-[#E7C46A]">
                      {claimChain?.name.includes("Testnet") ? "BSC Test" : "BSC"}
                    </span>
                  </span>
                }
              />
            </dl>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[rgba(233,178,74,.22)] bg-[rgba(233,178,74,.07)] px-3.5 py-3">
              <CircleAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-[#E9B24A]"
                aria-hidden
              />
              <p className="text-[12.5px] leading-relaxed text-[#CDBE9A]">
                Menukar membakar IDMX-mu sekarang juga di opBNB. Klaim IDM di
                BSC menyusul sebentar lagi, dan ongkos jaringannya kamu tanggung
                sendiri.
              </p>
            </div>

            {galat ? (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-[rgba(233,178,74,.10)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#E9B24A]"
              >
                {galat}
              </p>
            ) : null}

            <button
              type="button"
              onClick={konfirmasi}
              disabled={!!alasan || sedangJalan || !dompet}
              className="mt-4 w-full rounded-[14px] bg-gold px-4 py-4 text-[15px] font-bold text-[#241B10] transition disabled:cursor-not-allowed disabled:bg-[#3A342A] disabled:text-[#736A58]"
            >
              {labelTombol}
            </button>

            {swap ? (
              <p className="mt-3 text-center text-[11.5px] text-[#6F6656]">
                Minimum {formatNumberID(Number(formatEther(swap.minSwap)))} IDMX
                · sisa jatah minggu ini{" "}
                {formatNumberID(Number(formatEther(swap.sisaJatahMinggu)))} IDMX
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function Chip({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 rounded-[10px] border border-wallet-line py-2 text-[13px] font-semibold text-wallet-muted transition-colors hover:border-[rgba(243,198,74,.26)] hover:text-gold-light disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function Baris({
  k,
  v,
  redup,
}: {
  k: string;
  v: React.ReactNode;
  redup?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-wallet-muted">{k}</dt>
      <dd
        className={
          redup ? "text-wallet-muted" : "font-medium text-[#D9D2C4]"
        }
      >
        {v}
      </dd>
    </div>
  );
}

function SelesaiPanel({
  txUrl,
  onClose,
}: {
  txUrl: string | null;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-relaxed text-[#CDBE9A]">
        IDMX-mu sudah dibakar di opBNB. Dalam waktu sekitar satu menit, voucher
        klaim akan muncul di bawah kartu wallet — dari sana kamu menebusnya jadi
        IDM Reborn di BSC.
      </p>
      <p className="text-[12.5px] leading-relaxed text-wallet-muted">
        Tidak perlu menunggu di layar ini. Voucher tidak bisa hilang: ia terikat
        pada nomor urut transaksimu dan berlaku 30 hari, diperpanjang otomatis
        bila mendekati kedaluwarsa.
      </p>
      {txUrl ? (
        <a
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-gold-light underline-offset-2 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Lihat transaksinya di opBNBScan
        </a>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-[14px] bg-gold px-4 py-3.5 text-[15px] font-bold text-[#241B10]"
      >
        Selesai
      </button>
    </div>
  );
}
