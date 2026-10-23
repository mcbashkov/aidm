"use client";

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { useKueri } from "@/components/providers/kueri-provider";
import { panggil, type ApiHasil } from "@/lib/api/panggil";
import { premiumAktif, sisaHari, type Langganan } from "@/lib/langganan";

async function ambil(): Promise<ApiHasil<Langganan | null>> {
  const r = await panggil<{ langganan: Langganan }>("/api/langganan");
  if (r.ok) return { ok: true, data: r.data.langganan };
  // Kartu ini hanya pintu: gagal/demo/belum masuk → tetap tampil sebagai
  // tautan ke katalog, tanpa pernyataan apa pun tentang status langganan.
  return { ok: true, data: null };
}

/**
 * Pintu ke katalog /premium dari Beranda. /premium bukan tab, dan sebelumnya
 * satu-satunya jalan tetap ke sana lewat Akun; kartu ini membuatnya terlihat
 * tanpa menambah tab. Status hanya ditulis bila server memastikannya.
 */
export function KartuPremium() {
  const k = useKueri<Langganan | null>("langganan", ambil);
  const l = k.keadaan === "terbaca" ? k.data : null;
  const sisa = sisaHari(l);

  const judul = !l
    ? "AIDM Plus"
    : l.status === "masa_coba"
      ? `Masa coba Plus · sisa ${sisa ?? 0} hari`
      : premiumAktif(l)
        ? `AIDM Plus aktif · ${sisa ?? 0} hari lagi`
        : "AIDM Plus";

  return (
    <Link
      href="/premium"
      className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-float"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold-tint">
        <Sparkles className="h-5 w-5 text-gold-deep" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink">{judul}</span>
        <span className="mt-0.5 block text-[12px] text-ink-subtle">
          Berkas Pengajuan, Paket Pajak, Riset & Konten
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
    </Link>
  );
}
