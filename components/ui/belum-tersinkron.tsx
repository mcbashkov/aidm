import { CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Penanda halus: yang tampil adalah salinan terakhir yang berhasil dibaca,
 * dan pembacaan terbaru gagal.
 *
 * Sengaja TIDAK berbentuk peringatan merah. Datanya benar — ia hanya belum
 * tentu terbaru, dan itu milik pengguna sendiri. Membuatnya tampak seperti
 * galat akan membuat orang mengira catatannya rusak, padahal yang rusak
 * jaringannya. Sengaja juga TIDAK bisa disembunyikan: layar yang menahan data
 * lama tanpa mengatakannya adalah persis pola yang dilarang di
 * lib/api/keadaan.ts.
 */
export function BelumTersinkron({ className }: { className?: string }) {
  return (
    <p
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill bg-surface-warm px-2.5 py-1 text-[11px] font-medium text-ink-muted",
        className,
      )}
    >
      <CloudOff className="h-3 w-3" aria-hidden />
      Belum tersinkron
    </p>
  );
}
