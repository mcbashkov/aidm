# PRD — AIDM
**Agen AI Pencatatan Keuangan & Bankability untuk Pelaku Mikro Indonesia · dApp Ekosistem IDM Reborn**
Versi 3.0 · Agustus 2026 · Penyusun: MC Basyar (Product Owner) + Claude
Status: **Final untuk build** (PWA web · mobile · tablet + Google Play + iOS App Store)
Alur kerja: PRD ini → Claude Code (build & integrasi)

---

## 0. Ringkasan Perubahan dari v2.0 (WAJIB DIBACA AGEN)

**Ini adalah PIVOT IDENTITAS PRODUK, bukan penambahan fitur.**

| Aspek | v2.0 (lama) | v3.0 (berlaku) |
|---|---|---|
| Jantung produk | Agen riset intelijen pasar | **Pencatatan keuangan → bankability** |
| Tagline internal | "Riset pasar, dalam satu tanya" | **"Catat usahamu, dalam satu ucap"** |
| Tab inti | Riset | **Catat** |
| Tab kedua | Konten (generator) | **Laporan** (laporan keuangan) |
| Riset pasar | Fitur utama, gratis-harian | **Fitur premium** (satelit, di balik Kredit AI) |
| Generator konten | Fitur MVP | **Fitur premium** (satelit) |
| Target pengguna | UMKM + calon wirausaha | **Pelaku mikro definisi diperluas** (UMKM, ojol, freelancer, penjual online) |
| Biaya AI inti | Mahal (riset multi-tool) | **Murah** (parsing kalimat pendek) |
| Baris "Out of scope" | "Fitur pencatatan keuangan — di luar fokus AIDM" | **DIHAPUS — kini justru fitur inti** |

**Yang TIDAK berubah dan tidak boleh dibongkar:** seluruh sistem desain (§13), palet ivory-emas gaya Alma, tipografi Fraunces + Plus Jakarta Sans, auth Privy + embedded wallet, struktur 3 token, ekonomi Kredit AI, arsitektur PWA + TWA + Capacitor, target DappBay. **Build frontend yang sudah ada dipertahankan** — yang diganti adalah isi tab, bukan kerangka aplikasi.

**Kode yang sudah ada:** rute `/riset` → jadi `/catat`; rute `/konten` → jadi `/laporan`. Logika agen riset **tidak dihapus** — dipindahkan ke belakang paywall Kredit AI (§7.8).

---

## 1. Ringkasan Produk

**AIDM** adalah dApp pencatatan keuangan berbasis percakapan untuk pelaku usaha mikro Indonesia. Pengguna mencatat pemasukan dan pengeluaran dengan **kalimat biasa atau suara** — "jual 3 nasi goreng 45rb bayar QRIS", "narik hari ini dapet 180rb, bensin 25rb" — dan agen AI mengubahnya menjadi catatan keuangan terstruktur. Dari catatan itu aplikasi menyusun **laporan keuangan** yang bisa dicetak dan dibawa ke bank/koperasi untuk mengajukan KUR.

Prinsip produk: **"buku usaha tanpa ribet yang diam-diam membuat pelaku mikro bankable."** Pengguna merasa sedang mencatat; sistem sedang membangun jejak data yang bisa dibaca lembaga keuangan.

AIDM adalah **project crypto secara terbuka** di opBNB, prinsip Web3 "proud but calm": identitas crypto tampil bangga di lapisan wallet, reward, dan bukti on-chain — sementara alur mencatat harian tetap bersih tanpa jargon. Tiga pilar Web3-nya tidak berubah dari v2.0:

1. **Punya akun = punya wallet.** Otomatis sejak daftar, tanpa seed phrase, gas disponsori.
2. **Aktivitas riil diberi reward IDMX**, ditukar ke Token IDM Reborn via pool resmi.
3. **Kredit AI dibeli dengan uang saja** — tidak pernah dari token (kepatuhan store + pemisahan ekonomi).

Pilar Web3 keempat yang **baru di v3.0**:

4. **Laporan keuangan disegel on-chain (hash saja).** Data keuangan tetap privat di database; hanya sidik jari kriptografisnya yang ditulis ke opBNB sebagai bukti anti-utak-atik. Aksi menyegel = misi berhadiah IDMX (§7.5).

**Fakta kunci:**
- **Platform:** PWA satu codebase (mobile/tablet/desktop) + Google Play (TWA) + App Store (Capacitor).
- **Bahasa:** Indonesia.
- **Jaringan:** opBNB.
- **Target strategis:** ranking DappBay lewat UAW riil (klaim misi + segel laporan + tukar token).
- **Nada dua-audiens:** bahasa data/bankability untuk bank, regulator, dan Kementerian UMKM (kripto tidak diangkat); crypto-forward untuk pengguna aplikasi, holder, dan DappBay. Satu produk, dua bahasa — jangan dicampur di materi yang sama.

## 2. Latar Belakang & Masalah

1. **Kesenjangan kredit UMKM melebar, bukan menyempit.** Porsi kredit UMKM terhadap total kredit perbankan turun dari ±20,9% (Jan 2023) ke ±17% (2026), bahkan sempat terkontraksi saat kredit nasional tumbuh ~10%. Porsi kredit UMKM terhadap PDB turun dari 7,20% (2021) ke 6,66% (2025).
2. **Akar masalahnya informasi, bukan modal.** Bank tidak bisa menilai apa yang tidak bisa dilihat. Korporasi datang dengan laporan teraudit; pelaku mikro datang dengan ingatan. Kredit mengalir ke yang paling mudah dibaca, bukan yang paling butuh.
3. **Literasi keuangan bergerak terlalu lambat lewat pelatihan.** Indeks literasi keuangan nasional 66,46% vs inklusi 80,51% (SNLIK 2025) — selisih ~14 poin, naik hanya ~1 poin/tahun meski program penyuluhan sudah berjalan lebih dari satu dekade. Pendekatan kelas dan seminar tidak akan mengejar. **Literasi harus tertanam di alat kerja harian, bukan diajarkan di ruang kelas.**
4. **Definisi UMKM sedang diperluas negara.** Perpres 27/2026 (berlaku 1 Juli 2026) menetapkan ~2,8 juta pengemudi ojol roda dua sebagai pengusaha mikro, mewajibkan pilar pelatihan **manajemen keuangan**, dan membuka akses **KUR mikro bunga 3%**. Ini menciptakan jutaan pengguna baru yang secara regulasi *diwajibkan* melek keuangan — dan belum punya alatnya.
5. **Adopsi crypto Indonesia butuh use case non-spekulatif.** Pencatatan harian memberi frekuensi pemakaian yang jauh lebih tinggi daripada riset pasar (harian vs sesekali) → metrik UAW yang sehat untuk DappBay.

## 3. Tujuan & Metrik Sukses

| Tujuan | Metrik | Target 6 bln pasca-launch |
|---|---|---|
| Adopsi | Pengguna terdaftar (semua ber-wallet) | 50.000 |
| **Pemakaian inti** | **Transaksi tercatat / hari** | **20.000** |
| **Kebiasaan** | **% user aktif mencatat ≥ 4 hari/minggu** | **≥ 35%** |
| Retensi | D30 retention | ≥ 30% (naik dari 20% v2.0 — pencatatan harian menopang) |
| Bankability | User dengan ≥ 3 bulan data berturut | 5.000 |
| Monetisasi | Konversi free → beli kredit (fitur premium) | ≥ 3% |
| On-chain | UAW harian (klaim misi + segel laporan + tukar) | 1.500+ |
| Token | Volume tukar IDMX→IDM Reborn | tumbuh konsisten bulanan |
| Ranking | Posisi DappBay | terdaftar M6 → naik merebut top kategori |
| Distribusi | Rating Play & App Store | ≥ 4,5; crash rate < 1% |

**Metrik utara (north star): jumlah transaksi tercatat per hari.** Semua keputusan produk yang menaikkan angka ini menang; yang menurunkannya ditolak — termasuk fitur bagus yang menambah friksi mencatat.

## 4. Target Pengguna & Persona

**Sasaran resmi:** pelaku mikro dalam definisi yang diperluas negara — siapa pun yang **penghasilannya adalah usahanya**. Bukan "UMKM saja", bukan pula "semua orang untuk budgeting pribadi".

**P1 — Pedagang mikro ("Bu Sari", 34, warung/kuliner rumahan).** Omzet harian kecil dan sering, uang usaha bercampur uang dapur, tidak pernah tahu untung bersih. Butuh: catat cepat sambil melayani pembeli, tahu untung bulan ini, bukti untuk ajukan KUR.

**P2 — Pengemudi ojol ("Pak Budi", 41, roda dua).** Baru berstatus pengusaha mikro (Perpres 27/2026). Penghasilan harian, potongan bensin/servis/pulsa. Butuh: tahu sisa bersih harian, akses KUR 3%. **Persona baru di v3.0 — sebelumnya tidak ada.**

**P3 — Freelancer / penjual online ("Rina", 26).** Pemasukan tidak rutin dari beberapa klien/marketplace, pengeluaran alat & iklan. Butuh: rekap arus kas, bukti penghasilan untuk pinjaman.

**P4 — Seller serius / crypto-native ("Andi", 28).** Rajin klaim misi, termotivasi menukar IDMX, tertarik staking (Fase 2). Sumber aktivitas on-chain fase awal. **Persona premium** — pengguna utama fitur riset pasar berbayar.

**P5 (Fase 3) — B2B:** koperasi, BPR, fintech lending, pemda → API verifikasi rekam usaha.

## 5. Positioning & Kompetitor

- **BukuWarung / BukuKas:** paling dekat. Kelemahannya: input berbasis formulir/keypad, fokus pada utang-piutang, tidak ada lapisan AI percakapan, tidak ada bukti on-chain, tidak menjangkau persona ojol/freelancer. **Diferensiasi AIDM: catat dengan bicara, bukan mengetik form.**
- **Aplikasi keuangan pribadi (Money Lover, Finansialku):** untuk karyawan mengatur budget, bukan pelaku usaha; tidak menghasilkan laporan yang bisa dibawa ke bank.
- **Excel / buku tulis:** masih pesaing terbesar di lapangan. Dikalahkan dengan kecepatan (satu kalimat) dan output otomatis.
- **ChatGPT/AI umum:** bisa parsing tapi tidak menyimpan, tidak meringkas jadi laporan, tidak ada bukti, tidak ada ekonomi reward.
- **Diferensiasi inti AIDM:** (a) mencatat dengan bahasa manusia & suara — friksi mendekati nol, (b) output = laporan keuangan siap ajukan KUR, (c) bukti integritas on-chain, (d) reward IDMX yang membayar kebiasaan mencatat, (e) riset pasar sebagai lapisan premium yang tidak dimiliki kompetitor pembukuan.

## 6. Ruang Lingkup

### MVP / Rilis pertama (semua WAJIB fungsional)
1. Onboarding email/HP/Google + wallet otomatis (gasless) — **tidak berubah dari v2.0**
2. **Catat: pencatatan transaksi via percakapan teks & suara** (fitur inti baru)
3. **Laporan Keuangan: ringkasan bulan, arus kas, kategori, porsi terverifikasi, ekspor PDF**
4. **Segel Laporan on-chain (hash attestation) + badge terverifikasi**
5. Sistem Kredit AI: gratis harian + pembelian dengan uang — **catat & laporan TIDAK memakai kredit**
6. Misi & Reward IDMX (klaim gasless) — pemicu misi disesuaikan ke aktivitas mencatat
7. Tukar IDMX → Token IDM Reborn (pool resmi) — **tidak berubah**
8. Riwayat transaksi (daftar, filter, edit, hapus)
9. Profil, pengaturan, kartu wallet — **tidak berubah**
10. Panel admin minimum — **tidak berubah**
11. **Riset Pasar & Generator Konten sebagai fitur premium** (kode v2.0 dipertahankan, dipindah ke balik kredit)

### Fase 2
- **Kasbon** (utang-piutang: piutang pelanggan, utang supplier, jatuh tempo, pengingat WA, tandai lunas)
- **Katalog produk & harga modal** (opsional → membuka perhitungan margin/untung bersih)
- **Skor Kesiapan Pinjaman** (§7.4 — spesifikasi sudah disiapkan, rilis setelah data pengguna cukup)
- Foto nota → OCR → entri otomatis
- Bot WhatsApp (catat lewat chat WA)
- Staking IDM Reborn → tier; referral berhadiah IDMX

### Fase 3
- **Valuasi usaha** (terbuka setelah ≥ 6 bulan data — §7.9)
- Integrasi QRIS/rekening bank (tarik transaksi otomatis → verifikasi pihak ketiga sesungguhnya)
- API B2B verifikasi rekam usaha untuk koperasi/BPR/fintech + endpoint MCP
- Price tracker terjadwal

### Out of Scope (tegas)
- **Penilaian kelayakan kredit / credit scoring** — AIDM TIDAK menilai kelayakan, hanya kelengkapan catatan (§7.4). Ini batas hukum, bukan preferensi.
- Menampilkan data keuangan pengguna di on-chain (hanya hash — §9.4)
- Menjadi lembaga penyalur pinjaman atau perantara pinjaman
- Trading, DEX, chart harga token di dalam aplikasi
- Membeli Kredit AI dengan token; menjual token in-app
- Custody dana rupiah
- Menyentuh Native Token (IDM lama)
- Scraping kontinyu 24/7 (riset premium tetap on-demand)

---

## 7. Fitur Fungsional MVP

### 7.1 Onboarding & Wallet Otomatis

**Tidak berubah dari v2.0**, kecuali layar pilih peran.

**Alur.**
1. Landing → Masuk/Daftar → email (OTP) / HP (OTP) / Google.
2. Privy membuat wallet EVM otomatis di balik layar (tanpa seed phrase terlihat).
3. **Layar peran (DIUBAH):** "Kamu berpenghasilan dari mana?" → pilihan kartu: **Dagang/warung · Ojek online · Freelance/jasa · Jualan online · Lainnya**. (Menggantikan "Saya mau mulai usaha / Saya sudah punya usaha".)
4. Layar kategori & kota (tetap, taksonomi §10).
5. Masuk Beranda; kredit gratis harian aktif.

**AC.**
- [ ] Nol sampai Beranda ≤ 60 detik, tanpa istilah wallet/seed/gas di alur.
- [ ] 100% akun baru punya wallet address tersimpan terhubung `user_id`.
- [ ] Login ulang di perangkat lain memulihkan akun + wallet sama.
- [ ] Peran (`earner_type`) tersimpan dan dipakai sebagai konteks parser (§7.2).

---

### 7.2 CATAT — Pencatatan via Percakapan (FITUR INTI)

**Deskripsi.** Antarmuka chat tempat pengguna menceritakan apa yang terjadi dengan kalimat biasa atau suara. Agen mengurai jadi entri transaksi terstruktur, menyimpannya, lalu menampilkan kartu konfirmasi ringkas. **Ini pembalikan dari tab Riset lama: dulu user bertanya dan agen menjawab; sekarang user memberi tahu dan agen mencatat.**

**Enam prinsip desain (mengikat, jangan dilanggar):**

1. **Satu kalimat boleh menghasilkan banyak entri.** Parser mengembalikan array. "Narik dapet 180rb, bensin 25rb" = 2 entri.
2. **Optimistic save + kartu konfirmasi.** Entri langsung tersimpan; kartu menampilkan hasil bacaan dengan opsi ketuk untuk koreksi/hapus. BUKAN formulir yang harus disubmit.
3. **Kalau ragu, tanya SATU hal saja.** Nominal hilang → tanya nominal. Jangan tanya kategori + metode bayar + tanggal sekaligus.
4. **Metode bayar dideteksi & disimpan** (`tunai` default, `qris`, `transfer`, `ewallet`). Ini yang mengisi porsi terverifikasi di laporan.
5. **GRATIS — nol Kredit AI.** Mencatat tidak pernah memotong kredit. Ini keputusan ekonomi inti: pencatatan adalah pengait harian, monetisasi ada di lapisan premium.
6. **Suara & offline sejak MVP.** Web Speech API on-device (gratis) → teks → pipeline sama. Entri offline diantrekan lokal (IndexedDB) dan disinkronkan saat online.

**Alur.**
1. User mengetik atau menekan tombol mikrofon dan berbicara.
2. Teks masuk → panggil parser LLM murah (model kelas Haiku) dengan konteks profil (`earner_type`, kategori, kota) + tanggal hari ini.
3. Parser mengembalikan array entri (skema §17.1).
4. **Validasi server-side** (bukan hanya percaya LLM): nominal harus angka positif, jenis harus `masuk`/`keluar`, kategori harus ada di taksonomi, tanggal tidak boleh di masa depan.
5. Entri tersimpan ke `transactions` → kartu konfirmasi muncul di chat: `Masuk Rp180.000 · Ojek · Tunai` + tautan kecil "Ubah".
6. Jika ada field wajib hilang → agen mengajukan **satu** pertanyaan klarifikasi; entri disimpan sebagai `draft` sampai terjawab.
7. Chip saran di atas kolom input, kontekstual per `earner_type` (contoh ojol: "Setoran hari ini", "Isi bensin"; contoh warung: "Penjualan hari ini", "Belanja stok").

**Ketentuan.**
- Parsing p90 ≤ 3 detik. Kalau LLM gagal/timeout → fallback ke parser regex sederhana (angka + kata kunci masuk/keluar) sehingga entri tetap bisa tersimpan; tandai `parsed_by='fallback'`.
- Format angka Indonesia wajib dikenali: `45rb`, `45.000`, `45k`, `Rp45.000`, `1,5jt`, `2 juta`.
- Waktu relatif dikenali: "kemarin", "tadi pagi", "minggu lalu" → tanggal absolut.
- Kategori otomatis dari taksonomi; jika tidak yakin → `lainnya` (jangan mengarang kategori baru).
- **Dilarang mengarang nominal.** Kalau angka tidak ada di kalimat, tanya — jangan menebak.
- Batas anti-abuse: maks 200 entri/user/hari.

**AC.**
- [ ] "jual 3 nasi goreng 45rb bayar QRIS" → 1 entri: masuk, 45000, kuliner, qris.
- [ ] "narik hari ini dapet 180rb, bensin 25rb" → 2 entri: masuk 180000 (ojek, tunai) + keluar 25000 (bensin/operasional, tunai).
- [ ] "beli beras" (tanpa nominal) → agen bertanya nominal saja, tidak lebih.
- [ ] Input suara → teks → entri tersimpan, tanpa biaya server tambahan.
- [ ] Entri dibuat saat offline tersimpan lokal dan tersinkron otomatis ≤ 30 detik setelah online.
- [ ] Mencatat tidak pernah memotong Kredit AI (`credit_ledger` tidak bertambah baris untuk aksi catat).
- [ ] Entri bisa diedit dan dihapus dari kartu konfirmasi maupun dari tab Laporan.
- [ ] Parsing p90 ≤ 3 detik; fallback aktif saat LLM gagal.

---

### 7.3 LAPORAN — Laporan Keuangan

**Deskripsi.** Tab yang mengubah entri mentah jadi gambaran usaha. Semua angka **dihitung otomatis** dari `transactions`; tidak ada input manual tambahan. **Seluruh perhitungan adalah SQL/aritmetika — nol biaya AI.**

**Isi layar (urutan dari atas):**
1. **Pemilih periode** — Bulan ini (default) · Bulan lalu · 30 hari · Rentang khusus.
2. **Kartu ringkasan** — Pemasukan · Pengeluaran · **Sisa (laba kotor)**, angka besar serif, perbandingan terhadap periode sebelumnya (naik/turun %).
3. **Grafik arus kas** — batang harian atau garis mingguan (masuk vs keluar).
4. **Rincian kategori** — 5 teratas per jenis, dengan nominal dan persentase.
5. **Porsi terverifikasi** — bar/donut: % nilai transaksi lewat QRIS/transfer vs tunai, dengan satu kalimat penjelas ("Transaksi lewat QRIS lebih dipercaya lembaga keuangan").
6. **Kartu Segel Laporan** (§7.5) — status tersegel/belum + tombol Segel + hash pendek bila sudah.
7. **Tombol Unduh PDF.**

**Isi PDF (yang dibawa ke bank — struktur mengikuti kebutuhan penilai KUR):**
- Kop: nama usaha, jenis usaha, kota, periode laporan, tanggal cetak.
- Ringkasan: total pemasukan, pengeluaran, sisa, rata-rata omzet bulanan, jumlah hari aktif tercatat.
- Tabel arus kas per bulan (hingga 12 bulan terakhir bila ada).
- Rincian kategori pemasukan & pengeluaran.
- Porsi transaksi terverifikasi (QRIS/transfer) dalam % dan nominal.
- **Blok verifikasi:** hash laporan, tanggal segel, alamat kontrak & tautan explorer opBNB, plus kalimat baku: *"Verifikasi ini membuktikan laporan tidak berubah sejak disegel. Verifikasi ini bukan audit dan bukan penilaian kelayakan kredit."*
- Footer wajib: *"Laporan ini disusun mandiri oleh pemilik usaha melalui aplikasi AIDM."*

**Ketentuan.**
- Semua agregasi server-side; tidak mengirim seluruh transaksi ke klien untuk dihitung di browser.
- Periode tanpa data → empty state yang mengajak mencatat, bukan grafik kosong.
- Angka rupiah format Indonesia (titik ribuan), tanpa desimal.
- Laba **kotor** di MVP (pemasukan − pengeluaran). Laba bersih/margin menunggu katalog harga modal (Fase 2) — jangan menampilkan istilah "laba bersih" sebelum HPP ada.

**AC.**
- [ ] Ringkasan, grafik, kategori, dan porsi terverifikasi konsisten dengan data `transactions` untuk periode terpilih (uji dengan dataset seed).
- [ ] Layar Laporan render p90 ≤ 1,5 detik untuk user dengan 5.000 transaksi.
- [ ] PDF ter-generate ≤ 10 detik, terbaca rapi di A4, memuat semua blok wajib termasuk kalimat baku verifikasi.
- [ ] Membuka Laporan tidak memotong Kredit AI.
- [ ] Transaksi bisa diedit/dihapus dari daftar di dalam Laporan, dan angka ikut berubah seketika.

---

### 7.4 Skor Kesiapan Pinjaman (SPESIFIKASI SIAP — RILIS FASE 2)

> **Catatan untuk agen: JANGAN bangun di MVP.** Spesifikasi ditulis lengkap di sini agar struktur data MVP sudah menampungnya. Rilis setelah basis pengguna punya cukup riwayat.

**Prinsip mengikat:** skor mengukur **kelengkapan catatan**, BUKAN kelayakan kredit. Bahasa UI wajib "siap diajukan", dilarang "pasti disetujui" / "kamu layak". Ini menjauhkan produk dari ranah credit scoring berizin dan dari janji yang tak bisa ditepati.

**Lima komponen (total 100):**

| Komponen | Bobot | Rumus |
|---|---|---|
| Catatan penjualan | 25 | `min(hari_aktif_catat / 20, 1) × 25` (basis 30 hari terakhir) |
| Pola arus kas | 20 | `<14 hari data = 0` · `14–29 = 10` · `≥30 = 20` |
| Kasbon terkelola | 20 | `8 (jika ada kasbon aktif) + 12 × rasio_piutang_lunas` |
| Porsi terverifikasi | 25 | `min(porsi_qris_transfer / 0,6 , 1) × 25` |
| Untung terlacak (opsional) | 10 | `(produk_ber_HPP / total_produk) × 10` |

**Tingkatan:** Baru Mulai (0–39) · Tercatat Rapi (40–69) · Siap Diajukan (70–89) · Bankable (90–100).

**Fitur "Satu langkah lagi":** tampilkan aksi terdekat yang menaikkan skor paling banyak (hitung selisih potensi tiap komponen, ambil tertinggi).

**Reward:** IDMX diberikan **per kenaikan tingkatan (milestone), bukan per poin** — mencegah farming dengan transaksi palsu yang akan merusak nilai data. Sekali per tingkatan, tidak bisa diulang.

---

### 7.5 Segel Laporan On-Chain (Hash Attestation)

**Deskripsi.** Pengguna dapat "menyegel" laporan satu periode. Sistem menghitung hash dari laporan lalu menuliskannya ke kontrak di opBNB. **Data keuangan TIDAK PERNAH ditulis ke chain — hanya hash-nya.**

**Kenapa demikian (jangan diubah oleh agen):** opBNB bersifat publik dan permanen. Menulis omzet, utang, atau penjualan harian ke sana membuatnya terbaca siapa pun selamanya dan tak bisa dihapus — melanggar ekspektasi privasi pengguna dan UU PDP. Hash memberi seluruh manfaat pembuktian tanpa membocorkan apa pun.

**Alur.**
1. Di tab Laporan → tombol **"Segel Laporan [periode]"**.
2. Server menyusun **kanonikalisasi laporan** (JSON deterministik — urutan kunci tetap, angka integer rupiah, timezone WIB) lalu menghitung `SHA-256`.
3. Kirim transaksi ke `ReportAttestation.sol` (gasless, disponsori treasury): `attest(bytes32 periodKey, bytes32 reportHash)`.
4. Simpan `tx_hash`, `sealed_at`, `report_hash` ke tabel `report_seals`.
5. UI menampilkan badge **"Tersegel & Terverifikasi"** + hash pendek + tautan explorer. PDF ikut memuat blok verifikasi.
6. Misi "Segel laporan bulan ini" terpicu → reward IDMX.

**Cara verifikasi pihak ketiga (bank):** bank menerima PDF, menghitung ulang hash dari data kanonik yang tercantum, lalu mencocokkan ke on-chain. Cocok = laporan tidak berubah sejak tanggal segel.

**Kejujuran teknis yang WAJIB tercermin di UI dan materi penjualan:** hash membuktikan **integritas + keberadaan pada waktu tertentu**, BUKAN kebenaran angkanya. Pengguna secara teknis bisa menyegel data karangan. Yang membuktikan transaksi benar terjadi adalah **integrasi QRIS/bank (Fase 3)**. Dilarang keras memasarkan segel sebagai "laporan terverifikasi/teraudit blockchain" dalam arti angkanya sudah benar.

**Ketentuan.**
- Satu periode boleh disegel ulang (mis. setelah koreksi); simpan semua versi, tandai yang terakhir `is_latest`. Riwayat segel justru menambah kredibilitas, bukan mengurangi.
- Segel hanya untuk periode yang sudah lewat (tidak bisa menyegel bulan berjalan).
- Gas disponsori (aksi ini membangun ekosistem, bukan mengambil nilai — sejalan kebijakan §7.1).

**AC.**
- [ ] Hash yang sama dihasilkan untuk data yang sama (deterministik lintas server & waktu).
- [ ] Satu angka diubah → hash berbeda total → verifikasi gagal (uji regresi wajib).
- [ ] Tidak ada satu pun nilai nominal, nama, atau kategori pengguna yang terkirim dalam kalkulasi transaksi on-chain (audit payload).
- [ ] Segel sukses ≤ 60 detik, badge & hash tampil, misi terpicu.
- [ ] Blok verifikasi di PDF memuat kalimat baku pembatas (bukan audit, bukan penilaian kelayakan).

---

### 7.6 Misi & Reward IDMX

**Tidak berubah mekanismenya** dari v2.0 (voucher signed, klaim gasless, cap harian). Yang berubah: **pemicu misi bergeser dari riset ke pencatatan.**

Contoh misi default (configurable admin, IDMX):
- Catat transaksi pertama hari ini — **+20**
- Catat 5 transaksi dalam sehari — **+50**
- Catat 7 hari beruntun — **+100**
- Segel laporan bulanan — **+150** (misi bulanan)
- Lengkapi profil usaha — **+50** (sekali)
- (Fase 2) Naik tingkat Skor Kesiapan — **+200** per tingkatan, sekali per tingkatan

Cap total default ≤ 250 IDMX/user/hari (misi bulanan di luar cap harian, cap tersendiri).

**Anti-abuse (diperketat di v3.0 karena mencatat lebih mudah di-spam daripada riset):**
- Misi menghitung transaksi **unik yang valid**: nominal > 0, bukan duplikat persis dalam 60 detik.
- Transaksi yang dihapus dalam 24 jam **membatalkan progres misi** terkait.
- Rate-limit + device fingerprint + deteksi pola nominal seragam berulang.

**AC.**
- [ ] Misi terpicu oleh event pencatatan nyata; klaim menghasilkan tx sukses ≤ 30 detik.
- [ ] Menghapus transaksi mengurangi progres misi terkait.
- [ ] Cap harian ditegakkan di kontrak; replay voucher gagal.

---

### 7.7 Kredit AI, Tukar IDMX, Wallet, Riwayat, Profil

**Seluruhnya tidak berubah dari v2.0** (§7.5, §7.7, §7.9 lama) kecuali dua hal:

1. **Tarif kredit diperbarui** (§8.2) — catat & laporan = 0 kredit.
2. **Riwayat** kini berarti riwayat **transaksi** (dengan filter tanggal/jenis/kategori, pencarian, edit, hapus, ekspor CSV), bukan riwayat riset. Riwayat riset premium tetap ada di dalam menu fitur premium.

---

### 7.8 Fitur Premium (Riset Pasar & Generator Konten)

**Deskripsi.** Seluruh kemampuan agen riset v2.0 **dipertahankan kodenya** dan dipindahkan menjadi fitur premium berbayar Kredit AI. Diakses dari menu **Lainnya/Premium**, bukan dari bottom-nav.

Alasan: biaya AI riset 50–200× lebih mahal daripada parsing pencatatan (ingestion multi-sumber + konteks panjang + model besar). Menggratiskannya membakar uang; menjadikannya premium membuatnya justru sumber pendapatan.

**Isi:** Riset tren on-demand (tools `tiktok_trends`, `google_trends_id`, `marketplace_snapshot`, `web_search`, `corpus_search`), Wizard Peluang Usaha, Generator Konten. Alur, ketentuan, dan AC mengikuti PRD v2.0 §7.2–7.4 tanpa perubahan teknis.

**Perubahan satu-satunya:** tidak ada kuota gratis harian untuk fitur ini; setiap pemakaian memotong kredit sesuai §8.2.

---

### 7.9 Valuasi Usaha (FASE 3 — RANCANGAN ARAH)

> **JANGAN bangun sebelum Fase 3.** Ditulis agar arah produk jelas.

**Alasan ditunda:** valuasi butuh data stabil berbulan-bulan plus data aset/utang yang tidak muncul dari pencatatan harian. Angka valuasi yang salah lebih berbahaya daripada tidak ada angka — pengguna bisa memakainya untuk menawar investor atau menjual usaha.

**Cara menempatkannya sejak MVP (tanpa membangun fiturnya):** di tab Laporan tampilkan kartu terkunci — *"Valuasi usaha terbuka setelah 6 bulan catatan"* dengan progress bar bulan berjalan. Ini mengubah keterbatasan data menjadi mekanik retensi jangka panjang.

**Saat dibangun nanti:** metode kelipatan laba bersih (SDE multiple) per sektor, dengan rentang (bawah–tengah–atas), bukan angka tunggal, dan disclaimer bahwa ini estimasi indikatif bukan penilaian profesional.

---

## 8. Ekonomi Token & Kredit

### 8.1 Struktur 3 Token
**Tidak berubah dari v2.0** — Native Token (IDM lama, tidak disentuh) · Token IDM Reborn (BSC, 1 miliar, pair BNB) · IDMX (opBNB, 10 triliun, reward in-app). Alur nilai dan pemisahan rel kredit/token tetap sama persis.

### 8.2 Parameter Kredit (default — dapat diubah admin)

| Parameter | Nilai default |
|---|---|
| **Catat transaksi (teks/suara)** | **0 kredit — GRATIS selamanya** |
| **Lihat Laporan & unduh PDF** | **0 kredit — GRATIS** |
| **Segel laporan on-chain** | **0 kredit** (gas disponsori) |
| Kredit gratis harian (untuk fitur premium) | 10 kredit (reset 00:00 WIB, tidak menumpuk) |
| Premium: Riset segar | 3 kredit |
| Premium: Riset dari cache | 1 kredit |
| Premium: Wizard Peluang Usaha | 3 kredit |
| Premium: Generator konten | 1 kredit |
| Fase 2: Analisis keuangan mendalam AI ("kenapa untungku turun?") | 2 kredit |
| Paket PWA/web (QRIS/VA) | 50 kredit Rp15.000 · 200 kredit Rp49.000 · 500 kredit Rp99.000 |
| Paket Play/App Store | SKU setara, harga menyerap fee store |

**Prinsip ekonomi v3.0:** pencatatan gratis = pengait harian bermarjin nyaris nol biaya → laporan gratis = nilai yang membuat orang bertahan → premium AI mahal = sumber pendapatan → token = lapisan reward & kepemilikan → B2B API verifikasi (Fase 3) = pendapatan terbesar di belakang.

### 8.3 Parameter Reward & Tukar
**Tidak berubah dari v2.0**, kecuali daftar misi (§7.6) dan tambahan cap terpisah untuk misi bulanan segel laporan.

---

## 9. Arsitektur Teknis

### 9.1 Stack
**Tidak berubah dari v2.0** (Next.js 14+ PWA + Tailwind · Privy · WalletConnect v2 · Supabase Postgres + pgvector + Storage · Claude API · opBNB + viem · Midtrans/Xendit + Play Billing + StoreKit · TWA Bubblewrap · Capacitor · Vercel + Upstash + Sentry), dengan tiga tambahan:

| Lapisan | Tambahan v3.0 |
|---|---|
| AI parsing | **Model kelas Haiku** untuk parser pencatatan (murah, cepat). Model kelas Sonnet tetap untuk agen riset premium. |
| Suara | **Web Speech API** on-device (gratis). Fallback: tombol mikrofon disembunyikan bila browser tidak mendukung. |
| Offline | **IndexedDB queue** (idb-keyval atau Dexie) + background sync untuk entri saat offline. |
| PDF | **@react-pdf/renderer** atau Puppeteer server-side — pilih satu, konsisten. |

### 9.2 Alur data pencatatan

```
User (chat/suara) → POST /api/catat
  → normalisasi teks (angka Indonesia, tanggal relatif)
  → parser LLM (Haiku, JSON mode, skema §17.1) [timeout 5s]
      ↓ gagal → parser fallback regex
  → validasi server-side (nominal>0, jenis valid, kategori ada, tanggal ≤ hari ini)
  → insert transactions[] (status: confirmed | draft jika ada field hilang)
  → trigger evaluasi misi (async)
  → response: array kartu konfirmasi → render di chat
```

### 9.3 Alur data laporan

```
GET /api/laporan?period=2026-08
  → agregasi SQL (SUM per jenis, per kategori, per hari, rasio payment_method)
  → cache hasil di Redis 5 menit (invalidate saat ada insert/update/delete transaksi)
  → response JSON ringkas (bukan seluruh baris transaksi)

POST /api/laporan/segel
  → susun canonical JSON (kunci terurut, integer rupiah, WIB)
  → sha256 → attest() ke ReportAttestation (gasless, relayer treasury)
  → simpan report_seals → trigger misi
```

### 9.4 Smart Contracts (opBNB)

Tiga kontrak v2.0 **tidak berubah**: `IDMReborn.sol`, `IDMX.sol`, `MissionRewards.sol`, `IDMXSwapPool.sol`.

**Kontrak baru v3.0 — `ReportAttestation.sol`:**

```solidity
// Minimal, auditable. Tidak menyimpan data keuangan apa pun.
contract ReportAttestation {
    struct Seal { bytes32 reportHash; uint64 sealedAt; }
    // user => periodKey (mis. keccak("2026-08")) => Seal terakhir
    mapping(address => mapping(bytes32 => Seal)) public seals;

    event Sealed(address indexed user, bytes32 indexed periodKey,
                 bytes32 reportHash, uint64 sealedAt);

    function attest(bytes32 periodKey, bytes32 reportHash) external;
    function verify(address user, bytes32 periodKey, bytes32 reportHash)
        external view returns (bool ok, uint64 sealedAt);
}
```

**Ketentuan kontrak:**
- Hanya `bytes32` yang masuk — **tidak boleh ada parameter nominal, string kategori, atau metadata usaha.**
- Relayer treasury boleh mengirim atas nama user (meta-tx / sponsored) agar gasless; alamat user tetap tercatat sebagai subjek segel.
- Segel ulang menimpa `seals[user][periodKey]` tetapi seluruh riwayat tetap terbaca dari event `Sealed`.
- Pausable; owner multisig + timelock; audit ringan sebelum mainnet.

### 9.5 Platform & Distribusi
**Tidak berubah dari v2.0** (PWA installable, TWA Android + Digital Goods API, Capacitor iOS + StoreKit, kepatuhan store, strategi DappBay), kecuali:
- Shortcut manifest: **Catat** & **Laporan** (menggantikan Riset & Misi).
- Offline page wajib memuat **form catat offline**, bukan hanya riwayat — ini fitur, bukan sekadar degradasi.

### 9.6 Konektivitas Wallet
**Tidak berubah dari v2.0.**

---

## 10. Model Data (Supabase Postgres)

> RLS aktif di semua tabel user-facing. Tabel v2.0 yang tetap dipakai: `users`, `wallets`, `categories`, `credit_ledger`, `orders`, `missions`, `mission_events`, `mission_claims`, `swaps`, `withdrawals`, `app_config`, `admin_users`, `research_queries`, `research_results`, `trend_corpus`, `content_generations` (empat terakhir kini melayani fitur premium).

**Perubahan & tabel baru:**

```sql
-- users: tambah kolom
ALTER TABLE users ADD COLUMN earner_type text
  CHECK (earner_type IN ('dagang','ojol','freelance','online','lainnya'));
ALTER TABLE users ADD COLUMN nama_usaha text;
-- kolom lama `role` ('calon','umkm') dipertahankan untuk kompatibilitas, tidak dipakai lagi di UI

-- INTI v3.0
transactions(
  id uuid pk,
  user_id uuid fk,
  jenis text check (jenis in ('masuk','keluar')),
  amount bigint,                          -- rupiah INTEGER, tanpa desimal
  kategori_id uuid fk categories,
  sub_kategori text,
  payment_method text check (payment_method in ('tunai','qris','transfer','ewallet'))
    default 'tunai',
  catatan text,                           -- teks asli potongan yang jadi entri ini
  occurred_at timestamptz,                -- kapan transaksi terjadi (bisa mundur)
  source text check (source in ('chat','voice','manual','import','ocr')) default 'chat',
  parsed_by text check (parsed_by in ('llm','fallback','manual')) default 'llm',
  raw_input text,                         -- kalimat utuh pengguna (untuk audit & perbaikan parser)
  status text check (status in ('confirmed','draft','deleted')) default 'confirmed',
  deleted_at timestamptz
)

-- Rollup harian (diperbarui via trigger atau job; mempercepat laporan)
daily_rollups(
  user_id uuid fk, tanggal date,
  total_masuk bigint, total_keluar bigint,
  jml_transaksi int,
  masuk_terverifikasi bigint,             -- nilai masuk via qris/transfer/ewallet
  PRIMARY KEY (user_id, tanggal)
)

-- Segel laporan on-chain
report_seals(
  id uuid pk, user_id uuid fk,
  period_key text,                        -- '2026-08' | '2026-Q3' | rentang khusus
  report_hash text,                       -- hex sha256
  canonical_json jsonb,                   -- disimpan agar bisa diverifikasi ulang
  tx_hash text, sealed_at timestamptz,
  is_latest bool default true,
  status text check (status in ('pending','confirmed','failed'))
)

-- Fase 2 (siapkan skema, jangan dipakai di MVP)
kasbon(
  id uuid pk, user_id uuid fk,
  tipe text check (tipe in ('piutang','utang')),
  pihak text, amount bigint, jatuh_tempo date,
  lunas_at timestamptz, transaction_id uuid fk nullable
)

products(
  id uuid pk, user_id uuid fk, nama text,
  harga_jual bigint, harga_modal bigint nullable
)

readiness_scores(
  user_id uuid fk, tanggal date,
  skor smallint, komponen jsonb, tingkat text,
  PRIMARY KEY (user_id, tanggal)
)
```

**Indeks penting:** `transactions(user_id, occurred_at DESC)`, `transactions(user_id, jenis, occurred_at)`, `transactions(user_id, kategori_id)`, `daily_rollups(user_id, tanggal DESC)`, `report_seals(user_id, period_key, is_latest)`, ditambah indeks v2.0 yang sudah ada.

**Taksonomi kategori (perluasan dari 9 kategori v2.0).** Kategori pemasukan dan pengeluaran dipisah oleh kolom `jenis` pada transaksi, bukan oleh tabel berbeda. Tambahkan kategori pengeluaran umum: `bahan_baku`, `operasional` (bensin, listrik, pulsa, sewa), `gaji`, `transportasi`, `peralatan`, `pemasaran`, `pribadi`, `lainnya`. Tambahkan kategori pemasukan: `penjualan`, `jasa`, `ojek`, `komisi`, `lainnya`.

---

## 11. API Endpoints

Endpoint v2.0 tetap (auth, me, credits, orders, missions, swap, wallet, admin, research, content). **Endpoint baru/berubah:**

```
POST /api/catat                   -- {text, source:'chat'|'voice'} → {entries[], pertanyaan?}
POST /api/catat/konfirmasi        -- {draft_id, jawaban} → lengkapi entri draft
PATCH /api/transaksi/:id          -- edit entri
DELETE /api/transaksi/:id         -- soft delete (status='deleted')
GET  /api/transaksi?period=&jenis=&kategori=&q=&page=

GET  /api/laporan?period=2026-08  -- ringkasan + grafik + kategori + rasio verifikasi
GET  /api/laporan/pdf?period=     -- generate & unduh PDF
POST /api/laporan/segel           -- {period} → hash + attest on-chain (gasless)
GET  /api/laporan/segel/:period   -- status segel + tx_hash + hash

-- Fase 3
GET  /api/verify/:user/:period    -- endpoint publik verifikasi hash untuk bank/koperasi
```

---

## 12. Kebutuhan Non-Fungsional

Mengikuti v2.0 (Lighthouse ≥ 90, LCP ≤ 2,5s, INP < 200ms, CLS < 0,1, bundle ≤ 200KB gzip, crash-free ≥ 99%, RLS, webhook terverifikasi, voucher signed, multisig + timelock, degradasi anggun, WCAG AA, target sentuh ≥ 44px), **ditambah:**

- **Kinerja inti:** parsing catat p90 ≤ 3 detik (streaming indikator ≤ 500 ms); layar Laporan p90 ≤ 1,5 detik pada 5.000 transaksi; PDF ≤ 10 detik.
- **Offline-first pada tab Catat:** aplikasi harus tetap bisa menerima entri tanpa koneksi dan menyinkronkannya kemudian. Ini kebutuhan lapangan (warung & ojol), bukan fitur tambahan.
- **Privasi data keuangan (UU PDP — diperketat):** data transaksi adalah data pribadi bernilai tinggi. RLS ketat per user; enkripsi at-rest; **dilarang menulis data keuangan ke on-chain**; `raw_input` boleh dipakai memperbaiki parser hanya setelah dianonimkan dan diagregasi; hapus akun menghapus seluruh transaksi ≤ 30 hari.
- **Akurasi parser (kualitas produk inti):** target ≥ 95% entri benar tanpa koreksi pada 200 kalimat uji berbahasa Indonesia sehari-hari lintas persona. Sediakan test suite ini di repo (`/tests/parser-cases.json`) dan jalankan di CI.
- **Integritas angka:** semua nominal disimpan sebagai integer rupiah (bigint). **Dilarang float** untuk uang.

---

## 13. Inventaris Layar & Sistem Desain

> **Sistem desain v2.0 berlaku penuh dan tidak boleh diubah.** Token warna (`--bg:#FAF7F0`, `--surface:#FFFFFF`, `--surface-warm:#F4EFE6`, `--text:#211C15`, `--text-muted:#8A8175`, `--gold:#F0B90B`, `--gold-light:#FCD535`, `--cta:#1B1B1B`, `--danger:#C0392B`), tipografi **Fraunces** (judul/angka besar) + **Plus Jakarta Sans** (body/data), radius kartu 24px, shadow lembut `0 4px 24px rgba(33,28,21,.06)`, kartu Wallet & Reward gelap-emas, header maks 3 elemen di mobile, navigasi 5 tab tanpa FAB — **semuanya dipertahankan apa adanya.**

**Navigasi bawah (mobile) — DIUBAH:**
**Beranda · Catat · Laporan · Misi · Akun**
(Tablet/desktop: top navigation, pola sama seperti v2.0.)

**Layar:**
1. **Onboarding** — splash → auth → "Kamu berpenghasilan dari mana?" (5 kartu) → kategori + kota. Wallet tercipta diam-diam.
2. **Beranda** — sapaan + chip kredit & IDMX; **kartu hari ini (masuk / keluar / sisa)** sebagai blok utama; tombol besar "Catat"; ringkasan misi hari ini; 3 transaksi terakhir. Maksimal 4 blok (aturan hierarki v2.0).
3. **Catat** — chat: bubble pengguna, kartu konfirmasi entri (jenis, nominal, kategori, metode bayar + "Ubah"), chip saran kontekstual per `earner_type`, kolom input + **tombol mikrofon**, indikator offline bila antre.
4. **Laporan** — pemilih periode; kartu ringkasan (angka besar Fraunces); grafik arus kas; rincian kategori; porsi terverifikasi; kartu Segel Laporan; tombol Unduh PDF; kartu terkunci "Valuasi usaha terbuka setelah 6 bulan".
5. **Detail Transaksi / Edit** — sheet: jenis, nominal, kategori, metode bayar, tanggal, catatan, hapus.
6. **Riwayat Transaksi** — daftar + filter + pencarian + ekspor CSV.
7. **Misi & Reward** — sama seperti v2.0, isi misi disesuaikan (§7.6).
8. **Wallet** — sama persis seperti v2.0 (kartu gelap-emas, tukar, hubungkan eksternal, kirim).
9. **Sheet Tukar IDMX → IDM** — sama persis seperti v2.0.
10. **Premium** — etalase fitur berbayar: Riset Tren, Peluang Usaha, Generator Konten (UI v2.0 dipakai ulang) + info kredit.
11. **Profil & Pengaturan** — profil usaha (+ nama usaha, earner type), preferensi, privasi, hapus akun, ekspor wallet.
12. **Admin** — tambah panel: statistik pencatatan (transaksi/hari, akurasi parser, koreksi manual, rasio fallback), monitor segel laporan.

**Empty states wajib dirancang** (jangan layar kosong): Catat belum ada entri, Laporan belum ada data, Riwayat kosong, offline.

---

## 14. Roadmap & Milestone

| Milestone | Isi | Definisi selesai |
|---|---|---|
| **M0** (minggu 1) | Migrasi skema: `transactions`, `daily_rollups`, `report_seals`, kolom `earner_type`; rename rute `/riset`→`/catat`, `/konten`→`/laporan`; onboarding peran baru | Migrasi jalan di staging; nav baru tampil; build lama tidak rusak |
| **M1** (minggu 2–3) | **Parser pencatatan** (LLM + fallback + validasi) + UI chat Catat + kartu konfirmasi + edit/hapus + test suite parser | AC §7.2 lulus; akurasi ≥ 95% pada 200 kalimat uji |
| **M2** (minggu 4) | Input **suara** + antrean **offline** + sinkronisasi | Entri suara & offline tersimpan benar di perangkat Android kelas menengah |
| **M3** (minggu 5) | **Tab Laporan**: agregasi, grafik, kategori, porsi terverifikasi + **ekspor PDF** | AC §7.3 lulus |
| **M4** (minggu 6) | `ReportAttestation.sol` di testnet + alur Segel + badge + blok verifikasi PDF; misi pencatatan | AC §7.5 & §7.6 lulus testnet |
| **M5** (minggu 7) | Fitur premium di balik kredit (riset/konten v2.0 dipindah) + pembelian kredit + wallet + admin + hardening PDP | Semua AC §7 lulus staging; Lighthouse §12 tercapai |
| **M6** (minggu 8) | Kontrak ke mainnet opBNB; beta tertutup 100 user (target: 30 pedagang, 30 ojol, 40 lainnya); perbaikan; **launch publik PWA**; submit DappBay | PWA live; DappBay diajukan; ≥ 60% beta user mencatat ≥ 4 hari/minggu |
| **M7** (minggu 9–10) | Rilis Google Play (TWA + Billing) & submit iOS (Capacitor + StoreKit); kampanye ranking DappBay | Aplikasi live; metrik on-chain berjalan |
| **Fase 2** | Kasbon · katalog & HPP · Skor Kesiapan · OCR nota · bot WhatsApp · staking · referral | — |
| **Fase 3** | Valuasi usaha · integrasi QRIS/bank · API B2B verifikasi + MCP · price tracker | — |

**Gerbang beta M6 (wajib dipenuhi sebelum launch publik):** akurasi parser ≥ 95%, ≥ 60% beta user mencatat ≥ 4 hari/minggu, dan ≥ 1 laporan PDF berhasil diserahkan ke petugas bank/koperasi nyata sebagai uji lapangan.

---

## 15. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Parser salah baca nominal/kategori** | Laporan salah, kepercayaan hilang | Validasi server-side; kartu konfirmasi yang mudah dikoreksi; test suite 200 kalimat di CI; monitor rasio koreksi manual di admin; fallback regex |
| **Orang berhenti mencatat setelah beberapa hari** | Produk mati (tak ada data → tak ada laporan) | Catat gratis selamanya; friksi minimum (satu kalimat/suara); misi harian IDMX; pengingat lembut; offline-first |
| **Pengguna menganggap segel = jaminan pinjaman** | Kekecewaan + risiko regulasi | Bahasa "kelengkapan catatan", bukan kelayakan; kalimat baku pembatas di UI & PDF; dilarang klaim "terverifikasi/teraudit" atas angkanya |
| **Dianggap melakukan credit scoring tanpa izin** | Masalah hukum (OJK) | Tidak pernah menilai kelayakan/limit/bunga; tidak menyalurkan & tidak memperantarai pinjaman; skor hanya kelengkapan catatan; konsultasi legal sebelum kampanye besar |
| **Kebocoran data keuangan** | Fatal — data pribadi bernilai tinggi | RLS ketat; enkripsi at-rest; **hash-only on-chain**; audit payload transaksi on-chain; minimisasi `raw_input`; pen-test sebelum launch |
| **Farming misi dengan transaksi palsu** | Emisi IDMX bocor + data sampah | Reward per milestone bukan per poin (Skor); transaksi dihapus membatalkan progres; deteksi pola nominal seragam; cap harian di kontrak |
| Biaya AI > revenue | Runway terbakar | Parser pakai model murah; cache; fitur mahal (riset) berbayar penuh; dashboard biaya vs revenue |
| Review Google Play / App Store | Delay rilis | Kredit hanya via billing store di native; tanpa penjualan token in-app; wallet non-custodial; teks UI bebas framing investasi |
| Ketergantungan provider wallet | Lock-in | Ekspor wallet sejak MVP; abstraksi layer wallet |

---

## 16. Keputusan Terbuka (Product Owner)

1. **Nama tab & tagline final** — *(selesai)* "Catat" (`nav-items.ts`) + tagline "Catat usahamu, dalam satu ucap." (`login-panel.tsx`) sudah diimplementasikan.
2. **Domain produk** — *(diputuskan 2026-08-14)* `ai.idmtoken.com` — subdomain dari domain token yang sudah ada.
3. **Provider embedded wallet** — Privy (default, sudah terpasang). *(selesai)*
4. **Payment gateway** — *(diputuskan 2026-08-08)* Midtrans. Lihat `.env.local.example` (dipakai mulai M3, pembelian kredit QRIS/VA).
5. **Kurs awal IDMX → IDM Reborn** + kebijakan peninjauan. **Masih terbuka** — mekanisme disepakati (kurs tetap awal, bukan floating, ditinjau ulang per kuartal, diumumkan di UI sebelum user menukar), tapi rasio angkanya adalah keputusan finansial yang belum ditetapkan. *(sebelum M6)*
6. **Perlakuan IDMX masuk pool** — *(diputuskan 2026-08-14)* Burn — deflasi sederhana, tanpa mekanisme redistribusi/governance tambahan.
7. **Angka reward misi pencatatan** — *(dikonfirmasi 2026-08-14)* Pakai default §7.6 apa adanya (+20/+50/+100/+150/+50, cap 250 IDMX/hari); tetap configurable admin sehingga aman diubah tanpa deploy ulang.
8. **Tokenomics Token IDM Reborn** — alokasi 1 miliar → dokumen terpisah. **Masih terbuka**, sengaja di luar cakupan PRD ini — kemungkinan perlu review legal. *(sebelum M6)*
9. **Library PDF** — *(diputuskan 2026-08-14)* `@react-pdf/renderer` — serverless-friendly (Next.js API routes), tanpa overhead binary Chromium headless ala Puppeteer di cold start.
10. **Kebijakan retensi `raw_input`** — *(diputuskan 2026-08-14)* 90 hari, lalu dianonimkan (raw_input dihapus, entri transaksi terstruktur dipertahankan). Mekanisme purge otomatis dikerjakan di hardening PDP M6 sesuai jadwal semula — **belum diimplementasikan**.
11. **Jembatan lintas-chain** — IDM Reborn di BSC vs aktivitas di opBNB; bridge resmi atau kontrak mirror. **Masih terbuka** — rekomendasi awal: kontrak mirror di opBNB dulu (tanpa dependensi bridge pihak ketiga), migrasi ke bridge resmi saat volume signifikan. Keputusan final menjelang M4 karena berimplikasi keamanan (target eksploit umum di lintas-chain). *(sebelum M4 — warisan v2.0)*

---

## 17. Lampiran — Kontrak Output Agen

### 17.1 Skema output parser pencatatan

Parser **wajib** mengembalikan JSON valid berikut (JSON mode / structured output), tanpa teks lain:

```json
{
  "entries": [
    {
      "jenis": "masuk",
      "amount": 180000,
      "kategori": "ojek",
      "sub_kategori": null,
      "payment_method": "tunai",
      "occurred_at": "2026-08-12",
      "catatan": "narik hari ini",
      "confidence": 0.95
    }
  ],
  "pertanyaan": null,
  "tidak_dikenali": null
}
```

**Aturan parser (masuk ke prompt sistem):**
- Peran: pencatat keuangan untuk pelaku usaha mikro Indonesia. Ubah kalimat sehari-hari menjadi entri transaksi.
- **Satu kalimat boleh menghasilkan beberapa entri.** Pisahkan setiap peristiwa uang menjadi entri sendiri.
- **Dilarang mengarang nominal.** Bila nominal tidak disebut, kosongkan `amount` dan isi `pertanyaan` dengan **satu** pertanyaan singkat menanyakan nominal saja.
- Kenali format angka Indonesia: `45rb`, `45k`, `45.000`, `Rp45.000`, `1,5jt`, `2 juta`, `seratus ribu`.
- Kenali waktu relatif terhadap tanggal hari ini: "kemarin", "tadi pagi", "senin lalu". Default: hari ini. `occurred_at` tidak boleh melebihi hari ini.
- `payment_method`: `qris` bila disebut QRIS/scan; `transfer` bila transfer/TF/rekening; `ewallet` bila OVO/Gopay/Dana/ShopeePay; selain itu `tunai`.
- `kategori` wajib dipilih dari taksonomi yang diberikan dalam prompt. Bila ragu → `lainnya`. **Dilarang membuat kategori baru.**
- Konteks pengguna (`earner_type`, kategori usaha, kota) disertakan; pakai untuk menebak kategori yang wajar (mis. ojol + "bensin" → `operasional`).
- Bila kalimat tidak berhubungan dengan uang sama sekali, kembalikan `entries: []` dan isi `tidak_dikenali` dengan penjelasan satu kalimat ramah.
- Jawab **hanya** JSON. Tanpa markdown, tanpa penjelasan.

### 17.2 Kanonikalisasi laporan untuk hash

Sebelum `sha256`, susun JSON deterministik:
- Kunci diurutkan alfabetis di semua level.
- Semua nominal integer rupiah (tanpa desimal, tanpa pemisah).
- Tanggal `YYYY-MM-DD`, timezone WIB (UTC+7).
- Tanpa spasi/newline (`JSON.stringify` tanpa indentasi).
- Sertakan: `user_id`, `period_key`, `total_masuk`, `total_keluar`, `sisa`, `jml_transaksi`, `hari_aktif`, `masuk_terverifikasi`, `rincian_kategori[]` (terurut), `generated_at`.
- **Dilarang** menyertakan `raw_input`, catatan bebas, atau data identitas selain `user_id`.

### 17.3 Skema output riset premium
**Tidak berubah dari v2.0 §17** (`ringkasan`, `temuan[]`, `peluang_aksi[]`, `peringatan`, `saran_lanjutan[]`).

---

**Definisi "MVP selesai":** seluruh AC §7.1–7.8 lulus di production, gerbang beta M6 terpenuhi, PWA live, listing DappBay diajukan.

**Definisi "FULL APP selesai":** M7 tercapai — PWA live, Google Play live, iOS live atau dalam review akhir, metrik on-chain berjalan.
