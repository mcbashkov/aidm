import type { ReactNode } from "react";

/**
 * Satu bagian dokumen hukum: judul + kartu isi.
 *
 * Diangkat dari halaman Kebijakan Privasi supaya ketiga dokumen (privasi,
 * syarat & ketentuan, pengembalian dana) memakai bentuk yang SAMA. Tiga
 * salinan komponen yang sama adalah tiga tempat untuk menyimpang, dan dokumen
 * hukum yang tampil berbeda-beda terbaca seperti ditulis oleh pihak berbeda.
 */
export function Bagian({
  judul,
  children,
}: {
  judul: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1">{judul}</h2>
      <div className="card space-y-3 p-5 text-[13.5px] leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  );
}

/** Blok identitas penerbit — sama di ketiga dokumen. */
export function Penerbit() {
  return (
    <div className="card space-y-1 p-5 text-[13px] leading-relaxed text-ink-muted">
      <p className="font-semibold text-ink">PT IDM FILM SEJAHTERA</p>
      <p>
        Jl. Gading Kirana Timur A.11/15, RT 001, Kelapa Gading
        <br />
        Kota Administrasi Jakarta Utara, DKI Jakarta 14240
      </p>
      <p>
        Email:{" "}
        <a
          href="mailto:official@idmfilm.id"
          className="font-semibold text-gold-deep underline-offset-2 hover:underline"
        >
          official@idmfilm.id
        </a>
      </p>
      <p className="pt-2 text-[12px] text-ink-subtle">
        PT IDM FILM SEJAHTERA — Hak Cipta © 2026. Seluruh hak dilindungi.
      </p>
    </div>
  );
}
