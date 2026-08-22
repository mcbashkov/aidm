"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { ExternalLink, Loader2 } from "lucide-react";
import { panggil } from "@/lib/api/panggil";
import { formatNumberID } from "@/lib/utils";
import { chainDariId } from "@/lib/swap/chains-klien";
import { klaimVoucher, publicClient } from "@/lib/swap/client";
import type { SwapConfig, SwapVoucherKlien } from "@/lib/swap/tipe";

interface VoucherPanelProps {
  config: SwapConfig;
  address: string;
  /** Dinaikkan induk setelah burn baru, supaya panel mulai menjaring voucher
   *  yang belum ada saat halaman dimuat. */
  pemicuMuat: number;
}

/**
 * Langkah kedua alur Tukar: menebus voucher jadi IDM Reborn di BSC (§9).
 *
 * Panel ini muncul HANYA bila ada voucher — pengguna yang belum pernah menukar
 * tidak perlu melihat kotak kosong yang menjelaskan sesuatu yang belum ia
 * lakukan.
 *
 * Setelah burn, voucher belum langsung ada: relayer memindai rantai tiap menit
 * dan menunggu 15 konfirmasi. Jeda itu ditampilkan apa adanya sebagai
 * "Diproses", bukan disembunyikan di balik pemuat yang berputar tanpa ujung.
 */
export function VoucherPanel({
  config,
  address,
  pemicuMuat,
}: VoucherPanelProps) {
  const { wallets } = useWallets();
  const [vouchers, setVouchers] = useState<SwapVoucherKlien[] | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const claimChain = useMemo(
    () => chainDariId(config.claimChainId),
    [config.claimChainId],
  );
  const dompet = useMemo(
    () => wallets.find((w) => w.address.toLowerCase() === address.toLowerCase()),
    [wallets, address],
  );

  const muat = useCallback(async () => {
    const hasil = await panggil<{ vouchers: SwapVoucherKlien[] }>(
      "/api/swap/vouchers",
    );
    if (hasil.ok) setVouchers(hasil.data.vouchers);
    else if (hasil.demo) setVouchers([]);
  }, []);

  useEffect(() => {
    void muat();
  }, [muat, pemicuMuat]);

  // Menunggu voucher yang sedang diproses relayer. Berhenti sendiri begitu
  // tidak ada lagi yang ditunggu — polling abadi membebani server tanpa alasan.
  const adaYangDitunggu = vouchers !== null && vouchers.length === 0;
  useEffect(() => {
    if (!adaYangDitunggu || pemicuMuat === 0) return;
    const id = setInterval(() => void muat(), 20_000);
    return () => clearInterval(id);
  }, [adaYangDitunggu, pemicuMuat, muat]);

  async function klaim(v: SwapVoucherKlien) {
    if (!dompet || !claimChain) return;
    setGalat(null);
    setSibuk(v.nonce);
    try {
      const hash = await klaimVoucher(
        dompet,
        claimChain,
        config.claim,
        {
          user: v.user,
          idmxBurned: v.idmxBurned,
          nonce: v.nonce,
          deadline: v.deadline,
        },
        v.signature,
      );
      const struk = await publicClient(claimChain).waitForTransactionReceipt({
        hash,
      });
      if (struk.status !== "success") throw new Error("revert");
      await muat();
    } catch (err) {
      const pesan = err instanceof Error ? err.message : "";
      const dibatalkan = /user rejected|denied|dibatalkan/i.test(pesan);
      const kurangGas = /insufficient funds/i.test(pesan);
      setGalat(
        dibatalkan
          ? null
          : kurangGas
            ? "BNB di dompetmu belum cukup untuk ongkos jaringan BSC. Isi sedikit BNB, lalu klaim lagi — vouchernya tetap aman."
            : "Klaim gagal. Vouchermu masih utuh dan bisa dicoba lagi.",
      );
    } finally {
      setSibuk(null);
    }
  }

  if (vouchers === null) return null;

  const belumDitebus = vouchers.filter((v) => v.status === "signed");
  const sudah = vouchers.filter((v) => v.status === "claimed");
  const menunggu = vouchers.length === 0 && pemicuMuat > 0;

  if (!menunggu && vouchers.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="px-1">Tukar berjalan</h2>

      {menunggu ? (
        <div className="card flex items-start gap-3 p-5">
          <Loader2
            className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-ink-subtle"
            aria-hidden
          />
          <div>
            <p className="text-[14px] font-medium text-ink">Diproses</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
              IDMX-mu sudah terbakar. Voucher klaim biasanya siap dalam satu
              menit — layar ini menyegarkan sendiri.
            </p>
          </div>
        </div>
      ) : null}

      {belumDitebus.length > 0 ? (
        <div className="card divide-y divide-line p-0">
          {belumDitebus.map((v) => (
            <div key={v.nonce} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-medium text-ink">
                    Siap diklaim
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    dari {formatNumberID(v.idmx)} IDMX yang kamu bakar
                  </p>
                </div>
                <a
                  href={v.burnTxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] text-ink-subtle underline-offset-2 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  Bukti burn
                </a>
              </div>
              <button
                type="button"
                onClick={() => klaim(v)}
                disabled={sibuk !== null || !dompet}
                className="btn-primary w-full disabled:opacity-60"
              >
                {sibuk === v.nonce ? "Mengklaim…" : "Klaim IDM di BSC"}
              </button>
              <p className="text-[11.5px] leading-relaxed text-ink-subtle">
                Ongkos jaringan BSC kamu tanggung sendiri. Berlaku sampai{" "}
                {new Date(v.deadlineIso).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                })}
                , diperpanjang otomatis bila belum ditebus.
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {galat ? (
        <p
          role="alert"
          className="rounded-card bg-gold-tint px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted"
        >
          {galat}
        </p>
      ) : null}

      {sudah.length > 0 ? (
        <div className="card divide-y divide-line p-0">
          {sudah.slice(0, 5).map((v) => (
            <div
              key={v.nonce}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <span className="text-[13px] text-ink-muted">
                Selesai · {formatNumberID(v.idmx)} IDMX ditukar
              </span>
              {v.claimTxUrl ? (
                <a
                  href={v.claimTxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] text-ink-subtle underline-offset-2 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  BscScan
                </a>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
