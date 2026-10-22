"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { ambilPajak, urlUnduhDokumenPajak } from "@/lib/pajak/client";
import type { DokumenPajakKlien } from "@/lib/pajak/server";

/**
 * Daftar dokumen pajak di Akun → "Langganan & berkas" (Batch 9). Rincian bisa
 * diunduh ulang; Surat Pernyataan tidak disimpan (memuat NPWP) — barisnya
 * tetap tampil dengan nomor dokumen supaya pengguna tahu pernah membuatnya.
 * Kosong → tidak merender apa pun.
 */
export function DokumenPajakList() {
  const [items, setItems] = useState<DokumenPajakKlien[]>([]);

  useEffect(() => {
    void ambilPajak().then((r) => {
      if (r.ok) setItems(r.data.dokumen);
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-line">
      {items.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-[13px]">
          <FileText className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-ink">{d.label}</span>
            <span className="block text-[12px] text-ink-subtle">{d.nomorDokumen}</span>
          </span>
          {d.bisaUnduh ? (
            <a href={urlUnduhDokumenPajak(d.id)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-gold-deep">
              <Download className="h-3.5 w-3.5" aria-hidden /> Unduh
            </a>
          ) : (
            <span className="shrink-0 text-[12px] text-ink-subtle">tidak disimpan</span>
          )}
        </li>
      ))}
    </ul>
  );
}
