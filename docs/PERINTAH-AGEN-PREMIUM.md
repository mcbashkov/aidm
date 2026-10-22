# Perintah agen — Premium & bankability (Fase A → Fase B)

Diperbarui: 2026-10-22 · Pemilik: PO (MC Basyar) · Disusun oleh sesi arsitek Claude dari hasil riset `docs/riset/fitur-premium-umkm-2026-10-22.md`.

Dokumen ini adalah **perintah kerja lengkap**. Agen mengerjakannya berurutan dari Batch 3 sampai selesai **tanpa berhenti untuk bertanya**. Semua keputusan produk, harga, nama, batas hukum, dan urutan sudah dikunci di sini. Kalau ada celah yang tidak dibahas, berlaku §0.4.

Dokumen pendamping yang WAJIB dibaca dulu, berurutan:
1. `PROGRESS.md` — terutama "Keadaan sekarang", §7j, §7k, §8.
2. `docs/PERINTAH-AGEN-FINAL.md` §0.1 — ekonomi reward IDMX versi 2 (terkunci PO 9 Sep 2026). Angka di sana tidak boleh dilanggar oleh misi baru.
3. `docs/riset/fitur-premium-umkm-2026-10-22.md` — dasar bukti. Bagian "Rekomendasi", "Yang harus tetap gratis", "Pintu premium", "Harga".
4. `PRD-AIDM.md` §0, §6, §7, §8, §10, §11, §17 (kontrak output agen).

---

## 0. Aturan main

### 0.1 Yang tidak boleh berubah (identitas produk)

- **Jantung produk: PENCATATAN → BANKABILITY.** Premium hidup di **hilir** catatan (dokumen, rekap, pengingat, arsip), tidak pernah di hulu. **Catat — teks dan suara — tetap gratis tanpa kuota.** Bot WA masuk tidak dibatasi.
- **Sistem desain tidak disentuh:** krem-emas (`#FAF7F0` / `#1B1B1B` / `#EDB415` / `#B9860C`), Fraunces + Plus Jakarta Sans, komponen kartu/chip/sheet/tombol yang ada. Fitur baru memakai komponen yang ada. Tidak ada token warna baru, tidak ada font baru, tidak ada tata letak halaman yang dirombak.
- **Nav tetap:** Beranda · Catat · Laporan · Misi · Akun. Riset tetap di dalam Catat, Konten tetap di dalam Laporan.
- **Modul stok TIDAK dibangun.** `items` di parser hanya disimpan.
- **Blockchain = HASH SAJA.** Data keuangan tidak pernah ke chain. Segel memakai `ReportAttestation` yang ada.
- **Langganan tidak pernah dibayar token.** IDMX = imbalan kontinuitas mencatat. Satu-satunya jalur bayar: Midtrans sekali bayar.
- **AIDM bukan penilai kredit dan bukan perantara pinjaman.** Tidak ada skor kredit, probabilitas persetujuan, rasio kelayakan, atau rekomendasi bank. Tidak ada tautan ke penyalur pinjaman.

### 0.2 Kata yang dilarang di UI, PDF, salinan, dan metadata

| Dilarang | Pakai |
|---|---|
| laba, laba kotor, laba bersih, profit, untung (sebagai angka) | Sisa uang, pemasukan, pengeluaran |
| layak, kelayakan, skor kredit, disetujui, lolos bank | Kesiapan catatan, kelengkapan catatan |
| KUR sebagai nama produk/tombol/judul | "Berkas Pengajuan"; KUR hanya boleh disebut dalam kalimat penjelas umum ("dokumen seperti ini biasa diminta bank untuk pinjaman mikro") |
| staking | Kunci Akses Fitur |
| kredit (dalam arti saldo/kuota AI) | kuota |
| Perpres 27/2026 "mewajibkan manajemen keuangan / pilar literasi keuangan" | lihat Batch 3 |

Di dokumen yang dibaca bank/pejabat (PDF Berkas, halaman verifikasi publik): **nol** kata token, kripto, IDMX, IDM, wallet, opBNB. Segel disebut "notarisasi hash kriptografis". Di dalam aplikasi untuk pengguna: tampil apa adanya (opBNB, IDMX, wallet).

### 0.3 Gerbang tiap batch — tidak ada push tanpa ini

1. `rm -rf .next && pnpm typecheck && pnpm lint`
2. `pnpm test:parser` **200/200** + korpus kasbon `tests/parser-kasbon.json` **29/29** (tidak boleh turun; korpus 200 TIDAK ditambah — ia pembanding historis).
3. `pnpm test:canonical` — wajib bila menyentuh segel, PDF, atau data yang masuk kanonik.
4. `pnpm test:swap` — wajib bila menyentuh `lib/swap`, `lib/chains`, `components/wallet`, atau rute `/api/swap*`, `/api/rpc*`.
5. `pnpm test:api` **run penuh** dengan env produksi + dev server lokal, seperti §7k. Tambahkan seksi tes untuk setiap rute baru di batch itu. Cek harness yang basi boleh **disesuaikan**, tidak boleh **dilonggarkan** — tulis alasannya di PROGRESS.
6. Migrasi: tulis di `supabase/migrations/00NN_*.sql`, **aditif & idempoten, tanpa DROP TABLE/COLUMN/CONSTRAINT pada objek yang sudah ada**. Uji dua kali berturut-turut di Postgres sekali pakai (Docker, setelah 0001–00NN-1) seperti §7k. Lalu `pnpm db:migrate --dry-run`, lalu `pnpm db:migrate`. **PO mengizinkan agen menjalankan `db:migrate` untuk 0033 dan semua migrasi dalam dokumen ini**, dengan syarat uji sekali-pakai lulus dan urutan "migrasi dulu, push sesudahnya" dijaga (pelajaran §7k).
7. Setelah push: tunggu deploy Vercel READY, cek asap tanpa sesi di `ai.idmtoken.com` (status rute baru 401/404/200 sesuai desain), lalu cek asap dengan sesi uji lewat harness.
8. Entri PROGRESS.md: satu subbagian baru per batch (§7l, §7m, … berurutan), format seperti §7k: keputusan, bukti (angka tes nyata, bukan asumsi), yang belum. Tanggal "Diperbarui" dinaikkan.
9. Commit per topik, pesan berbahasa Indonesia seperti riwayat repo. Push ke `main` hanya setelah gerbang 1–7 hijau. Produksi harus **koheren** setelah setiap push: tidak ada tombol yang menuju fitur setengah jadi.

### 0.4 Kalau ada yang tidak dibahas di dokumen ini

Jangan bertanya. Urutan keputusan: (a) pilih yang tertulis di dokumen ini; (b) kalau tidak ada, pilih yang **paling murah dibatalkan** dan paling sedikit menyentuh berkas di luar batch; (c) catat di PROGRESS.md bagian batch itu di bawah judul **"Keputusan yang saya ambil sendiri"**, satu baris per keputusan, dengan alternatif yang ditolak. PO membaca bagian itu dan membalikkan bila perlu.

**Satu-satunya alasan berhenti di tengah batch:** gerbang merah yang tidak bisa dihijaukan tanpa melonggarkan tes, atau aksi yang akan menghapus/mengubah data produksi milik pengguna. Dalam dua kasus itu: jangan push batch itu, tulis status "TERTAHAN" + sebabnya di PROGRESS, dan **lanjut ke batch berikutnya yang tidak bergantung padanya**. Env/kunci yang tidak ada: tulis nama variabel yang dibutuhkan di PROGRESS "Butuh tangan PO", bangun kodenya agar aman tanpa variabel itu (fitur tampil "belum tersedia", bukan error), lanjut.

### 0.5 Laporan akhir (satu pesan, setelah batch terakhir)

Per batch: commit range, deploy id, angka tiap gerbang, "Keputusan yang saya ambil sendiri", "Butuh tangan PO". Lalu daftar pendek **apa yang harus PO uji di HP** (maksimal 10 langkah). Jangan ulangi isi dokumen ini.

---

## 1. Keputusan produk yang terkunci

### 1.1 Daftar harga (konstanta di satu berkas baru `lib/langganan/katalog.ts`, menggantikan `HARGA_BULANAN_IDR`/`PERIODE_HARI`/`HARGA_TAMPIL` di `lib/langganan/index.ts`; UI membaca dari sana, tidak ada angka rupiah hard-coded di komponen)

| Kode | Produk | Harga | Bentuk | Catatan |
|---|---|---|---|---|
| `berkas6` | Berkas Pengajuan 6 bulan | **Rp49.000** | sekali bayar per dokumen | Midtrans sekali bayar yang ada |
| `berkas12` | Berkas Pengajuan 12 bulan | **Rp79.000** | sekali bayar per dokumen | idem |
| `plus` | AIDM Plus — 1 tahun | **Rp149.000** / 365 hari | sekali bayar, tidak auto-renew | **menggantikan** SKU 30 hari. Masa coba 7 hari sekali seumur akun tetap. |
| `pajak` | Paket Pajak Tahunan (Fase B) | **Rp59.000** / tahun pajak | sekali bayar | termasuk dalam Plus |

Isi Plus: Berkas Pengajuan tanpa bayar per dokumen (wajar: maks 12 berkas/365 hari), Paket Pajak, Riset & Konten dengan kuota bulanan yang sudah ada, arsip laporan >12 bulan (bila dibangun). Tidak ada SKU bulanan. Tidak ada "Kredit AI" sebagai saldo — sistem kredit sudah dibatalkan PO 2026-08-28, jangan dihidupkan lagi.

Harga adalah **inferensi pasar, belum diuji** (riset §Harga). Karena itu harus bisa diubah dari satu berkas tanpa menyentuh UI, dan **setiap pembelian/pratinjau dicatat** (`premium_events`: user_id, earner_type, kode, aksi `lihat_pratinjau|klik_beli|bayar_sukses`, harga saat itu, waktu) supaya konversi per peran terbaca sebelum harga diubah.

### 1.2 Label per peran (satu SKU, label mengikuti `earner_type`)

| earner_type | Label Berkas | Label pintu di Laporan |
|---|---|---|
| ojol | Riwayat Pendapatan 6 Bulan / 12 Bulan | "Buat Riwayat Pendapatan" |
| freelance | Bukti Penghasilan 6 Bulan / 12 Bulan | "Buat Bukti Penghasilan" |
| dagang, online, lainnya | Berkas Usaha 6 Bulan / 12 Bulan | "Buat Berkas Usaha" |

Nama internal & di Akun/kuitansi: "Berkas Pengajuan". Judul PDF memakai label peran.

### 1.3 Pintu premium (bukan kartu di Akun)

1. **Laporan** (pintu utama): kartu terkunci `ValuationLocked` ("Valuasi usaha terbuka setelah 6 bulan") di `components/laporan/laporan-view.tsx` **diganti** oleh kartu "Kesiapan Catatan" + tombol "Buat <label>" di slot yang sama (valuasi adalah Fase 3 PRD §7.9 dan terlalu dekat dengan "kelayakan"; slotnya lebih berguna untuk Berkas). Gaya kartu dan tombol memakai yang ada. Tombol membuka sheet pratinjau: halaman 1 PDF terbuka penuh, halaman berikutnya terkunci (blur + label "Pratinjau"), harga, tombol bayar. Bukan halaman paywall generik. Komponen `ValuationLocked` dan `VALUASI_BUTUH_BULAN` dihapus bila tidak dipakai lagi.
2. **Beranda**: kartu "Kesiapan Catatan" (gratis, §Batch 4). Tombol beli hanya muncul bila tingkat ≥ "Siap 3 bulan".
3. **Misi**: rantai "Siap Bank" (§Batch 7), langkah terakhir mengarah ke pintu Laporan.
4. **Catat**: tidak ada pintu. Satu-satunya sentuhan: toast non-blokir sekali seumur akun saat tingkat naik ke "Siap 3 bulan" dan "Siap 6 bulan" ("Catatanmu sudah 3 bulan rutin — cukup untuk Berkas Pengajuan").
5. **Akun**: kartu "Fitur premium" yang ada **diganti isinya** menjadi "Langganan & berkas" — status Plus, daftar berkas yang pernah dibuat (unduh ulang), riwayat pembelian/kuitansi, tautan `/premium`. Bukan lagi pintu penjualan utama.
6. `/premium` tetap ada sebagai katalog: tiga produk §1.1 (pajak muncul setelah Fase B), bagian Riset & Konten turun ke bawah sebagai "termasuk dalam Plus".

### 1.4 Kesiapan Catatan — definisi (gratis, deterministik, bisa dijelaskan)

- **Hari aktif** = baris `daily_rollups` dengan `jml_transaksi > 0` (hanya transaksi `confirmed` bernominal, tanggal WIB — definisi yang sudah dipakai `ringkasDariRollups().hariAktif` di `lib/laporan/server.ts`). Pelunasan kasbon ikut terhitung (ia catatan nyata); perbedaan dengan `misi_sinyal_harian` v0032 yang mengecualikan pelunasan disengaja dan dicatat di kode.
- **Bulan aktif** = bulan kalender WIB dengan ≥8 hari aktif.
- **Tingkat** (dihitung atas 12 bulan kalender terakhir termasuk bulan berjalan):
  - `baru` "Baru mulai": <1 bulan aktif
  - `rutin` "Mulai rutin": 1–2 bulan aktif
  - `siap3` "Siap 3 bulan": ≥3 bulan aktif di antara 6 bulan kalender terakhir
  - `siap6` "Siap 6 bulan": 6 bulan kalender terakhir (tidak termasuk bulan berjalan) semuanya aktif
- **Checklist "apa yang kurang"** (urutan tampil): profil usaha lengkap (nama usaha, kota, kategori) · pemasukan tercatat bulan ini · pengeluaran tercatat bulan ini · bulan berjalan sudah ≥8 hari aktif · tidak ada kasbon menggantung >60 hari (informasi, bukan syarat tingkat).
- Dihitung **server-side** (`GET /api/kesiapan`), di-cache per pengguna per hari, dihitung ulang saat transaksi baru masuk (invalidasi sederhana, bukan trigger kompleks).
- **Tidak ada angka 0–100.** Yang tampil: nama tingkat, "N dari 6 bulan terakhir aktif", checklist. Angka skor mengundang pembacaan "skor kredit".

### 1.5 Berkas Pengajuan — isi PDF

Renderer: `@react-pdf/renderer` lewat pola `lib/laporan/pdf.tsx` (`renderLaporanPdf`, `BarisBulanan`); jangan tambah library PDF baru. Baris bulanan dari RPC `laporan_bulanan` (0015), harian dari `daily_rollups`, rincian dari `transactions` confirmed. Ukuran A4. Font yang sudah ter-embed.

1. **Sampul:** label peran + periode (mis. "Berkas Usaha 6 Bulan · April–September 2026"), nama usaha, nama pemilik (dari profil; kosong = tampil "—"), kota, kategori usaha, tanggal terbit, nomor dokumen (`BK-YYYYMM-xxxxx`), kode verifikasi + QR ke `https://ai.idmtoken.com/verifikasi/<kode>`.
2. **Ringkasan periode:** tabel per bulan: pemasukan, pengeluaran, sisa uang, hari aktif, jumlah transaksi; baris total; grafik batang pemasukan per bulan (SVG sederhana di PDF; warna emas/ink saja).
3. **Rincian per bulan:** daftar transaksi ringkas (tanggal, keterangan, masuk, keluar). Bulan tanpa catatan tetap ada halamannya dengan tulisan "Tidak ada catatan" — jangan disembunyikan.
4. **Halaman penutup:** (a) pernyataan: *"Dokumen ini disusun otomatis dari catatan harian pengguna di aplikasi AIDM (PT IDM Film Sejahtera). AIDM tidak mengajukan, menilai, atau memperantarai pinjaman. Keaslian dokumen dapat diperiksa di ai.idmtoken.com/verifikasi/<kode>."* (b) "Dokumen pendamping yang biasanya diminta" — checklist informatif: e-KTP, KK, NIB atau SKU kelurahan, NPWP (bila ada). AIDM **tidak menyimpan** nomor dokumen itu. (c) hash SHA-256 PDF + keterangan "notarisasi hash kriptografis" + tanggal; **tanpa** kata chain/opBNB/token.
5. Footer tiap halaman: nomor dokumen · halaman x/y.

Alur: bayar (atau Plus) → render PDF server-side → simpan ke bucket privat Supabase Storage `berkas` → hitung SHA-256 atas byte PDF → `attestOnChain(userWallet, "berkas:" + nomor_dokumen, hash)` di `lib/laporan/segel-server.ts` (periodKey lewat `periodKeyBytes32`, kontrak `ReportAttestation.attestFor`, hash saja) → simpan `tx_hash`, status `pending` → `cekReceipt` oleh cron yang sudah mengurus segel bulanan → `confirmed` → unduh lewat signed URL 10 menit, bisa diunduh ulang dari Akun. Halaman publik `/verifikasi/[kode]` (grup rute `(publik)`, tanpa sesi, tanpa data keuangan): memetakan `kode_verifikasi` → (wallet, periodKey) lalu memakai `GET /api/verify/:user/:period` yang sudah ada (kontrak `verify()`); menampilkan nomor dokumen, periode, nama usaha, hash, tanggal notarisasi, status "cocok/tidak cocok". Pengguna bisa memilih PDF-nya di halaman itu; hash dihitung di browser (`crypto.subtle`), berkas tidak diunggah.

Syarat beli: `berkas6` aktif bila tingkat ≥ `siap3`; `berkas12` aktif bila ≥6 bulan aktif di 12 bulan terakhir. Di bawah syarat: tombol tetap tampil, nonaktif, dengan teks "Catat sampai 3 bulan aktif dulu (sekarang N)". Pratinjau selalu bisa dibuka.

---

## 2. Batch Fase A — berurutan, semuanya dikerjakan di run ini

### Batch 3 — Koreksi klaim Perpres 27/2026 + migrasi 0033

**3a. Koreksi klaim.** Sumber riset (empat media + umkm.go.id, Okt 2026): Perpres 27/2026 = "Pelindungan Ekosistem Transportasi Berbasis Platform Digital" — status mitra pengemudi, Kementerian UMKM leading sector, biaya platform maks 8%, perjanjian kemitraan wajib memuat struktur biaya/jaminan sosial/akses data transaksi, aplikator wajib menyediakan sistem informasi biaya & pendapatan, bukti transaksi, dan catatan per layanan dalam 6 bulan; aturan turunan paling lambat 31 Des 2026. **Tidak ada** sumber yang menyebut "pilar manajemen keuangan" atau kewajiban pencatatan bagi UMKM. Naskah JDIH belum diambil (tugas PO).

Yang dilakukan agen:
- Grep seluruh repo: `Perpres`, `27/2026`, `pilar`, `diwajibkan`, `wajib` dalam konteks manajemen/literasi keuangan. Yang sudah diketahui: `PRD-AIDM.md` ~59 dan ~85 (klaim "berlaku 1 Juli 2026", "~2,8 juta pengemudi", "pilar pelatihan manajemen keuangan", "KUR mikro bunga 3%"), komentar `lib/earner.ts:5`, dan teks `app/(auth)/onboarding/peran/page.tsx:25` ("perluasan negara … Perpres 27/2026"). Periksa juga `README.md`, metadata, prompt AI di `lib/parse/llm.ts`, `lib/konten`, `lib/research`, dan halaman hukum.
- Ganti setiap klaim kewajiban dengan rumusan netral berikut (sesuaikan tata bahasa): *"Negara memperluas definisi pelaku mikro ke pengemudi ojek daring (Perpres 27/2026 tentang Pelindungan Ekosistem Transportasi Berbasis Platform Digital, Okt 2026) dan mewajibkan aplikator menyediakan catatan biaya, pendapatan, dan bukti transaksi per layanan bagi mitranya. AIDM menyiapkan catatan harian dan bukti pendapatan dalam bentuk yang bisa langsung dibaca bank."* Hapus "berlaku 1 Juli 2026", "~2,8 juta pengemudi", dan "pilar pelatihan manajemen keuangan". Tambahkan di PRD §2 catatan kaki: "[verifikasi naskah di JDIH Setneg — PO]".
- Jangan sentuh dokumen hukum publik (`/syarat-ketentuan`, `/pengembalian-dana`, `/kebijakan-privasi`) kecuali klaim itu ada di sana.

**3b. Migrasi 0033** (`0033_fungsi_hanya_service_role.sql`, sudah ditulis & diuji §7k): `pnpm db:migrate --dry-run` → `pnpm db:migrate` → verifikasi 0 fungsi proyek bisa `anon`/`authenticated`, lalu jalankan `pnpm test:api` penuh untuk membuktikan tidak ada jalur yang putus. **Dizinkan PO lewat dokumen ini.**

PROGRESS: §7l.

### Batch 4 — Kesiapan Catatan (gratis)

Spesifikasi §1.4. Yang dibangun:
- `lib/kesiapan/hitung.ts` (murni, diuji unit: 12 kasus minimum termasuk batas bulan WIB, akun baru, bulan kosong di tengah, pelunasan kasbon dihitung sebagai hari aktif).
- `GET /api/kesiapan` (service-role, auth seperti rute lain, cache harian per pengguna).
- Kartu di **Beranda** (`app/(app)/beranda/page.tsx`, kartu ditulis inline di halaman itu): sisipkan setelah kartu "Sisa hari ini", sebelum "Misi hari ini", memakai kelas kartu yang sama. Isi: tingkat, "N dari 6 bulan terakhir aktif", dua item teratas "apa yang kurang", tombol "Buat <label>" hanya bila ≥ `siap3` (mengarah ke Laporan). Ikut `GagalMuat` seperti kartu lain.
- Kartu di **Laporan** menggantikan `ValuationLocked` (§1.3 poin 1); di batch ini berisi tingkat + checklist; tombol "Buat <label>" ditambahkan Batch 5.
- Toast tonggak di Catat (§1.3 poin 4), status "sudah tampil" disimpan di DB bukan localStorage.
- Tes API: seksi baru (akun kosong → `baru`; seed 3 bulan aktif → `siap3`; seed 6 bulan penuh → `siap6`).

PROGRESS: §7m.

### Batch 5 — Berkas Pengajuan (premium per dokumen)

Spesifikasi §1.2, §1.5. Yang dibangun:
- Migrasi: tabel `berkas_pengajuan` (id, user_id, kode `berkas6|berkas12`, periode_awal, periode_akhir, nomor_dokumen unik, kode_verifikasi unik (12 karakter, bukan UUID), order_id nullable → `subscription_orders` (null = lewat Plus), path_pdf, sha256, tx_hash nullable, status `menunggu_bayar|dibuat|pending_segel|confirmed|gagal`, created_at); tabel `premium_events` (§1.1); kolom baru nullable `subscription_orders.kode` (`plus|berkas6|berkas12|pajak`; null = perilaku lama 30 hari agar baris lama tetap sah). RLS seperti tabel lain (service-role saja), grant mengikuti pola 0033.
- `lib/langganan/katalog.ts` (harga, label per peran, syarat beli).
- `lib/berkas/render.tsx` (PDF, pola `lib/laporan/pdf.tsx`), `lib/berkas/data.ts` (agregasi 6/12 bulan dari RPC `laporan_bulanan` + `daily_rollups` + `transactions` confirmed — kasbon aktif TIDAK masuk, konsisten dengan §7k).
- Rute: `POST /api/berkas/pratinjau` (halaman 1 saja, watermark "PRATINJAU", tidak disimpan), `POST /api/berkas/pesan` (buat order lewat `lib/langganan/midtrans.ts` dengan `kode`, atau langsung buat bila Plus aktif), `/api/langganan/webhook` diperluas: `paid` untuk `kode` berkas → render → simpan → attest → status; `GET /api/berkas` (daftar milik pengguna), `GET /api/berkas/[id]/unduh` (signed URL 10 menit), `GET /api/verifikasi/[kode]` (publik, tanpa data keuangan; membungkus `/api/verify/:user/:period`).
- **Midtrans produksi masih menolak kunci (401, PROGRESS "Memblokir #1") — bukan tugas agen.** Alur dibangun dan diuji penuh di **sandbox**. Di produksi, bila `bayar` menjawab 502 dari Midtrans, sheet menampilkan "Pembayaran sedang disiapkan — coba lagi nanti" (bukan error merah), dan `premium_events` tetap mencatat `klik_beli`. Jalur `perpanjangLangganan(..., "manual")` yang ada dipakai harness untuk menguji alur Plus → berkas tanpa Midtrans.
- Halaman `/verifikasi/[kode]` di grup `(publik)`.
- Sheet pratinjau di Laporan (§1.3 poin 1). Daftar berkas + unduh ulang di Akun (Batch 6 merapikan kartunya; di batch ini cukup tautan sederhana).
- Render PDF yang gagal setelah bayar: status `gagal`, dicoba ulang oleh cron pemeliharaan yang ada (maks 3×), dan pengguna melihat "sedang disiapkan" bukan error; tidak ada refund otomatis (kebijakan `/pengembalian-dana` yang ada berlaku).
- `test:canonical` wajib (segel). `test:api`: seksi berkas (pratinjau tanpa bayar 200; pesan tanpa syarat tingkat 409; alur Plus → `dibuat`; verifikasi publik 200 tanpa field keuangan; unduh tanpa sesi 401).

PROGRESS: §7n.

### Batch 6 — Etalase premium & SKU Plus tahunan

- Ganti SKU 30 hari → `plus` 365 hari (§1.1): `lib/langganan/index.ts` (`HARGA_BULANAN_IDR`, `PERIODE_HARI`, `HARGA_TAMPIL` → dibaca dari `katalog.ts`), `POST /api/langganan/bayar` (`periode_hari` 365, `harga_idr` 149000, `kode` `plus`), webhook (`perpanjangLangganan` dengan hari dari `kode`), teks `components/premium/premium-view.tsx` (`KartuTawaran`, `Pagar`, `FITUR`, `GRATIS_SELAMANYA`), dan `/syarat-ketentuan` + `/pengembalian-dana` bila menyebut "30 hari". Langganan lama `tidak_aktif` dibiarkan. Masa coba 7 hari (`MASA_COBA_HARI`, `langganan_mulai_coba`) tetap. `KUOTA_BULANAN` Riset/Konten tetap.
- Isi `/premium` sesuai §1.3 poin 6: urutan kartu = Berkas (label peran) → Plus → (Pajak, Fase B) → "Termasuk dalam Plus: Riset tren & Generator Konten" → `GRATIS_SELAMANYA` ditambah "Kesiapan Catatan" dan "Segel laporan". Riset & Konten tetap di tempatnya dengan gerbang 402/429 yang ada; teks ajakannya diarahkan ke Plus tahunan.
- Kartu "Fitur premium" di `app/(app)/akun/page.tsx` (baris ~148–165, `Link` ke `/premium` dengan ikon `Sparkles`, teks "Riset tren, peluang usaha, dan generator konten.") → "Langganan & berkas" (§1.3 poin 5): status Plus/masa coba, daftar berkas dengan unduh ulang, riwayat pembelian, tautan ke `/premium`. Memakai pola baris di `components/account/settings-list.tsx`.
- `middleware.ts` (pengalihan `/riset`, `/konten` → `/premium`) tidak berubah.
- Catat `premium_events` di setiap pratinjau/klik/bayar.
- `test:api` 14 cek langganan yang ada harus tetap hijau dengan durasi baru; tambah cek bahwa order `plus` memberi akses berkas tanpa bayar.

PROGRESS: §7o.

### Batch 7 — Misi rantai "Siap Bank"

- Tiga misi `tipe: once` di `DEFAULT_MISSIONS` (`lib/missions/index.ts`): `aktif_30` "30 hari aktif", `aktif_90` "90 hari aktif", `aktif_180` "180 hari aktif" — hari aktif kumulatif (definisi §1.4) dalam 365 hari terakhir. Seed lewat migrasi baru dengan pola `insert … on conflict (code) do update` (0016/0023). Progres di `lib/missions/server.ts` dari `daily_rollups`. Klaim lewat `POST /api/missions/klaim` → `mission_claims` → cron relayer → `MissionRewards` seperti misi lain.
- **Imbalan IDMX: 100 / 150 / 250** (jumlah 500 ≈ 9% dari 12 × `CAP_BULANAN_IDMX` 450). Cocokkan dengan `docs/PERINTAH-AGEN-FINAL.md` §0.1; bila §0.1 menetapkan angka berbeda untuk misi sekali-seumur-akun, §0.1 yang menang dan selisihnya dicatat. `CAP_HARIAN_IDMX`/`CAP_BULANAN_IDMX` dan kontrak **tidak diubah**. Bila klaim misi ini membentur cap bulanan di kontrak, UI menampilkan "Jatah bulan ini penuh — klaim bulan depan" (bukan galat), dan klaim tetap bisa dilakukan bulan berikutnya. Misi lama tidak diubah.
- Langkah terakhir di kartu misi 180 hari: tautan "Buat <label>" ke pintu Laporan (bukan pembelian di dalam Misi).
- UI memakai kartu misi yang ada. `test:misi` dijalankan (butuh anvil; bila tidak tersedia, catat di "Butuh tangan PO" dan buktikan lewat `test:api` seksi misi).

PROGRESS: §7p.

### Batch 8 — Proxy RPC same-origin & pembacaan sisi server (utang pra-mainnet)

- `POST /api/rpc/opbnb` dan `POST /api/rpc/bsc`: JSON-RPC pass-through dengan **allowlist method** (`eth_chainId, eth_blockNumber, eth_call, eth_estimateGas, eth_gasPrice, eth_maxPriorityFeePerGas, eth_getBalance, eth_getTransactionCount, eth_getTransactionReceipt, eth_getTransactionByHash, eth_sendRawTransaction, eth_getLogs` dengan rentang blok ≤ 2.000, `eth_feeHistory`), tolak batch >10, batas laju per sesi/IP dengan pola `catat_rate_inc` (0028) — fungsi baru `rpc_rate_inc`, ukuran body ≤ 64 KB, timeout upstream 8 dtk. Upstream = `daftarRpc()` di `lib/chains/rpc.ts`; env server-side baru `OPBNB_RPC_URL_SERVER` / `BSC_RPC_URL_SERVER` (kunci penyedia berbayar, opsional; bila kosong pakai daftar resmi). Kunci tidak pernah ke klien. Rute ini `NetworkOnly` di service worker seperti `/api/*` lain.
- `GET /api/swap/keadaan`: kedua kaki (opBNB: saldo/jatah/izin · BSC: kurs/fee) dibaca server-side, cache 10 dtk per alamat, respons memuat `pada` (epoch) dan status per kaki. `swap-sheet.tsx` memakai rute ini; "Coba lagi" memanggil ulang rute; fallback ke pembacaan browser lewat proxy bila rute gagal.
- Transport klien viem (`lib/swap/client.ts`) dan konfigurasi chain Privy diarahkan ke proxy same-origin; daftar RPC publik tetap sebagai cadangan terakhir.
- `test:swap` + `test:api` seksi rpc (method di luar allowlist → 400; batch 11 → 400; laju → 429).
- Perbarui `.env.local.example` dan `docs/RUNBOOK-ADMIN.md`.

PROGRESS: §7q. **Setelah Batch 8: push, tulis laporan antara (format §0.5) sebagai pesan, lalu LANJUT ke Fase B tanpa menunggu.**

---

## 3. Batch Fase B — berurutan, lanjutan run yang sama

Prinsip Fase B: pencatatan per peran **gratis** (ia bagian Catat); yang premium hanya dokumen/rekapnya. Setiap batch tetap melewati §0.3.

### Batch 9 — Modul Pajak OP ("Paket Pajak Tahunan")

Dasar: PP 20/2026 (PPh Final 0,5% WP OP tanpa batas waktu; pengecualian omzet kumulatif Rp500 juta/tahun; setor paling lambat tanggal 15 bulan berikutnya; lampiran SPT = rincian peredaran bruto per bulan). **Format resmi formulir belum diverifikasi** — tabel yang dibuat diberi judul "Rincian Peredaran Bruto per Bulan (bahan pengisian SPT)", bukan mengaku formulir resmi.

- Gratis: di Laporan, baris "Omzet tahun ini: Rp X dari batas bebas Rp500 juta" (omzet = pemasukan usaha confirmed, tahun kalender) + alarm non-blokir saat melewati Rp500 juta ("mulai bulan ini kena PPh Final 0,5%"). Pengaturan di Akun: "Saya wajib pajak orang pribadi" (default mati; bila mati, baris omzet tetap tampil tanpa kalimat pajak).
- Premium `pajak` (termasuk Plus): kalkulator setoran bulanan 0,5% atas omzet bulan ber-sangkutan setelah melewati batas; pengingat tanggal 15 (in-app + push bila tersedia; WA tidak); PDF "Rincian Peredaran Bruto per Bulan" satu tahun pajak; PDF "Surat Pernyataan Omzet di Bawah Rp500 Juta" (template dengan nama, NPWP yang **diketik pengguna saat membuat dan tidak disimpan**, tahun pajak, tanda tangan kosong). Keduanya ter-notarisasi hash seperti Berkas.
- Setiap layar pajak memuat: "Bukan nasihat pajak. Cocokkan dengan Coretax atau konsultan pajak."
- Dilarang: menghitung PPh untuk badan (CV/PT), menyimpan NPWP/NIK, mengirim apa pun ke DJP.

PROGRESS: §7r.

### Batch 10 — Ojol: sumber pendapatan per platform & biaya kendaraan (gratis)

- Parser (`lib/parse/llm.ts` `PARSER_SCHEMA`, `lib/parse/fallback.ts`, `lib/parse/validate.ts`): untuk entri `kategori = ojek`, isi `sub_kategori` dengan platform ternormalisasi (`gojek|grab|maxim|indrive|shopeefood|lainnya`); kalimat tanpa platform → `sub_kategori` null. **Tanpa kolom baru** — `transactions.sub_kategori` sudah ada. Pengeluaran kendaraan memakai `KATEGORI_KELUAR` yang ada (`transportasi`, `operasional`, `peralatan`) dengan `sub_kategori` `bbm|servis|cicilan|sewa|kuota|parkir`. Korpus baru `tests/parser-ojol.json` (≥25 kasus, hari acuan sama dengan korpus utama: 2026-08-12); korpus 200 tidak diubah.
- Laporan untuk `earner_type = ojol`: rekap bulanan per platform (kotor), total pengeluaran kendaraan, "bersih harian rata-rata" (= (pemasukan − pengeluaran usaha) ÷ hari aktif). Tanpa kata "laba".
- Berkas Pengajuan untuk ojol memuat tabel per platform di halaman ringkasan.
- Tidak ada OCR screenshot di batch ini; siapkan tipe impor CSV `lib/impor/ojol.ts` dengan skema kolom generik (tanggal, platform, kotor, potongan, bersih) **tanpa UI** — menunggu format "catatan per layanan" aplikator (≈2027).

PROGRESS: §7s.

### Batch 11 — Freelance/jasa: Klien, Invoice, dan bukti potong

- Gratis: invoice & kuitansi PDF sederhana (nomor otomatis, klien, uraian, nominal, jatuh tempo, status) + bagikan PDF via Web Share API (fallback unduh); piutang per klien memakai tabel `kasbon` yang ada (kasbon = piutang; tambahkan kolom nullable `kasbon.invoice_id` → tabel baru `invoices`). DP/deposit = transaksi pemasukan `kategori = jasa` dengan `sub_kategori = 'uang_muka'` (tanpa kolom baru).
- Premium (bagian `pajak`/Plus): tracker bukti potong per klien per pembayaran (`nihil|terpotong`, nominal potongan, nomor bukti potong boleh disimpan — ia nomor dokumen, bukan identitas), rekap tahunan untuk SPT dalam PDF Rincian Peredaran Bruto (Batch 9).
- Tanpa e-Meterai, tanpa integrasi Coretax.

PROGRESS: §7t.

### Setelah Batch 11

Laporan akhir §0.5. Tidak ada batch lain. Yang **tidak** dikerjakan di run ini dan tidak boleh dimulai sendiri: rekonsiliasi marketplace (#3 riset), multi-usaha (#6), HPP (#7), arsip >12 bulan (#8), Asisten Laporan (#9), ringkasan WA (#10), OCR, mainnet, multisig, audit.

---

## 4. Ringkasan bukti dari riset (untuk konteks agen; rincian di dokumen riset)

- Tidak satu pun aplikasi pembukuan mikro Indonesia berhasil menjual langganan ke pelaku solo (BukuKas/Lummo ditutup, BukuWarung → agen EDC/PPOB, CrediBook → grosir B2B, Qasir mencabut gratis permanen). Yang laku: dokumen/peristiwa dengan tenggat dan nilai uang: KUR ≤Rp100 juta tanpa agunan dengan bukti 6 bulan (ojol: printout 6 bulan "pengganti pembukuan"), omzet kumulatif vs Rp500 juta (PP 20/2026), tarif marketplace yang berubah.
- Tetap gratis karena pasar menggratiskannya: kasbon dasar, nota WA, stok dasar (tidak dibangun), P&L bulanan + PDF 1 bulan, pemisahan usaha/pribadi, segel, Kesiapan, OCR berkuota, bot WA masuk.
- Tidak ada bank/PKA yang mengakui hash on-chain → segel dipasarkan sebagai kepercayaan pengguna dan jawaban atas "data hilang", bukan syarat bank.
- Tidak ada survei WTP → harga §1.1 adalah titik uji, bukan kepastian; `premium_events` ada untuk itu.
