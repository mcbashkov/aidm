import type { Metadata } from "next";
import { Bagian, Penerbit } from "@/components/legal/bagian";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan ketentuan penggunaan AIDM — aplikasi pencatatan keuangan UMKM yang dioperasikan PT IDM FILM SEJAHTERA.",
};

/**
 * Syarat & Ketentuan. Isinya FINAL dan disetujui PO — redaksinya tidak boleh
 * diubah oleh siapa pun yang menyentuh berkas ini. Yang boleh berubah hanya
 * pembungkus visualnya.
 *
 * Halaman ini rute PUBLIK (grup `(publik)`, di luar daftar terlindungi
 * middleware): Midtrans mensyaratkan dokumen ini dapat dibuka tanpa akun
 * sebelum merchant disetujui.
 */
export default function SyaratKetentuanPage() {
  return (
    <div className="space-y-section">
      <header className="space-y-3">
        <h1>Syarat &amp; Ketentuan</h1>
        <p className="text-[13px] leading-relaxed text-ink-subtle">
          AIDM — Aplikasi Pencatatan Keuangan UMKM
          <br />
          Dioperasikan oleh <b className="text-ink-muted">PT IDM FILM SEJAHTERA</b>
          <br />
          Berlaku sejak: 29 Agustus 2026
        </p>
      </header>

      <Bagian judul="1. Ketentuan Penggunaan">
        <p>
          AIDM (&quot;Layanan&quot;) disediakan untuk Anda dengan syarat Anda
          menyetujui seluruh syarat, ketentuan, dan pemberitahuan yang tercantum
          di dokumen ini, termasuk ketentuan tambahan yang mungkin berlaku pada
          halaman tertentu di dalam Layanan.
        </p>
      </Bagian>

      <Bagian judul="2. Gambaran Umum">
        <p>
          Penggunaan Anda atas Layanan ini merupakan persetujuan Anda terhadap
          seluruh syarat dan ketentuan di bawah ini. Mohon dibaca dengan saksama.
          Jika Anda tidak menyetujuinya, mohon hentikan penggunaan Layanan.
        </p>
      </Bagian>

      <Bagian judul="3. Deskripsi Layanan">
        <p>
          AIDM adalah aplikasi pencatatan keuangan berbasis web untuk pelaku
          usaha mikro di Indonesia. Pengguna mencatat transaksi usaha melalui
          teks atau suara, kemudian Layanan menyusunnya menjadi laporan keuangan
          yang dapat diunduh.
        </p>
        <p>
          <b className="text-ink">Fitur Gratis</b> (tanpa biaya, selamanya):
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Pencatatan transaksi melalui teks maupun suara</li>
          <li>Laporan keuangan bulanan dan unduhan PDF</li>
          <li>Riwayat transaksi</li>
          <li>Misi dan program penghargaan</li>
        </ul>
        <p>
          <b className="text-ink">Fitur Premium</b> (berlangganan):
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Riset Tren — analisis tren pasar</li>
          <li>Generator Konten — pembuatan materi promosi</li>
        </ul>
      </Bagian>

      <Bagian judul="4. Pendaftaran Akun">
        <p>
          Untuk menggunakan Layanan, Anda perlu mendaftar menggunakan alamat
          email atau akun Google. Anda bertanggung jawab menjaga kerahasiaan
          akses akun Anda dan atas seluruh aktivitas yang terjadi di dalamnya.
          Anda wajib memberikan informasi yang benar dan terkini.
        </p>
      </Bagian>

      <Bagian judul="5. Harga & Pembayaran">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-semibold text-ink">Item</th>
                <th className="py-2 font-semibold text-ink">Ketentuan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Harga Premium</td>
                <td className="py-2">
                  <b className="text-ink">Rp49.000</b> per bulan (30 hari)
                </td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Mata uang</td>
                <td className="py-2">Rupiah (IDR)</td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Masa coba gratis</td>
                <td className="py-2">7 hari, satu kali per akun</td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-3">Metode pembayaran</td>
                <td className="py-2">
                  QRIS, Virtual Account, dan metode lain melalui Midtrans
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Sistem penagihan</td>
                <td className="py-2">
                  Sekali bayar untuk 30 hari,{" "}
                  <b className="text-ink">tidak otomatis diperpanjang</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Seluruh harga sudah termasuk pajak yang berlaku. Layanan Premium aktif
          segera setelah pembayaran dikonfirmasi oleh penyedia pembayaran.
        </p>
        <p>
          Langganan <b className="text-ink">tidak diperpanjang otomatis</b>. Anda
          tidak akan ditagih tanpa melakukan pembayaran baru. Setelah 30 hari
          berakhir, akses Premium berhenti dan akun Anda kembali ke versi Gratis
          — seluruh data dan fitur gratis tetap dapat diakses.
        </p>
      </Bagian>

      <Bagian judul="6. Kuota Wajar">
        <p>
          Untuk menjaga kualitas layanan bagi seluruh pengguna, fitur Premium
          memiliki batas penggunaan wajar sebesar{" "}
          <b className="text-ink">30 Riset Tren</b> dan{" "}
          <b className="text-ink">60 Generator Konten</b> per bulan. Batas ini
          dirancang jauh di atas pemakaian normal dan tidak akan dirasakan oleh
          pengguna pada umumnya.
        </p>
      </Bagian>

      <Bagian judul="7. Perubahan Layanan dan Ketentuan">
        <p>
          PT IDM FILM SEJAHTERA berhak mengubah, memperbarui, atau menghentikan
          syarat, ketentuan, harga, dan materi apa pun dalam Layanan
          sewaktu-waktu. Perubahan harga tidak berlaku surut terhadap masa
          langganan yang sedang berjalan. Penggunaan Layanan yang berkelanjutan
          setelah perubahan berarti Anda menyetujui perubahan tersebut.
        </p>
      </Bagian>

      <Bagian judul="8. Hak Kekayaan Intelektual">
        <p>
          Layanan ini dimiliki dan dioperasikan oleh PT IDM FILM SEJAHTERA.
          Seluruh materi, merek dagang, dan logo dalam Layanan merupakan milik
          PT IDM FILM SEJAHTERA dan dilindungi undang-undang hak cipta Republik
          Indonesia. AIDM terdaftar sebagai Ciptaan pada Direktorat Jenderal
          Kekayaan Intelektual dengan Nomor Pencatatan{" "}
          <b className="text-ink">001446727</b>.
        </p>
        <p>
          Materi dalam Layanan tidak boleh disalin, direproduksi, dimodifikasi,
          atau didistribusikan dalam bentuk apa pun tanpa izin tertulis dari
          PT IDM FILM SEJAHTERA.
        </p>
      </Bagian>

      <Bagian judul="9. Kepemilikan Data Pengguna">
        <p>
          Seluruh data transaksi yang Anda catat adalah{" "}
          <b className="text-ink">milik Anda</b>. Anda dapat mengunduhnya kapan
          saja dalam format PDF maupun CSV. Kami tidak menjual data pribadi
          maupun data keuangan Anda kepada pihak mana pun.
        </p>
        <p>
          Pengelolaan data pribadi diatur lebih lanjut dalam Kebijakan Privasi
          kami.
        </p>
      </Bagian>

      <Bagian judul="10. Larangan Penggunaan">
        <p>Anda dilarang:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Menggunakan Layanan untuk kegiatan melanggar hukum</li>
          <li>
            Melakukan akses otomatis (bot/skrip) yang membebani sistem secara
            tidak wajar
          </li>
          <li>Mencoba merusak, meretas, atau merekayasa balik Layanan</li>
          <li>
            Menggunakan Layanan untuk tujuan selain pencatatan keuangan usaha
          </li>
        </ul>
        <p>Kami berhak menangguhkan akun yang melanggar ketentuan ini.</p>
      </Bagian>

      <Bagian judul="11. Komunikasi Elektronik">
        <p>
          Anda menyetujui bahwa PT IDM FILM SEJAHTERA dapat mengirimkan surat
          elektronik kepada Anda terkait perubahan Layanan, informasi akun, dan
          pemberitahuan penting lainnya.
        </p>
      </Bagian>

      <Bagian judul="12. Batasan Tanggung Jawab">
        <p>
          Layanan disediakan &quot;sebagaimana adanya&quot;. AIDM merupakan alat
          bantu pencatatan;{" "}
          <b className="text-ink">
            laporan yang dihasilkan bukan merupakan hasil audit, bukan nasihat
            keuangan, dan bukan penilaian kelayakan kredit resmi.
          </b>{" "}
          Keputusan usaha maupun keuangan yang Anda ambil berdasarkan laporan
          dari Layanan ini sepenuhnya menjadi tanggung jawab Anda.
        </p>
        <p>
          PT IDM FILM SEJAHTERA tidak bertanggung jawab atas kerugian yang timbul
          dari kesalahan input data oleh pengguna, gangguan jaringan atau layanan
          pihak ketiga, maupun penggunaan Layanan di luar peruntukannya.
        </p>
      </Bagian>

      <Bagian judul="13. Ganti Rugi">
        <p>
          Anda setuju untuk membebaskan PT IDM FILM SEJAHTERA dari segala
          tuntutan, kerugian, atau biaya yang timbul akibat penggunaan Layanan
          oleh Anda atau pelanggaran Anda atas ketentuan ini.
        </p>
      </Bagian>

      <Bagian judul="14. Penghentian Layanan">
        <p>
          Anda dapat berhenti menggunakan Layanan dan menghapus akun kapan saja
          melalui halaman Akun. Kami dapat menangguhkan atau menghentikan akses
          Anda apabila terjadi pelanggaran atas ketentuan ini.
        </p>
      </Bagian>

      <Bagian judul="15. Hukum yang Berlaku">
        <p>
          Syarat dan Ketentuan ini tunduk pada hukum yang berlaku di Republik
          Indonesia.
        </p>
      </Bagian>

      <Bagian judul="16. Kontak">
        <p>
          Pertanyaan, keluhan, atau permintaan terkait Layanan dapat disampaikan
          melalui:
        </p>
      </Bagian>

      <Penerbit />
    </div>
  );
}
