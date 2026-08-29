import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Tautan dokumen hukum — tampil di SETIAP halaman.
 *
 * Bukan sekadar kerapian: Midtrans mensyaratkan Syarat & Ketentuan dan
 * Kebijakan Pengembalian Dana dapat ditemukan publik sebelum akun merchant
 * disetujui. Karena itu baris ini hidup di shell aplikasi DAN di layar masuk,
 * bukan hanya di satu halaman pengaturan yang menuntut login untuk mencapainya.
 *
 * Ketiganya rute publik — tidak ada di daftar terlindungi middleware, jadi
 * peninjau yang membukanya tanpa akun tidak akan terpantul ke layar masuk.
 */

const TAUTAN = [
  { href: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
  { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
  { href: "/pengembalian-dana", label: "Pengembalian Dana" },
] as const;

export function TautanLegal({
  className,
  ringkas = false,
}: {
  className?: string;
  /** Tanpa baris penerbit — dipakai di ruang sempit seperti layar masuk. */
  ringkas?: boolean;
}) {
  return (
    <nav
      aria-label="Dokumen hukum"
      className={cn("text-center text-[12px] leading-relaxed", className)}
    >
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {TAUTAN.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="text-ink-subtle underline-offset-2 hover:text-ink-muted hover:underline"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
      {ringkas ? null : (
        <p className="mt-2 text-ink-subtle">
          PT IDM FILM SEJAHTERA · official@idmfilm.id
        </p>
      )}
    </nav>
  );
}
