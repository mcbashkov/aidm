import Link from "next/link";

/**
 * 404 berbahasa Indonesia (§13).
 *
 * Tanpa berkas ini Next menampilkan layar bawaannya yang berbahasa Inggris
 * ("This page could not be found") — pengguna sasaran aplikasi ini pelaku
 * usaha mikro, dan halaman yang tiba-tiba berganti bahasa terbaca sebagai
 * aplikasi rusak, bukan sebagai tautan yang salah.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="num-display text-[56px] leading-none text-gold-deep">
          404
        </p>
        <h1 className="font-serif text-[24px] font-semibold text-ink">
          Halaman ini tidak ada
        </h1>
        <p className="text-[14px] leading-relaxed text-ink-muted">
          Mungkin tautannya salah ketik, atau halamannya sudah pindah. Catatan
          dan laporanmu aman — tidak ada yang hilang.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Link href="/beranda" className="btn-primary px-6">
            Ke Beranda
          </Link>
          <Link
            href="/catat"
            className="inline-flex min-h-[44px] items-center rounded-pill bg-surface-warm px-6 text-[15px] font-semibold text-ink"
          >
            Catat transaksi
          </Link>
        </div>
      </div>
    </div>
  );
}
