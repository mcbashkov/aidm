"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { premiumAktif, sisaHari, type Langganan } from "@/lib/langganan";
import { KATALOG, formatHargaIdr, kodeProdukSah } from "@/lib/langganan/katalog";
import { BerkasList } from "@/components/account/berkas-list";

interface Riwayat {
  kode: string | null;
  hargaIdr: number;
  periodeHari: number;
  paidAt: string | null;
}

function namaProduk(kode: string | null, periodeHari: number): string {
  if (kodeProdukSah(kode)) return KATALOG[kode].nama;
  return `Premium ${periodeHari} hari`;
}

function tanggal(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * "Langganan & berkas" (§1.3 poin 5) menggantikan kartu "Fitur premium":
 * status Plus/masa coba, daftar Berkas Pengajuan (unduh ulang), riwayat
 * pembelian, tautan ke /premium. Bukan lagi pintu penjualan utama — pintu
 * utama ada di Laporan. Demo/gagal → hanya tautan ke /premium.
 */
export function LanggananBerkas() {
  const [langganan, setLangganan] = useState<Langganan | null>(null);
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [terbaca, setTerbaca] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/langganan", { cache: "no-store" });
        if (res.ok) {
          const body = (await res.json()) as { langganan: Langganan; riwayat?: Riwayat[] };
          setLangganan(body.langganan);
          setRiwayat(body.riwayat ?? []);
        }
      } catch {
        /* tautan ke /premium tetap tampil */
      }
      setTerbaca(true);
    })();
  }, []);

  const aktif = premiumAktif(langganan);
  const sisa = sisaHari(langganan);
  const status = !terbaca
    ? "Memuat…"
    : !langganan
      ? "Lihat paket & harga"
      : langganan.status === "masa_coba"
        ? `Masa coba Plus · sisa ${sisa ?? 0} hari`
        : aktif
          ? `AIDM Plus aktif · ${sisa ?? 0} hari lagi`
          : "Belum berlangganan Plus";

  return (
    <section className="space-y-2">
      <h2 className="px-1">Langganan & berkas</h2>
      <div className="card divide-y divide-line overflow-hidden">
        <Link href="/premium" className="flex items-center gap-4 px-5 py-4 transition-colors active:bg-surface-warm">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold-tint">
            <Sparkles className="h-5 w-5 text-gold-deep" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] text-ink">{status}</span>
            <span className="mt-0.5 block text-[12px] text-ink-subtle">
              Berkas Pengajuan, Plus setahun, Riset & Konten
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
        </Link>
        {riwayat.length > 0 ? (
          <div className="px-5 py-3">
            <p className="mb-1.5 text-[12px] font-semibold text-ink-subtle">Riwayat pembelian</p>
            <ul className="space-y-1">
              {riwayat.map((r, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate text-ink">{namaProduk(r.kode, r.periodeHari)}</span>
                  <span className="tnum shrink-0 text-ink-muted">{formatHargaIdr(r.hargaIdr)} · {tanggal(r.paidAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <BerkasList />
    </section>
  );
}
