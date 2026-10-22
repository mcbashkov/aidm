"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { useKueri } from "@/components/providers/kueri-provider";
import { ambilPajak, type PajakResponse } from "@/lib/pajak/client";
import { formatRp } from "@/lib/pajak/hitung";
import { labelBulan } from "@/lib/berkas/label";
import type { ApiHasil } from "@/lib/api/panggil";

async function ambil(): Promise<ApiHasil<PajakResponse | null>> {
  const r = await ambilPajak();
  if (r.ok) return r;
  if (r.demo || r.status === 401) return { ok: true, data: null };
  return r;
}

/**
 * Pengingat setoran PPh Final di Beranda (Batch 9): tampil tanggal 1–15 hanya
 * bila pengguna menandai diri wajib pajak OP, punya Paket Pajak/Plus, dan
 * bulan lalu ada setoran. In-app saja — infrastruktur push belum ada.
 */
export function PengingatPajak() {
  const k = useKueri<PajakResponse | null>("pajak", ambil);
  const data = k.keadaan === "terbaca" ? k.data : null;
  const p = data?.pengingat;
  if (!p) return null;
  return (
    <Link href="/laporan#pajak" className="card flex items-start gap-3 p-4 transition-shadow hover:shadow-float">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gold-tint">
        <CalendarClock className="h-5 w-5 text-gold-deep" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink">
        Setoran PPh Final bulan {labelBulan(p.bulanPajak)}: <b className="tnum">{formatRp(p.setoran)}</b>, paling lambat tanggal 15
        {p.sisaHari === 0 ? " — hari ini." : ` (${p.sisaHari} hari lagi).`}
        <span className="block text-[11.5px] text-ink-subtle">Bukan nasihat pajak. Cocokkan dengan Coretax atau konsultan pajak.</span>
      </span>
    </Link>
  );
}
