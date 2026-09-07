import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Akun terhapus",
  description: "Konfirmasi penghapusan akun AIDM.",
  robots: { index: false, follow: false },
};

/**
 * Layar sesudah penghapusan akun berhasil.
 *
 * Sebelum ini pengguna dilempar langsung ke `/masuk` — layar yang sama persis
 * dengan yang ia lihat sebelum punya akun. Tidak ada yang memberi tahu bahwa
 * permintaannya berhasil, sehingga tindakan paling tidak bisa dibatalkan di
 * seluruh aplikasi berakhir tanpa satu kata pun konfirmasi. Keraguan yang
 * ditinggalkannya bukan hal sepele: satu-satunya cara pengguna memastikan
 * akunnya benar-benar hilang adalah mencoba masuk lagi — dan dulu percobaan
 * itu justru membangkitkannya kembali.
 *
 * Rute PUBLIK, dan memang harus: cookie sesi sudah dihapus saat halaman ini
 * dibuka. Di grup terlindungi ia akan dipantulkan ke `/masuk` dan hilang
 * sebelum sempat terbaca.
 *
 * `noindex` karena halaman ini bukan untuk ditemukan lewat pencarian; ia hanya
 * bermakna sebagai akhir dari sebuah alur.
 */
export default function AkunDihapusPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-success/10">
          <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
        </span>
        <h1>Akunmu sudah dihapus</h1>
        <p className="text-[14px] leading-relaxed text-ink-muted">
          Catatan transaksi, laporan, profil usaha, dan dompetmu sudah dihapus
          dari AIDM. Identitas masukmu juga sudah dihapus, jadi akun ini tidak
          bisa dipulihkan — masuk dengan email yang sama akan membuat akun baru
          yang benar-benar kosong.
        </p>
      </header>

      <div className="space-y-3 rounded-card bg-surface-warm p-5">
        <h2 className="text-[15px]">Dua hal yang tetap ada</h2>
        <p className="text-[13.5px] leading-relaxed text-ink-muted">
          <strong className="text-ink">Sidik jari laporan yang sudah kamu
          segel</strong> tetap tersimpan di blockchain. Itu bukan isi
          laporanmu — isinya sudah dihapus — melainkan sidik jari yang
          membuktikan laporan itu benar ada dan tidak diubah pada tanggal
          tersebut. Sifatnya permanen, dan justru itulah yang membuat segel
          punya arti: sesuatu yang bisa dihapus belakangan tidak akan pernah
          bisa membuktikan apa pun.
        </p>
        <p className="text-[13.5px] leading-relaxed text-ink-muted">
          <strong className="text-ink">Catatan pembayaran langganan</strong>
          {" "}disimpan tanpa identitasmu, sesuai kewajiban pembukuan pajak.
          Yang tersisa hanya nominal dan tanggalnya — tidak ada lagi yang
          menghubungkannya denganmu.
        </p>
      </div>

      <p className="text-[13.5px] leading-relaxed text-ink-muted">
        Terima kasih sudah mencoba AIDM. Kalau suatu saat ingin mulai lagi,
        pintunya terbuka.
      </p>

      <Link
        href="/masuk"
        className="inline-flex min-h-[48px] items-center justify-center rounded-pill bg-ink px-6 text-[14px] font-semibold text-ink-invert"
      >
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
