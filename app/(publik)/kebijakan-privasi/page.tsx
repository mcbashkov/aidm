import type { Metadata } from "next";
import { Bagian } from "@/components/legal/bagian";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Data apa yang AIDM simpan, untuk apa, berapa lama, dan hak apa yang kamu punya atasnya.",
};

/**
 * Kebijakan privasi (UU PDP No. 27/2022 · §12 / §16 #10).
 *
 * Ditulis sebagai halaman, bukan tautan ke dokumen luar: pengguna yang sedang
 * memutuskan apakah mempercayakan catatan usahanya tidak seharusnya dilempar
 * ke domain lain untuk membaca jawabannya.
 *
 * Isinya sengaja menyebut yang BELUM berjalan — pemusnahan `raw_input` 90 hari
 * sudah diputuskan tapi belum dibangun. Menuliskan kebijakan yang belum
 * ditegakkan sebagai kenyataan adalah bentuk ketidakjujuran yang paling mudah
 * dilakukan dan paling mahal saat ketahuan.
 */
export default function KebijakanPrivasiPage() {
  return (
    <div className="space-y-section">
      <header className="space-y-3">
        <h1>Kebijakan Privasi</h1>
        <p className="text-[13px] text-ink-subtle">
          Berlaku sejak 22 Agustus 2026 · mengacu UU No. 27 Tahun 2022 tentang
          Pelindungan Data Pribadi
        </p>
      </header>

      <Bagian judul="Ringkasnya">
        <p>
          AIDM menyimpan catatan keuangan yang kamu tulis, supaya bisa
          menyusunnya jadi laporan. Kami tidak menjual datamu, tidak
          membagikannya ke pihak lain untuk iklan, dan tidak menjaminkan
          apa pun tentang dirimu kepada lembaga keuangan mana pun.
        </p>
      </Bagian>

      <Bagian judul="Data yang kami simpan">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <b>Identitas akun</b> — email atau nomor HP yang kamu pakai masuk,
            dan alamat dompet yang dibuatkan otomatis untukmu.
          </li>
          <li>
            <b>Profil usaha</b> — jenis penghasilan, kategori, kota. Dipakai
            agar jawaban AI relevan dengan usahamu.
          </li>
          <li>
            <b>Transaksi</b> — nominal, jenis, kategori, tanggal, dan metode
            pembayaran yang kamu catat.
          </li>
          <li>
            <b>Kalimat asli</b> — teks atau hasil transkrip suara yang kamu
            ucapkan saat mencatat, disimpan untuk memperbaiki ketepatan
            pembacaan.
          </li>
          <li>
            <b>Pertanyaan riset</b> — pertanyaan yang kamu ajukan ke fitur
            premium beserta jawabannya.
          </li>
        </ul>
      </Bagian>

      <Bagian judul="Yang TIDAK kami simpan">
        <p>
          Rekaman suaramu tidak disimpan — suara diubah jadi teks di
          perangkatmu atau saat diproses, lalu dibuang. Kami juga tidak pernah
          memegang kunci privat dompetmu; kunci itu dikelola Privy dan hanya
          kamu yang bisa mengekspornya.
        </p>
      </Bagian>

      <Bagian judul="Berapa lama disimpan">
        <p>
          Catatan transaksi dan laporanmu disimpan selama akunmu aktif — itu
          memang isi buku usahamu.
        </p>
        <p className="rounded-card bg-gold-tint px-4 py-3">
          <b>Yang masih dalam pengerjaan:</b> kami sudah memutuskan untuk
          menganonimkan <i>kalimat asli</i> setelah 90 hari, menyisakan hanya
          catatan terstrukturnya. Pemusnahan otomatis itu{" "}
          <b>belum berjalan</b> saat halaman ini ditulis. Sampai ia aktif,
          kalimat aslimu tersimpan selama akunmu ada.
        </p>
      </Bagian>

      <Bagian judul="Siapa lagi yang memprosesnya">
        <p>
          Kami memakai penyedia layanan untuk menjalankan aplikasi ini:
          Supabase (basis data), Vercel (server), Privy (masuk &amp; dompet),
          serta Anthropic dan Google (model AI yang membaca kalimatmu untuk
          mengubahnya jadi catatan). Mereka memproses data atas perintah kami,
          bukan untuk kepentingan mereka sendiri.
        </p>
      </Bagian>

      <Bagian judul="Yang tersimpan di blockchain">
        <p>
          Saat kamu menyegel laporan, yang ditulis ke jaringan hanyalah{" "}
          <b>sidik jari digital (hash)</b> dari laporan itu — bukan angkanya,
          bukan namamu, bukan isinya. Hash tidak bisa dibalik menjadi data.
          Yang dibuktikannya: laporan itu ada pada tanggal tersebut dan tidak
          berubah sejak saat itu. Ia <b>tidak</b> membuktikan angkanya benar.
        </p>
        <p>
          Catatan penting: tulisan di blockchain bersifat permanen dan tidak
          bisa dihapus, termasuk oleh kami. Karena itu yang ditulis ke sana
          sengaja dibatasi hanya pada hash.
        </p>
      </Bagian>

      <Bagian judul="Hakmu">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Melihat dan mengunduh datamu — lewat laporan dan ekspor PDF.</li>
          <li>Memperbaiki data yang keliru — ubah atau hapus transaksinya.</li>
          <li>
            Menghapus akun beserta seluruh transaksi dan laporannya — tersedia
            di halaman Akun, berlaku langsung dan tidak bisa dibatalkan.
          </li>
          <li>Mengekspor kunci dompetmu dan membawanya ke aplikasi lain.</li>
        </ul>
      </Bagian>

      <Bagian judul="Menghubungi kami">
        <p>
          Pertanyaan atau keberatan soal data pribadimu bisa dikirim ke{" "}
          <a
            href="mailto:privasi@idmtoken.com"
            className="text-gold-deep underline underline-offset-2"
          >
            privasi@idmtoken.com
          </a>
          .
        </p>
      </Bagian>
    </div>
  );
}
