import type { Metadata } from "next";
import { Bagian, Penerbit } from "@/components/legal/bagian";

export const metadata: Metadata = {
  title: "Kebijakan Pengembalian Dana",
  description:
    "Syarat, proses, dan jangka waktu pengembalian dana langganan Premium AIDM.",
};

/**
 * Kebijakan Pengembalian Dana. Isinya FINAL dan disetujui PO — redaksinya
 * tidak boleh diubah. Rute PUBLIK: Midtrans mensyaratkan dokumen ini dapat
 * dibuka tanpa akun sebelum merchant disetujui.
 */
export default function PengembalianDanaPage() {
  return (
    <div className="space-y-section">
      <header className="space-y-3">
        <h1>Kebijakan Pengembalian Dana</h1>
        <p className="text-[13px] leading-relaxed text-ink-subtle">
          AIDM — Aplikasi Pencatatan Keuangan UMKM
          <br />
          Dioperasikan oleh <b className="text-ink-muted">PT IDM FILM SEJAHTERA</b>
          <br />
          Berlaku sejak: 29 Agustus 2026
        </p>
      </header>

      <Bagian judul="1. Sifat Produk">
        <p>
          AIDM menjual <b className="text-ink">langganan layanan digital</b>,
          bukan barang fisik. Tidak ada pengiriman barang, sehingga tidak
          berlaku ketentuan retur, ongkos kirim, maupun pengembalian barang.
        </p>
      </Bagian>

      <Bagian judul="2. Coba Dulu Sebelum Membayar">
        <p>
          Setiap akun baru mendapat{" "}
          <b className="text-ink">masa coba gratis 7 hari</b> untuk seluruh
          fitur Premium. Kami menyarankan Anda memanfaatkan masa coba ini
          terlebih dahulu sebelum berlangganan, agar Anda yakin Layanan sesuai
          dengan kebutuhan usaha Anda.
        </p>
        <p>
          Fitur pencatatan, laporan, dan unduhan PDF{" "}
          <b className="text-ink">gratis selamanya</b> dan tidak memerlukan
          pembayaran apa pun.
        </p>
      </Bagian>

      <Bagian judul="3. Jaminan Pengembalian Dana 7 Hari">
        <p>
          Anda dapat mengajukan pengembalian dana penuh (100%) apabila:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Pengajuan dilakukan dalam{" "}
            <b className="text-ink">7 hari kalender</b> sejak pembayaran
            berhasil, <b className="text-ink">dan</b>
          </li>
          <li>
            Anda belum menggunakan lebih dari <b className="text-ink">5 kali</b>{" "}
            total fitur Premium (Riset Tren dan/atau Generator Konten)
          </li>
        </ul>
        <p>Pengembalian dana penuh juga diberikan tanpa syarat apabila:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Layanan Premium <b className="text-ink">tidak dapat diakses</b>{" "}
            akibat kesalahan sistem kami selama lebih dari 48 jam berturut-turut
          </li>
          <li>
            Terjadi <b className="text-ink">pembayaran ganda</b> untuk periode
            langganan yang sama
          </li>
          <li>
            Pembayaran berhasil tetapi{" "}
            <b className="text-ink">akses Premium tidak aktif</b> dan tidak
            dapat kami perbaiki
          </li>
        </ul>
      </Bagian>

      <Bagian judul="4. Kondisi yang Tidak Memenuhi Syarat">
        <p>
          Pengembalian dana <b className="text-ink">tidak dapat diberikan</b>{" "}
          apabila:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Pengajuan melewati 7 hari sejak pembayaran</li>
          <li>Fitur Premium telah digunakan lebih dari 5 kali</li>
          <li>Masa langganan 30 hari telah berakhir secara normal</li>
          <li>Akun ditangguhkan karena melanggar Syarat &amp; Ketentuan</li>
          <li>
            Ketidakpuasan disebabkan oleh kesalahan input data oleh pengguna
          </li>
          <li>Kendala berasal dari perangkat, jaringan, atau browser pengguna</li>
        </ul>
      </Bagian>

      <Bagian judul="5. Cara Mengajukan">
        <p>
          Kirim email ke{" "}
          <a
            href="mailto:official@idmfilm.id?subject=Pengembalian%20Dana%20%E2%80%94%20AIDM"
            className="font-semibold text-gold-deep underline-offset-2 hover:underline"
          >
            official@idmfilm.id
          </a>{" "}
          dengan subjek{" "}
          <b className="text-ink">&quot;Pengembalian Dana — AIDM&quot;</b>,
          disertai:
        </p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Alamat email akun AIDM Anda</li>
          <li>Tanggal dan nominal pembayaran</li>
          <li>
            Nomor pesanan / ID transaksi (tercantum pada bukti pembayaran)
          </li>
          <li>Alasan pengajuan</li>
        </ol>
      </Bagian>

      <Bagian judul="6. Proses dan Jangka Waktu">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-semibold text-ink">Tahap</th>
                <th className="py-2 font-semibold text-ink">Jangka Waktu</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">
                  Konfirmasi penerimaan pengajuan
                </td>
                <td className="py-2">Maksimal 2 hari kerja</td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Peninjauan pengajuan</td>
                <td className="py-2">Maksimal 5 hari kerja</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">
                  Pemrosesan dana (bila disetujui)
                </td>
                <td className="py-2">7–14 hari kerja</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Dana dikembalikan melalui metode pembayaran yang sama dengan yang
          digunakan saat pembelian. Lamanya dana masuk ke rekening Anda
          bergantung pada kebijakan bank atau penyedia pembayaran masing-masing.
        </p>
        <p>
          Apabila pengajuan ditolak, kami akan menyampaikan alasannya secara
          tertulis.
        </p>
      </Bagian>

      <Bagian judul="7. Setelah Pengembalian Dana">
        <p>
          Akses fitur Premium dihentikan pada hari pengembalian dana disetujui.
          Akun Anda kembali ke versi Gratis, dan{" "}
          <b className="text-ink">
            seluruh data transaksi Anda tetap utuh serta dapat diakses
          </b>
          .
        </p>
        <p>
          Masa coba gratis 7 hari tidak dapat digunakan kembali setelah
          pengembalian dana.
        </p>
      </Bagian>

      <Bagian judul="8. Pembatalan Langganan">
        <p>
          Langganan AIDM bersifat{" "}
          <b className="text-ink">sekali bayar untuk 30 hari</b> dan{" "}
          <b className="text-ink">tidak diperpanjang otomatis</b>. Anda tidak
          perlu melakukan pembatalan — cukup tidak melakukan pembayaran
          berikutnya, dan akses Premium akan berhenti dengan sendirinya pada
          akhir masa aktif.
        </p>
      </Bagian>

      <Bagian judul="9. Kontak">
        <p>
          Pertanyaan mengenai pengembalian dana dapat disampaikan melalui:
        </p>
      </Bagian>

      <Penerbit />
    </div>
  );
}
