"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { daftarBerkas, urlUnduhBerkas, type BerkasItem } from "@/lib/berkas/client";
import { labelRentang, labelStatusBerkas } from "@/lib/berkas/label";

/**
 * Daftar Berkas Pengajuan + unduh ulang (Batch 5, §1.3 poin 5 — versi
 * sederhana; Batch 6 merapikan kartu "Langganan & berkas"). Tidak dirender
 * bila belum ada dokumen, di mode demo, atau saat gagal dibaca: Akun tidak
 * perlu satu kartu kosong lagi.
 */
export function BerkasList() {
  const [items, setItems] = useState<BerkasItem[] | null>(null);
  useEffect(() => {
    void (async () => {
      const res = await daftarBerkas();
      setItems(res.ok ? res.data.items : []);
    })();
  }, []);
  if (!items || items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="px-1">Berkas Pengajuan</h2>
      <div className="card divide-y divide-line overflow-hidden">
        {items.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-5 py-4">
            <FileText className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-ink">{b.label}</p>
              <p className="truncate text-[12px] text-ink-subtle">
                {labelRentang(b.periodeAwal, b.periodeAkhir)} · {b.nomorDokumen} · {labelStatusBerkas(b.status)}
              </p>
            </div>
            {b.bisaUnduh ? (
              <a
                href={urlUnduhBerkas(b.id)}
                target="_blank"
                rel="noreferrer"
                className="tap shrink-0 rounded-pill bg-surface-warm px-3.5 text-[12px] font-semibold text-ink"
              >
                Unduh
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
