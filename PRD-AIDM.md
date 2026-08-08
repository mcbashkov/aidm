# PRD — AIDM
**Agen AI Intelijen Pasar UMKM · dApp Ekosistem IDM Reborn · BNB Smart Chain**
Versi 2.0 · Agustus 2026 · Penyusun: MC Basyar (Product Owner) + Claude
Status: **Final untuk build FULL APP** (PWA web · mobile · tablet + aplikasi Google Play + aplikasi iOS App Store)
Alur kerja: PRD ini (termasuk sistem desain §13) → Claude Code (build & integrasi)

**Ringkasan perubahan dari v1.0:** nama final **AIDM**; struktur 3 token (Native Token · Token IDM Reborn · IDMX) dengan pool tukar IDMX→IDM Reborn; Kredit AI **hanya dibeli dengan uang** (tidak ada jalur token→kredit); rilis aplikasi Google Play & App Store **dimajukan ke peluncuran** (bukan fase akhir); target eksplisit **merebut ranking DappBay**; wallet otomatis untuk semua akun + koneksi wallet eksternal via deep link; seluruh referensi produk dan proyek lama dihapus dari dokumen ini.

---

## 1. Ringkasan Produk

**AIDM** (AI + IDM) adalah dApp intelijen pasar untuk UMKM dan calon wirausaha Indonesia. Pendekatannya **agen riset on-demand (pull)**, bukan pipeline ingestion kontinyu (push): pengguna bertanya lewat antarmuka chat, agen AI melakukan riset live (TikTok Creative Center, Google Trends, marketplace, web), lalu menjawab dalam bentuk insight siap eksekusi + konten pemasaran siap pakai.

AIDM adalah **project crypto secara terbuka** di BNB Smart Chain, dengan prinsip Web3 "proud but calm": identitas crypto tampil bangga di lapisan wallet, reward, dan bukti on-chain — sementara alur riset harian tetap bersih tanpa jargon. Tiga pilar Web3-nya:

1. **Punya akun = punya wallet.** Setiap pengguna otomatis memiliki wallet sejak mendaftar, tanpa seed phrase, tanpa gas (disponsori sistem).
2. **Aktivitas riil diberi reward IDMX** (token reward in-app) yang dapat ditukar menjadi **Token IDM Reborn** melalui pool resmi di dalam aplikasi.
3. **Kredit AI dibeli dengan uang** (QRIS/VA di web, billing store di aplikasi native) — **tidak pernah dari token**. Ini menjaga kepatuhan kebijakan in-app purchase Google/Apple dan memisahkan secara sehat biaya AI (ditutup pendapatan riil) dari ekonomi token (lapisan reward & kepemilikan).

**Fakta kunci:**
- **Platform (rilis penuh):** PWA standar industri — mobile, tablet, desktop, satu codebase — **plus** aplikasi Android di Google Play dan aplikasi iOS di App Store sejak peluncuran.
- **Bahasa:** Indonesia.
- **Jaringan:** opBNB (gas fee murah, ditanggung tim/sponsor; syarat aktivitas UAW/transaksi terjangkau untuk ranking DappBay).
- **Target strategis:** merebut ranking **DappBay** (dappbay.bnbchain.org) lewat pengguna nyata dan transaksi on-chain riil (klaim reward + tukar token), bukan aktivitas artifisial.
- **Kualitas:** bagus, clean, rapih, ringan — semua fungsi berjalan (definisi terukur di §12).

## 2. Latar Belakang & Masalah

1. UMKM Indonesia tidak punya akses riset pasar. Tool intelijen e-commerce yang ada (Compas.co.id dkk.) menyasar brand enterprise (FMCG besar) dengan harga tak terjangkau UMKM. Segmen mikro-kecil kosong.
2. Bonus demografi + pengangguran tinggi: jutaan orang ingin mulai usaha tapi tidak tahu mulai dari mana, jualan apa, dan di mana peluangnya.
3. UMKM eksisting kalah cepat membaca tren (produk viral, pergeseran harga, keluhan pelanggan kompetitor) karena riset manual makan waktu.
4. Adopsi crypto Indonesia butuh use case nyata non-spekulatif. dApp dengan pemakaian harian riil = jalur edukasi crypto paling efektif + metrik on-chain (pengguna wallet aktif, transaksi harian) untuk target ranking DappBay → jalan menuju listing Binance.

## 3. Tujuan & Metrik Sukses

| Tujuan | Metrik | Target 6 bln pasca-launch |
|---|---|---|
| Adopsi | Pengguna terdaftar (semua otomatis ber-wallet) | 50.000 |
| Pemakaian | Query riset / hari | 5.000 |
| Retensi | D30 retention | ≥ 20% |
| Monetisasi | Konversi free → pembelian kredit | ≥ 3% |
| On-chain | Unique Active Wallets harian (klaim reward + tukar IDMX) | 1.000+ |
| Token | Volume tukar IDMX→IDM Reborn & distribusi reward | tumbuh konsisten bulanan |
| Ranking | Posisi di DappBay | terdaftar di M6 → naik bertahap merebut top kategori |
| Distribusi | Rating Google Play & App Store | ≥ 4,5 dengan crash rate < 1% |

**Strategi DappBay (ringkas).** Ranking DappBay digerakkan metrik on-chain (Unique Active Wallets, jumlah transaksi) plus kelengkapan & kredibilitas profil proyek (kontrak terverifikasi, audit, sosial aktif). Desain AIDM sengaja menempatkan dua sentuhan on-chain harian yang sah: **klaim misi IDMX** (gasless, disponsori) dan **tukar IDMX→IDM Reborn** (gas ditanggung user — sangat murah di opBNB). Karena setiap pengguna otomatis punya wallet, setiap pengguna aktif adalah wallet aktif. Checklist listing DappBay masuk roadmap M6 (§14).

## 4. Target Pengguna & Persona

**P1 — Calon Wirausaha ("Rina", 22, Bekasi, belum kerja).** Modal Rp1–3 jt, bingung mau usaha apa. Butuh: rekomendasi peluang usaha berbasis tren + modal + lokasi. Perilaku: TikTok-heavy, tak paham crypto. WTP: nol → free tier.

**P2 — Pemilik UMKM ("Bu Sari", 34, kuliner rumahan, jualan di WA + Shopee).** Butuh: tahu produk yang lagi naik, ide konten promosi, harga kompetitor. WTP: rendah tapi ada (≤ Rp100rb/bln) jika hasilnya langsung terpakai.

**P3 — Seller Serius / Crypto-native ("Andi", 28, seller fashion + pegang crypto).** Query banyak, rajin klaim misi, termotivasi menukar IDMX menjadi IDM Reborn, tertarik staking tier (Fase 2). Sumber aktivitas on-chain utama fase awal.

**P4 (Fase 3) — B2B:** koperasi, fintech, distributor, brand, pemda → API korpus tren.

## 5. Positioning & Kompetitor

- **Compas.co.id / tool BI e-commerce:** enterprise-only, dashboard berat, mahal. AIDM masuk dari bawah: chat sederhana, harga mikro, bahasa manusia.
- **TikTok/Shopee seller center analytics:** hanya data toko sendiri per platform, tidak lintas platform, tanpa rekomendasi eksekusi.
- **ChatGPT/AI umum:** tidak punya tool tren Indonesia terstruktur, tidak ada korpus lokal, tidak ada ekonomi kredit & reward lokal.
- **Diferensiasi AIDM:** (a) agen dengan tools tren Indonesia riil, (b) output = aksi (skrip konten, rekomendasi harga), bukan sekadar data, (c) ekonomi reward on-chain (IDMX) yang membayar kebiasaan riset — bukan spekulasi, (d) korpus tren yang tumbuh dari cache setiap query → aset data jangka panjang, (e) hadir di semua kanal distribusi: PWA + Google Play + App Store.

## 6. Ruang Lingkup

### MVP / Rilis pertama (semua WAJIB fungsional)
1. Onboarding email/HP/Google + **wallet otomatis untuk semua akun** (gasless)
2. Chat Riset Tren on-demand (agen + tools)
3. Mode Peluang Usaha (wizard calon wirausaha)
4. Generator Konten (skrip TikTok, caption IG, copywriting promo)
5. Sistem Kredit AI: gratis harian + **pembelian dengan uang** (QRIS/VA di PWA · Play Billing & StoreKit di aplikasi store)
6. Misi & **Reward IDMX** (klaim on-chain gasless)
7. **Tukar IDMX → Token IDM Reborn** (pool resmi di dalam aplikasi)
8. Riwayat riset + cache korpus tren (internal)
9. Profil, pengaturan, kartu wallet (saldo IDMX & IDM Reborn, hubungkan wallet eksternal, kirim ke wallet sendiri)
10. Panel admin minimum (pengguna, query, biaya, konfigurasi parameter, monitor pool & reward)

> Butir 1–4, 8, 10 identik dengan ruang lingkup v1.0 yang sudah disetujui. Butir 5–7 dan 9 disesuaikan dengan keputusan token & pembayaran terbaru. Rilis aplikasi Google Play & App Store kini bagian dari peluncuran (§9.5, §14) — bukan fase akhir.

### Fase 2
- Bot WhatsApp (kanal kedua, akun tersambung)
- Digest tren mingguan per kategori (langganan)
- Review Mining on-demand (analisis ulasan produk kompetitor)
- Staking IDM Reborn → tier (kuota & fitur)
- Referral berhadiah IDMX

### Fase 3
- API B2B korpus tren + endpoint MCP untuk integrasi agen eksternal
- Attestation korpus tren on-chain (merkle root digest mingguan)
- Price tracker terjadwal untuk kategori dengan permintaan terbukti

### Out of Scope (tegas)
- Scraping kontinyu 24/7 marketplace (hanya on-demand)
- Dashboard ranking real-time per jam
- Fitur pencatatan keuangan / pembukuan usaha (di luar fokus AIDM)
- Trading, DEX, atau chart harga token di dalam aplikasi — tukar IDMX→IDM Reborn **bukan** trading: satu arah, kurs ditetapkan sistem, bukan pasar
- **Membeli Kredit AI dengan token** — jalur ini sengaja ditiadakan (kepatuhan store + pemisahan ekonomi)
- Menjual token di dalam aplikasi (in-app token sale) dalam bentuk apa pun
- Custody dana rupiah (semua pembayaran via payment gateway / billing store berlisensi)
- **Menyentuh Native Token (token IDM lama)** — dibiarkan apa adanya di DEX, tidak diintegrasikan, tidak dimigrasikan (§8.1)

## 7. Fitur Fungsional MVP

> Format tiap fitur: Deskripsi → Alur → Ketentuan → Kriteria Terima (AC). Semua teks UI final ditentukan saat desain; PRD menetapkan struktur & logika.

### 7.1 Onboarding & Wallet Otomatis

**Deskripsi.** Registrasi tanpa hambatan; prinsip produk: **punya akun = punya wallet**. Wallet EVM dibuat otomatis di balik layar untuk setiap akun baru (tanpa seed phrase yang ditampilkan), gas ditanggung sistem.

**Alur.**
1. Landing → "Masuk / Daftar" → pilih: email (OTP) atau nomor HP (OTP WhatsApp/SMS) atau Google.
2. Berhasil auth → provider embedded wallet (Privy — keputusan default, lihat §16) membuat wallet EVM untuk user secara otomatis. Tidak ada langkah tambahan yang terlihat user.
3. Layar singkat pilih peran: "Saya mau mulai usaha" (→ default mode Peluang Usaha) / "Saya sudah punya usaha" (→ tanya kategori usaha + kota, simpan ke profil).
4. Masuk Beranda; user langsung dapat kredit gratis harian.

**Ketentuan.**
- Wallet non-custodial via MPC provider; user TIDAK pernah melihat seed phrase kecuali membuka menu lanjutan "Ekspor wallet" di Pengaturan.
- **Kebijakan gas (opBNB):** klaim reward IDMX = **gasless**, disponsori treasury (menghilangkan friksi onboarding). **Tukar IDMX→IDM Reborn dan kirim ke wallet eksternal = gas ditanggung user**, karena kedua aksi ini bersifat mengambil nilai/keuntungan bagi user. Nominalnya sangat kecil di opBNB dan wajib ditampilkan sebagai estimasi sebelum konfirmasi.
- Kategori usaha memakai taksonomi tetap (lihat §10, tabel `categories`): Kuliner, Fashion, Kecantikan, Kriya, Agri/Fresh, Jasa, Digital, Kelontong/Retail, Lainnya — masing-masing dengan sub-kategori.

**AC.**
- [ ] User baru dari nol sampai Beranda ≤ 60 detik, tanpa istilah wallet/seed/gas muncul di alur.
- [ ] **100% akun baru memiliki wallet address** ter-generate & tersimpan di DB terhubung `user_id`.
- [ ] Login ulang perangkat lain memulihkan akun + wallet yang sama.
- [ ] Profil peran/kategori/kota tersimpan dan dipakai agen sebagai konteks default.

### 7.2 Chat Riset Tren On-Demand (fitur inti)

**Deskripsi.** Antarmuka chat. User bertanya bebas seputar pasar; agen AI (Claude API, tool-use) meriset live lalu menjawab terstruktur.

**Alur.**
1. User ketik pertanyaan (atau pilih template chip: "Tren [kategori] minggu ini", "Produk apa yang lagi naik di [kota]?", "Analisis harga [produk]").
2. Sistem cek kredit → potong kredit sesuai tarif (§8.2) → jika kurang, tampilkan sheet pembelian kredit.
3. Backend memanggil agen dengan konteks profil (kategori, kota) + tools. Status streaming ke UI: "Mengecek TikTok Creative Center… Mengecek Google Trends… Menyusun insight…".
4. **Cek cache dulu:** jika ada hasil riset topik+kategori+lokasi serupa < 7 hari (pencarian vektor, threshold kemiripan), sajikan dari cache (tarif kredit lebih murah, ditandai "diperbarui X hari lalu" + tombol "Riset ulang terbaru").
5. Jawaban terstruktur (format §17): Ringkasan → Data & bukti (sumber + tanggal) → Peluang/Aksi untuk user → tombol lanjutan: **[Buatkan Konten]** **[Dalami]** **[Simpan]**.
6. Hasil disimpan ke `research_results` + embedding ke korpus.

**Tools agen (definisi untuk Claude Code, §9.3):** `tiktok_trends`, `google_trends_id`, `marketplace_snapshot`, `web_search`, `corpus_search`.

**Ketentuan.**
- Timeout riset 120 dtk; jika tool gagal, agen menjawab dengan sumber yang berhasil + menyebut keterbatasan (tidak pernah mengarang angka).
- Setiap klaim angka di jawaban wajib menyebut sumber + tanggal ambil data.
- Guardrail biaya: maksimum panggilan tool per query (default 6) + cap token output.
- Moderasi: tolak topik di luar lingkup bisnis/pasar (dijawab sopan, kredit dikembalikan).

**AC.**
- [ ] Query segar terjawab ≤ 90 dtk (p90) dengan minimal 2 sumber data.
- [ ] Query serupa kedua dalam 7 hari terjawab dari cache ≤ 10 dtk dengan tarif cache.
- [ ] Kredit terpotong tepat sekali per query; gagal total = auto-refund kredit.
- [ ] Semua hasil punya tombol "Buatkan Konten" yang membawa konteks hasil riset.

### 7.3 Mode Peluang Usaha (wizard calon wirausaha)

**Deskripsi.** Wizard 4 langkah untuk P1: Modal (slider: <1jt / 1–3jt / 3–10jt / >10jt) → Lokasi (kota/kecamatan) → Minat (pilih ≤3 kategori) → Waktu (sampingan/penuh). Output: 3 rekomendasi peluang usaha berbasis riset tren live, masing-masing dengan: kenapa sekarang (data tren), estimasi modal rincian, cara mulai 5 langkah, risiko utama, contoh pemain sukses.

**Ketentuan.** Satu run = tarif riset (§8.2). Hasil bisa disimpan & dibagikan (gambar ringkasan untuk share WA — viral loop). Disclaimer tetap: bukan jaminan hasil usaha.

**AC.**
- [ ] Wizard selesai → hasil ≤ 120 dtk; ketiga rekomendasi punya data tren bersumber.
- [ ] Tombol share menghasilkan kartu gambar (og-image style) berisi ringkasan + branding AIDM.

### 7.4 Generator Konten

**Deskripsi.** Mengubah insight (atau input manual produk user) menjadi: skrip video TikTok (hook–isi–CTA, durasi 30–60 dtk), caption Instagram (+hashtag), copywriting promo WA/marketplace, ide 7 hari kalender konten.

**Alur.** Dari tombol [Buatkan Konten] pada hasil riset (konteks otomatis) ATAU menu Konten (isi form singkat: produk, harga, target pembeli, gaya bahasa). Pilih format output → generate → hasil bisa disalin per blok, regenerasi per bagian, disimpan.

**AC.**
- [ ] Generate ≤ 20 dtk; hasil dalam Bahasa Indonesia sesuai gaya terpilih (santai/persuasif/premium).
- [ ] Tarif kredit konten lebih murah dari riset (§8.2); regenerasi bagian = tarif mikro.
- [ ] Riwayat konten tersimpan per user.

### 7.5 Kredit AI & Pembelian (uang saja)

**Deskripsi.** Semua fitur AI berjalan dengan Kredit AI. Kredit **hanya diperoleh dari kredit gratis harian atau dibeli dengan uang** — tidak ada jalur menukar token menjadi kredit. Alasan desain: (a) kepatuhan kebijakan in-app purchase Google Play & Apple (barang digital konsumtif di aplikasi native wajib lewat billing store; jalur token→kredit berisiko penolakan review dan dihindari total), (b) biaya AI ditutup pendapatan riil sehingga ekonomi token berdiri sehat di lapisan reward.

**Kanal pembelian.**
- **PWA / web:** QRIS & Virtual Account via payment gateway (Midtrans/Xendit — §16) → webhook settlement → kredit masuk + notifikasi.
- **Aplikasi Google Play:** Google Play Billing, produk konsumtif — dipicu via Digital Goods API dari TWA (§9.5) → verifikasi purchase token server-side → kredit masuk.
- **Aplikasi iOS:** StoreKit in-app purchase (konsumtif) → verifikasi receipt server-side → kredit masuk.

**Ketentuan.**
- Kredit tidak dapat diuangkan kembali; ledger kredit append-only (§10); saldo UI selalu = penjumlahan ledger.
- Harga paket per kanal boleh berbeda (menyerap fee store 15–30%) — SKU & harga dikonfigurasi admin (§16).
- **Edukasi jalur token (teks informatif di UI, bukan fitur):** "Kumpulkan IDMX dari misi → tukar ke IDM Reborn di aplikasi → IDM Reborn dapat dijual di DEX (di luar aplikasi) → hasilnya terserah Anda, termasuk membeli kredit." Aplikasi tidak pernah memfasilitasi penjualan token dan tidak menautkan langsung ke DEX dari alur pembelian kredit.

**AC.**
- [ ] Pembayaran QRIS end-to-end (sandbox & production) menambah kredit ≤ 10 dtk setelah settlement webhook.
- [ ] Pembelian via Play Billing dan StoreKit menambah kredit setelah verifikasi receipt/purchase-token server-side; receipt ganda tidak menggandakan kredit (idempoten).
- [ ] Semua mutasi kredit tercatat di `credit_ledger`; rekonsiliasi harian order vs ledger di panel admin.

### 7.6 Misi & Reward IDMX

**Deskripsi.** Misi harian/mingguan berhadiah **IDMX** untuk membentuk kebiasaan & mengedukasi crypto. Contoh default (semua angka dalam IDMX, configurable admin): riset pertama hari ini +20; 3 riset dalam sehari +50; bagikan kartu hasil +30; login 7 hari beruntun +100; lengkapi profil usaha +50 (sekali).

**Ketentuan.**
- Klaim = transaksi on-chain gasless: kontrak `MissionRewards` mentransfer IDMX dari pool reward → wallet user; user melihat saldo IDMX bertambah di kartu wallet.
- Anti-abuse: rate-limit klaim per user/hari, verifikasi server-side event misi, device fingerprint dasar.
- Parameter jumlah reward dikonfigurasi admin tanpa deploy ulang (nilai di DB; kontrak menerima **signed voucher** dari backend — `(user, missionId, amount, nonce, deadline)` — pola voucher/claim signature).
- Total reward harian per user dibatasi (default ≤ 250 IDMX/hari) dan ditegakkan di kontrak + backend.

**AC.**
- [ ] Misi terpicu otomatis oleh event nyata; klaim menghasilkan tx sukses & saldo IDMX terbarui ≤ 30 dtk.
- [ ] Cap harian per address ditegakkan di kontrak; percobaan replay voucher gagal.

### 7.7 Tukar IDMX → Token IDM Reborn (pool resmi)

**Deskripsi.** Satu-satunya jalur resmi mengubah reward menjadi token utama ekosistem. User menukar IDMX miliknya dengan Token IDM Reborn dari pool yang disiapkan treasury, dengan kurs yang ditetapkan sistem.

**Alur.**
1. Dari kartu wallet atau halaman Misi → tombol **"Tukar IDMX → IDM"** → sheet tukar.
2. Input jumlah IDMX (atau chip 25/50/100% saldo) → tampil kurs berlaku + estimasi IDM Reborn diterima + sisa kuota harian.
3. Konfirmasi → transaksi on-chain **dengan gas dibayar user** (estimasi gas ditampilkan di layar konfirmasi; jika saldo gas user kurang, tampilkan panduan top-up): IDMX user masuk kontrak pool, IDM Reborn keluar dari saldo pool ke wallet user.
4. Layar sukses: jumlah diterima + tautan BscScan berbahasa manusia ("Penukaran terverifikasi on-chain").

**Ketentuan.**
- **Kurs** (berapa IDMX per 1 IDM Reborn) ditetapkan admin melalui kontrak (owner + timelock), ditinjau berkala, ditampilkan transparan di UI beserta riwayat perubahan kurs. **Kurs awal ditentukan sambil berjalan** (§16) sebelum fitur diaktifkan di mainnet.
- Satu arah: hanya IDMX → IDM Reborn. Tidak ada arah balik, tidak ada pasangan lain, tidak ada order book — ini penukaran kurs tetap, bukan trading.
- Minimal tukar & cap harian per user (default contoh: min 1.000 IDMX, maks 100.000 IDMX/hari — dikonfirmasi PO, configurable).
- Pool diisi alokasi Token IDM Reborn dari treasury; saldo pool publik (alamat kontrak) dan dimonitor di admin dengan alert saldo menipis; top-up sesuai kebijakan tokenomics (§16).
- **Nasib IDMX yang masuk pool:** default awal **burn** (deflasi IDMX, sederhana dikomunikasikan); alternatif kembali ke pool reward — keputusan terbuka §16.

**AC.**
- [ ] Tukar sukses ≤ 60 dtk termasuk konfirmasi blok; saldo IDMX & IDM Reborn di UI terbarui.
- [ ] Kurs, minimum, dan cap yang tampil di UI selalu sama dengan nilai kontrak (dibaca on-chain, bukan hardcode).
- [ ] Setiap penukaran tercatat di tabel `swaps` + event on-chain; total harian per user tidak bisa melewati cap.

### 7.8 Riwayat & Korpus Tren

**Deskripsi.** Tab Riwayat: semua riset & konten user, bisa dibuka ulang, disimpan/pin, dicari. Di balik layar setiap hasil riset (dianonimkan dari identitas user) masuk `trend_corpus` dengan embedding — aset data jangka panjang untuk digest Fase 2 & API B2B Fase 3.

**AC.**
- [ ] Riwayat paginasi, pencarian keyword, buka ulang hasil utuh.
- [ ] Korpus terisi otomatis dari tiap riset segar dengan metadata: kategori, sub-kategori, kota, tanggal, sumber, dan **skor kepercayaan sumber** (1 = satu sumber; 2 = dua sumber saling menguatkan; 3 = sumber resmi/platform).

### 7.9 Profil, Wallet & Pengaturan

- **Profil:** peran, kategori usaha, kota — bisa diubah.
- **Kartu Wallet** (kartu gelap-emas, aksen premium konsisten ekosistem): alamat (disingkat, tombol salin), **saldo IDMX dan saldo IDM Reborn**, riwayat 10 transaksi terakhir berbahasa manusia ("Reward misi +50 IDMX", "Tukar 5.000 IDMX → 0,5 IDM"), tombol **Tukar IDMX → IDM**, tombol **Hubungkan Wallet Eksternal**, tombol **Kirim ke wallet saya** (aktif setelah wallet eksternal tertaut), menu lanjutan: ekspor wallet, lihat di BscScan.
- **Hubungkan Wallet Eksternal (§9.6):** via WalletConnect — deep link langsung membuka aplikasi dompet (MetaMask/Trust/Binance Wallet dst.) lalu kembali ke AIDM; tujuan: (a) menautkan alamat pribadi ke profil (bukti kepemilikan via tanda tangan pesan), (b) tujuan fitur "Kirim ke wallet saya" untuk memindahkan Token IDM Reborn dari wallet embedded ke wallet pribadi (**gas ditanggung user**, cap harian).
- **Pengaturan:** gaya bahasa jawaban AI, notifikasi, kebijakan privasi, hapus akun (comply UU PDP — hapus data pribadi, korpus anonim tetap).

**AC.**
- [ ] Hubungkan wallet eksternal berhasil dari Chrome/Safari (PWA) **dan** dari aplikasi Google Play/App Store via deep link, tanpa membuka AIDM dari browser bawaan dompet.
- [ ] "Kirim ke wallet saya" memindahkan IDM Reborn ke alamat tertaut, tercatat di riwayat, dengan cap harian.
- [ ] Hapus akun menghapus PII ≤ 30 hari sesuai kebijakan; sesi tercabut seketika.

## 8. Ekonomi Token & Kredit

### 8.1 Struktur 3 Token (nomenklatur resmi — internal & eksternal)

| # | Sebutan resmi | Apa ini | Jaringan | Suplai | Peran & status |
|---|---|---|---|---|---|
| 1 | **Native Token** | Token IDM generasi lama | BSC (tetap di DEX) | eksisting | **Tidak disentuh sama sekali untuk saat ini.** Tidak diintegrasikan ke AIDM, tidak dimigrasikan, dibiarkan berjalan di DEX apa adanya. |
| 2 | **Token IDM Reborn** | Token IDM baru, token utama ekosistem | BSC · pair **IDM/BNB** di DEX | **1.000.000.000** (1 miliar) | Tujuan akhir konversi reward; likuiditas berpasangan BNB; aset yang dibawa menuju target listing besar. |
| 3 | **IDMX** | Token reward in-app | **opBNB** | **10.000.000.000.000** (10 triliun) | Diperoleh dari misi & aktivitas di AIDM; dapat ditukar menjadi Token IDM Reborn melalui pool resmi (§7.7). |

**Catatan nomenklatur.** Karena istilah "native token/coin" dalam dunia crypto lazim berarti coin bawaan chain (BNB di BSC), semua materi publik menuliskannya lengkap — **"IDM Native Token"** — agar tidak ambigu.

**Alur nilai (dikomunikasikan konsisten di semua materi):**
Aktivitas riil di AIDM → reward **IDMX** → tukar di pool resmi → **Token IDM Reborn** → (di luar aplikasi) dijual/dipegang di DEX pasangan BNB.
Kredit AI berdiri terpisah sepenuhnya: **uang → kredit → biaya AI.** Dua rel ini tidak pernah bersilangan di dalam aplikasi.

### 8.2 Parameter Kredit (default — dapat diubah admin)

| Parameter | Nilai default |
|---|---|
| Kredit gratis harian | 10 kredit (reset 00:00 WIB, tidak menumpuk) |
| Tarif: Riset segar | 3 kredit |
| Tarif: Riset dari cache | 1 kredit |
| Tarif: Peluang Usaha (wizard) | 3 kredit |
| Tarif: Generator konten | 1 kredit (regenerasi bagian: 0, maks 3x) |
| Tarif Fase 2: Review mining | 5 kredit |
| Paket PWA/web (QRIS/VA) | 50 kredit Rp15.000 · 200 kredit Rp49.000 · 500 kredit Rp99.000 |
| Paket Google Play / App Store | SKU setara; harga menyesuaikan fee store — ditetapkan saat setup billing (§16) |

### 8.3 Parameter Reward & Tukar (default — dapat diubah admin/owner)

| Parameter | Nilai default |
|---|---|
| Reward misi | lihat §7.6; total maks 250 IDMX/user/hari |
| Kurs tukar IDMX → IDM Reborn | admin-set via kontrak (timelock); **kurs awal ditentukan sambil berjalan** sebelum aktivasi mainnet |
| Minimal tukar | 1.000 IDMX (contoh — dikonfirmasi PO) |
| Cap tukar harian per user | 100.000 IDMX (contoh — dikonfirmasi PO) |
| Perlakuan IDMX masuk pool | **burn** (default) vs kembali ke pool reward — §16 |
| Pool IDM Reborn | diisi alokasi treasury; monitoring + alert saldo; kebijakan top-up mengikuti dokumen tokenomics (§16) |
| Fase 2: Staking tier | Bronze/Silver/Gold (staking IDM Reborn) — kuota harian & akses digest naik per tier |

**Prinsip ekonomi:** freemium harian → pembelian kredit dengan uang menutup biaya AI → token murni lapisan reward & kepemilikan (IDMX mengalir ke IDM Reborn) → staking untuk tiering (Fase 2) → B2B API sebagai lapisan revenue terbesar di belakang (Fase 3).

## 9. Arsitektur Teknis

### 9.1 Stack (keputusan default)

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Frontend | Next.js 14+ (App Router) PWA, Tailwind | Chat-first; service worker + manifest (installable); **satu codebase** untuk mobile · tablet · desktop |
| Auth + Embedded Wallet | Privy | Email/HP/Google → wallet EVM MPC otomatis; alternatif Web3Auth (§16) |
| Wallet eksternal | WalletConnect v2 (Reown AppKit / wagmi) | Deep link ke aplikasi dompet; QR di desktop; sesi persist |
| Backend | Next.js route handlers + worker antrian (BullMQ + Redis, atau Supabase Edge Functions + cron) | Query riset = job async + streaming status |
| Database | Supabase Postgres + pgvector + Storage | Skema §10; RLS aktif |
| AI | Claude API (model kelas Sonnet untuk agen; model ringan untuk klasifikasi/moderasi) dengan tool use + streaming | Prompt sistem §17 |
| Chain | **opBNB**: `IDMReborn`, `IDMX`, `MissionRewards`, `IDMXSwapPool` | Gas fee sangat murah → syarat aktivitas UAW/transaksi terjangkau untuk ranking DappBay; viem di backend. **Sponsor treasury hanya untuk klaim misi**; tukar & withdraw dibayar user |
| AI SDK on-chain | **BNB Chain AI SDK** sebagai lapisan pemanggilan/orkestrasi on-chain | Model di baliknya tetap Claude API, GPT, dan Gemini sesuai kebutuhan tugas |
| Pembayaran | Midtrans ATAU Xendit (QRIS, VA) + Google Play Billing + Apple StoreKit | Verifikasi server-side semua kanal |
| Native Android | **TWA (Bubblewrap)** dari PWA + Digital Goods API | Aplikasi ringan, selalu sinkron dengan PWA |
| Native iOS | **Capacitor** (shell WKWebView dari codebase sama) + StoreKit 2 | Push notif APNs menyusul bila perlu |
| Deploy | Vercel (frontend+API) + Supabase cloud + Upstash Redis | Sentry untuk error & crash tracking |

### 9.2 Alur data query riset

```
User (PWA chat) → API /research (auth, cek+hold kredit)
  → enqueue job → worker:
      1) corpus_search (pgvector) — hit? → jawab dari cache (tarif cache)
      2) miss → Claude agent loop dengan tools:
         tiktok_trends | google_trends_id | marketplace_snapshot | web_search | corpus_search
      3) susun jawaban terstruktur (skema §17) → simpan research_results + embedding → commit kredit
  → streaming status & jawaban ke client (SSE)
```

### 9.3 Definisi tools agen (kontrak implementasi untuk Claude Code)

1. **`tiktok_trends(kategori?, keyword?, region="ID", periode)`** → fetcher TikTok Creative Center (data publik): hashtag/keyword/produk yang naik, volume & pertumbuhan. Implementasi: HTTP fetch endpoint publik CC + parser; fallback headless bila perlu; cache 6 jam per kombinasi parameter.
2. **`google_trends_id(keywords[], periode, geo="ID"|kota)`** → interest-over-time & related queries. Implementasi: Google Trends (API resmi bila tersedia akses; fallback service kecil bergaya pytrends); cache 12 jam.
3. **`marketplace_snapshot(query, platform="shopee"|"tokopedia", maks=20)`** → snapshot on-demand halaman pencarian publik (judul, harga, terjual, rating) untuk SATU query saat itu; bukan crawler kontinyu. Implementasi: fetch + parser di worker dengan rotasi UA, rate ketat, circuit breaker; hasil disimpan sebagai bukti dengan timestamp. Jika diblokir → tool melapor gagal, agen lanjut dengan sumber lain.
4. **`web_search(query)`** → berita/konteks (provider search API).
5. **`corpus_search(query_embedding, filter kategori/kota, max_age_days=7)`** → cari korpus internal.

Aturan agen: maks 6 panggilan tool/query; wajib sebut sumber+tanggal; dilarang mengarang angka; jika semua tool gagal → jawab jujur + refund kredit.

### 9.4 Smart contracts (Solidity — minimal & auditable, semua di **opBNB**)

1. **`IDMReborn.sol`** — BEP-20 standar (basis OpenZeppelin), suplai tetap **1.000.000.000**, tanpa fungsi mint ulang. Likuiditas awal pair **IDM/BNB** di DEX (proses di luar aplikasi, mengikuti dokumen tokenomics §16).
2. **`IDMX.sol`** — BEP-20, suplai tetap **10.000.000.000.000**, `burnable`. Alokasi mayoritas ke pool reward (`MissionRewards`) + cadangan treasury.
3. **`MissionRewards.sol`** — pola voucher: backend menandatangani `(user, missionId, amount, nonce, deadline)`; user submit gasless → kontrak verifikasi signature signer resmi → transfer **IDMX** dari pool reward; nonce anti-replay; cap harian per address di kontrak; pausable.
4. **`IDMXSwapPool.sol`** — `swap(amountIDMX)`: `transferFrom` IDMX user → pool; hitung `amountIDM = amountIDMX / rate`; transfer Token IDM Reborn dari saldo pool → user; IDMX yang diterima diperlakukan sesuai mode (`burn` default / `retain`); `rate`, minimum, cap harian per user hanya bisa diubah owner dengan timelock; emit `Swapped(user, amountIDMX, amountIDM, rate)`; pausable.

Catatan: tidak ada dana rupiah menyentuh kontrak; tidak ada fungsi penjualan token; owner = multisig treasury; semua perubahan parameter lewat timelock; audit ringan + testnet ≥ 2 minggu sebelum mainnet.

### 9.5 Platform & Distribusi (PWA + Google Play + App Store)

**PWA standar industri — fondasi segalanya (satu codebase).**
- Manifest lengkap: ikon maskable & adaptive dari logo resmi, splash screen, `display: standalone`, shortcut ke Riset & Misi.
- Service worker: precache app shell, runtime cache API yang aman di-cache, halaman offline yang tetap menampilkan riwayat tersimpan.
- Installable dengan prompt kontekstual (muncul setelah aktivitas ke-2, bukan saat pertama datang).
- Responsif 3 breakpoint dengan pola navigasi berbeda per kelas perangkat: **mobile** (bottom nav 5 tab), **tablet** (top navigation/rail gaya dashboard industri — bukan tampilan HP yang diperbesar), **desktop** (top navigation ala aplikasi exchange).
- Ringan: bundle awal ≤ 200 KB gzip (code-splitting per rute, ikon SVG, font subset), gambar AVIF/WebP + lazy-load, skeleton loading di semua layar data.

**Android — Google Play.**
- **TWA (Trusted Web Activity)** via Bubblewrap: memakai PWA langsung sehingga aplikasi kecil, cepat, dan selalu sinkron dengan versi web; `assetlinks.json` terpasang.
- Pembelian kredit via **Digital Goods API → Google Play Billing** (produk konsumtif), verifikasi purchase token server-side.
- Deep link & app link berfungsi penuh (wallet connect §9.6, share link hasil riset membuka aplikasi).

**iOS — App Store.**
- **Capacitor** shell tipis (WKWebView) dari codebase yang sama; pembelian kredit via **StoreKit** (konsumtif), verifikasi receipt server-side.
- Universal links untuk share & wallet connect.

**Kepatuhan kebijakan store (dipatuhi sejak desain, bukan ditambal belakangan).**
- Kredit = barang digital konsumtif → di aplikasi native **wajib** dibeli lewat billing store. Ini sudah otomatis terpenuhi karena kredit memang hanya dibeli dengan uang (§7.5).
- Tidak ada penjualan token, penukaran token→kredit, atau ajakan membeli token di dalam aplikasi.
- Wallet non-custodial, klaim reward, dan penukaran IDMX→IDM Reborn adalah fitur utilitas token milik user sendiri (pola yang umum lolos review); teks UI menghindari framing investasi/imbal hasil.

**DappBay.**
- Submit listing di M6: profil proyek lengkap, kontrak terverifikasi di BscScan, hasil audit ringan, kanal sosial aktif, tautan aplikasi.
- Ranking dikejar lewat metrik riil: Unique Active Wallets & transaksi harian dari klaim misi + tukar IDMX (§3).

### 9.6 Konektivitas Wallet

- **Default untuk semua orang:** embedded wallet otomatis (tanpa seed phrase, gasless) — pengguna awam tidak perlu tahu apa-apa soal wallet untuk memakai seluruh aplikasi.
- **Wallet eksternal — mudah dari mana pun:** tombol "Hubungkan Wallet" memakai WalletConnect: di browser mobile / PWA ter-install → **deep link langsung membuka aplikasi dompet** (MetaMask, Trust Wallet, Binance Wallet, dst.) → user approve → otomatis kembali ke AIDM. Di desktop → QR code. Di aplikasi Google Play & App Store → deep link antar-aplikasi yang sama mudahnya.
- **Tidak pernah mengharuskan** membuka AIDM dari browser bawaan aplikasi dompet. (Tetap didukung bila user memilih jalur itu — PWA berjalan normal di in-app browser dompet mana pun.)
- Sesi wallet eksternal persist (reconnect otomatis); penautan alamat dibuktikan dengan tanda tangan pesan (gaya SIWE), bukan sekadar input alamat.

## 10. Model Data (Supabase Postgres — skema inti)

> RLS aktif di semua tabel user-facing. `id` = uuid default. Timestamp `created_at/updated_at` implisit di semua tabel.

```sql
-- Pengguna & profil
users(id, auth_provider, email, phone, role text check (role in ('calon','umkm')),
      kategori_id fk categories, sub_kategori text, kota text, provinsi text,
      status text default 'active', deleted_at)

wallets(id, user_id fk unique, address text unique, provider text default 'privy',
        chain_default text default 'bsc',
        external_address text nullable, external_linked_at timestamptz nullable)

categories(id, nama, slug, parent_id nullable)  -- taksonomi tetap 9 kategori + sub

-- Kredit (ledger append-only; saldo = SUM(amount))
credit_ledger(id, user_id fk, amount int,          -- + kredit masuk, - terpakai
      reason text check (reason in ('daily_free','purchase_fiat','purchase_iap',
      'research','research_cache','wizard','content','refund','admin_adjust')),
      ref_id uuid nullable,                        -- id order/query terkait
      balance_after int)                           -- denormalisasi utk cepat

-- Pembelian kredit (uang saja)
orders(id, user_id fk, channel text check (channel in ('qris','va','iap_google','iap_apple')),
      paket text, credits int, fiat_amount numeric,
      pg_reference text nullable,                  -- ref payment gateway
      store_receipt text nullable,                 -- purchase token / receipt store
      status text check (status in ('pending','paid','failed','expired','refunded')))

-- Riset
research_queries(id, user_id fk, mode text check (mode in ('chat','wizard')),
      input_text text, kategori_id fk nullable, kota text nullable,
      status text check (status in ('queued','running','done','failed','refunded')),
      credits_charged int, cache_hit bool default false, latency_ms int)

research_results(id, query_id fk, user_id fk, summary text, body jsonb,  -- skema §17
      sources jsonb,            -- [{tool, url?, fetched_at, note}]
      confidence smallint check (confidence between 1 and 3),
      embedding vector(1536))

trend_corpus(id, result_id fk, kategori_id fk, sub_kategori text, kota text nullable,
      topik text, ringkas text, sources jsonb, confidence smallint,
      embedding vector(1536), expires_hint date)   -- anonim, tanpa user_id

-- Konten
content_generations(id, user_id fk, source_result_id fk nullable,
      format text check (format in ('tiktok_script','ig_caption','promo_copy','calendar7')),
      input jsonb, output jsonb, credits_charged int)

-- Misi & reward IDMX
missions(id, code unique, judul, deskripsi, reward_idmx numeric, tipe text
      check (tipe in ('daily','weekly','once')), aktif bool default true)

mission_events(id, user_id fk, mission_id fk, progress jsonb, completed_at nullable)

mission_claims(id, user_id fk, mission_id fk, amount_idmx numeric, nonce bigint,
      signature text, tx_hash text nullable,
      status text check (status in ('signed','submitted','confirmed','failed')))

-- Tukar IDMX → IDM Reborn
swaps(id, user_id fk, amount_idmx numeric, amount_idm numeric, rate numeric,
      tx_hash text nullable,
      status text check (status in ('pending','confirmed','failed')))

-- Kirim IDM Reborn ke wallet eksternal tertaut
withdrawals(id, user_id fk, to_address text, amount_idm numeric, tx_hash text nullable,
      status text check (status in ('pending','confirmed','failed')))

-- Konfigurasi & admin
app_config(key text primary key, value jsonb)   -- semua parameter §8
admin_users(id, user_id fk, level text)
```

Indeks penting: `credit_ledger(user_id, created_at)`, ivfflat/HNSW pada kedua kolom `embedding`, `trend_corpus(kategori_id, kota, created_at)`, `orders(status)`, unique `mission_claims(user_id, mission_id, nonce)`, `swaps(user_id, created_at)`, `withdrawals(user_id, created_at)`.

## 11. API Endpoints (route handlers)

```
POST /api/auth/session            -- tukar token provider → sesi (cookie httpOnly)
GET  /api/me                      -- profil + saldo kredit + saldo IDMX & IDM Reborn (on-chain read)
PATCH /api/me                     -- update peran/kategori/kota/preferensi

POST /api/research                -- {text|wizard_input} → {query_id} (hold kredit)
GET  /api/research/:id/stream     -- SSE status + jawaban
GET  /api/research?page=          -- riwayat
POST /api/research/:id/refresh    -- riset ulang dari cache (tarif segar)

POST /api/content                 -- generate konten {format, input|result_id}
GET  /api/content?page=

GET  /api/credits/ledger?page=
POST /api/orders/fiat             -- buat order QRIS/VA → payment url/QR
POST /api/webhooks/payment        -- webhook PG (verifikasi signature!)
POST /api/orders/iap/verify       -- {platform, purchase_token|receipt} → verifikasi store → kredit (idempoten)

GET  /api/missions                -- daftar + progress hari ini
POST /api/missions/:id/claim      -- → voucher signed {amount, nonce, sig, deadline}
POST /api/missions/:id/submitted  -- {tx_hash} → track konfirmasi

GET  /api/swap/quote              -- {amount_idmx} → {rate, amount_idm, min, cap_tersisa}
POST /api/swap/confirm            -- {tx_hash} → verifikasi event Swapped → catat

POST /api/wallet/external/link    -- {address, signature} → tautkan wallet eksternal (bukti tanda tangan)
POST /api/wallet/withdraw         -- kirim IDM Reborn ke alamat tertaut (gas dibayar user, cap harian)
GET  /api/wallet/txs              -- riwayat on-chain diterjemahkan bahasa manusia
POST /api/account/delete          -- proses hapus akun (UU PDP)

-- Admin (guard admin_users)
GET  /api/admin/stats             -- DAU, query, biaya AI, reward terdistribusi, volume tukar, saldo pool
GET/PUT /api/admin/config         -- parameter §8 (app_config)
```

## 12. Kebutuhan Non-Fungsional

- **Kinerja:** riset segar p90 ≤ 90 dtk (streaming mulai ≤ 5 dtk); cache ≤ 10 dtk; konten ≤ 20 dtk.
- **Kualitas PWA (standar industri, terukur):** Lighthouse Performance ≥ 90 (mobile) & kategori PWA lulus; LCP ≤ 2,5 dtk di 4G; INP < 200 ms; CLS < 0,1; bundle awal ≤ 200 KB gzip; berjalan mulus di perangkat Android kelas menengah-bawah.
- **Aplikasi store:** crash-free sessions ≥ 99%; ukuran unduhan Android kecil (TWA); paritas fitur penuh dengan PWA kecuali kanal pembelian kredit (mengikuti platform).
- **Biaya:** guard biaya AI per query (cap tool call & token); dashboard admin menampilkan biaya AI harian vs revenue; alert bila biaya/user > ambang.
- **Keamanan:** RLS Supabase; webhook PG & receipt store diverifikasi server-side; voucher misi signed + nonce; secrets di env; kontrak: owner multisig + timelock, audit ringan + testnet ≥ 2 minggu sebelum mainnet.
- **Privasi (UU PDP):** korpus tren tidak menyimpan identitas user; snapshot ulasan/marketplace tidak menyimpan nama reviewer; halaman kebijakan privasi & penghapusan akun tersedia sejak rilis.
- **Ketersediaan:** degradasi anggun — tiap tool eksternal bisa mati tanpa mematikan fitur (agen menyebut keterbatasan); antrian job dengan retry.
- **Aksesibilitas & bahasa:** seluruh UI Bahasa Indonesia, tanpa jargon crypto di alur inti; istilah Web3 muncul di area wallet/misi dengan penjelasan satu kalimat; kontras teks memenuhi WCAG AA; target sentuh ≥ 44 px.

## 13. Inventaris Layar & Sistem Desain (input untuk Claude Code)

> **Identitas visual.** Logo resmi tersedia: `logo_idm.png` (monogram emas 3D di latar putih) — jadikan sumber ikon aplikasi, maskable icon, splash, dan aksen brand. Arah tema yang sudah diputuskan sebelumnya tetap berlaku: **terang & bersih** (dominan putih #FAFAFA, teks hitam pekat, kartu putih ber-border tipis) dengan **aksen emas** (#F0B90B/#FCD535) untuk tombol & highlight — selaras dengan warna logo; kartu **gelap-emas premium hanya** untuk area Wallet & Reward sebagai aksen Web3. Mobile: bottom nav 5 tab; tablet/desktop: top navigation gaya aplikasi exchange. Header maksimal 3 elemen di mobile.

> **Referensi gaya (final): aplikasi "Alma" (Mobbin).** Yang diadaptasi adalah **pola & rasa**, bukan aset/warna Alma — dilarang meniru piksel, ilustrasi, atau paletnya:
> - **Latar & kartu:** putih hangat #FAFAFA polos (bukan hijau/krem Alma); kartu putih radius besar (±24px), bayangan sangat lembut, banyak ruang napas; satu fokus per layar saat onboarding (satu pertanyaan per layar, pilihan berupa chip/kartu, indikator titik carousel).
> - **Warna aksi:** CTA utama pill full-width **charcoal #1F1F1F teks putih** (padanan tombol hijau tua Alma); aksen emas #F0B90B→#FCD535 untuk ikon aktif, progress, highlight angka; hindari emas sebagai blok latar luas agar tidak norak.
> - **Tipografi:** judul, sapaan, dan pertanyaan pakai **serif display** (mis. Fraunces); body, angka, dan data pakai **Plus Jakarta Sans/Inter**. Kontras serif–sans inilah ciri khas rasa Alma.
> - **Pola komponen yang diambil:** pill toggle di atas (dipakai untuk mode **Riset | Konten**); chip saran pertanyaan berkelompok ("Untukmu", "Gali lebih dalam") di atas kolom input "Tanya apa saja…"; jawaban riset tampil sebagai **halaman artikel**: kartu "Kamu bertanya" (judul serif besar + timestamp) lalu isi terstruktur + input "Tanya lanjutan…" menempel bawah; **gauge lingkaran** untuk skor/confidence peluang usaha; **counter kredit** pill di kanan-atas Beranda (padanan counter kelapa Alma); kartu-kartu bertumpuk yang bisa ditutup untuk edukasi/onboarding di Beranda.
> - Navigasi tetap 5 tab tanpa FAB tengah (keputusan §13 bawah); animasi halus, transisi ringan, tanpa ornamen berat — target Lighthouse §9.5 tetap mengikat.

> **Design token final (WAJIB — hasil review build pertama).** Build v1 sudah benar strukturnya tapi belum terasa Alma karena tiga hal: judul belum serif, warna terlalu dingin, kartu terlalu datar. Perbaiki dengan token pasti berikut (taruh di `tailwind.config` + CSS variables, jangan hardcode per komponen):
>
> **Tipografi (paling penting):**
> - Judul, sapaan, semua pertanyaan/prompt, judul kartu "Kamu bertanya", angka besar (skor/gauge) → **Fraunces** (serif display), weight 500–600, `font-optical-sizing: auto`. Ini identitas utama; jangan ada judul yang tersisa sans.
> - Body, label, chip, data numerik kecil, nav → **Plus Jakarta Sans** (fallback Inter).
> - Skala mobile: H1 32–36px / lh 1.1, H2 22px, judul kartu 18px, body 15–16px. Desktop H1 boleh 40–44px. Kontras serif–sans inilah rasa Alma; wajib terlihat jelas.
>
> **Warna (hangatkan, jangan hijau):**
> - `--bg`: #FAF7F0 (ivory hangat, BUKAN #FAFAFA dingin) · `--surface`: #FFFFFF · `--surface-warm`: #F4EFE6 (chip/kartu sekunder)
> - `--text`: #211C15 (near-black hangat, BUKAN hitam murni) · `--text-muted`: #8A8175
> - `--gold`: #F0B90B · `--gold-light`: #FCD535 (ikon aktif, progress, angka highlight, gauge) — jangan jadi blok latar luas
> - `--cta`: #1B1B1B teks putih (pill full-width; padanan tombol hijau Alma) · `--danger`: #C0392B (Hapus akun/Keluar)
> - Kartu Wallet & Reward tetap gelap-emas (sudah benar di build v1) — pertahankan.
>
> **Bentuk & elevasi:**
> - Radius: kartu 24px, kartu kecil/chip 16–999px (pill), tombol 999px.
> - Shadow lembut menggantikan border tipis: `0 4px 24px rgba(33,28,21,.06)`; hindari garis 1px abu sebagai pemisah utama.
> - Padding chip lebih lega (±20px horizontal, 12px vertikal); jarak antar-section 24–32px; kartu "mengambang" dengan ruang napas, bukan rapat.
>
> **Komponen spesifik yang harus dikoreksi dari build v1:**
> - Tombol kirim di kolom input: dari abu → **charcoal atau gold**, bukan abu netral.
> - Desktop: kolom konten ~760px terlalu kosong di layar lebar — beri latar ivory penuh + pertimbangkan max-width 860px dan sedikit ilustrasi/aksen di sisi kosong (opsional), atau biarkan terpusat tapi pastikan background hangat mengisi seluruh viewport.
> - Label chain di kartu wallet: ganti "BscScan" → **opBNBScan** (chain sudah opBNB, lihat §9.1), agar konsisten.

1. **Onboarding:** splash/landing → auth (email/HP/Google) → pilih peran → (jika UMKM) kategori+kota. Wallet tercipta diam-diam.
2. **Beranda:** sapaan + chip kredit & chip IDMX, kolom tanya (chat entry), template chips, kartu "Peluang Usaha", ringkasan misi hari ini, 2 riset terakhir.
3. **Chat Riset:** bubble user/AI, status riset streaming, kartu jawaban terstruktur (ringkasan/data/aksi), tombol lanjutan, sheet kredit kurang.
4. **Wizard Peluang Usaha:** 4 langkah + layar hasil (3 kartu rekomendasi) + kartu share.
5. **Konten:** form/format picker → hasil per blok (salin/regen) → riwayat konten.
6. **Riwayat:** daftar riset & konten, cari, pin.
7. **Kredit & Pembelian:** saldo, ledger, paket — QRIS/VA (PWA) atau billing store (aplikasi native). Tanpa jalur token.
8. **Misi & Reward:** daftar misi, progress, tombol Klaim, animasi sukses + saldo IDMX naik, edukasi singkat "Apa itu IDMX & IDM Reborn?".
9. **Wallet:** kartu gelap-emas — alamat, saldo IDMX & IDM Reborn, 10 tx terakhir bahasa manusia, tombol Tukar, Hubungkan Wallet Eksternal, Kirim ke wallet saya, menu lanjutan (ekspor, BscScan).
10. **Sheet Tukar IDMX → IDM:** input jumlah/chip persen, kurs berlaku, estimasi diterima, sisa kuota harian, konfirmasi, layar sukses + tautan BscScan.
11. **Profil & Pengaturan:** profil usaha, preferensi gaya AI, notifikasi, kebijakan privasi, hapus akun, ekspor wallet.
12. **Admin (web sederhana, boleh tanpa desain khusus):** stats, konfigurasi parameter, daftar user/query, monitor pool & reward.

Navigasi bawah (mobile): **Beranda · Riset · Konten · Misi · Akun** (5 tab, tanpa FAB tengah).

## 14. Roadmap & Milestone

| Milestone | Isi | Definisi selesai |
|---|---|---|
| M0 (minggu 1) | Setup repo, Supabase schema, auth + wallet otomatis, skeleton PWA (manifest + service worker sejak awal) | Login → Beranda dengan wallet tercipta; PWA installable |
| M1 (minggu 2–3) | Agen riset + 5 tools + cache + kredit gratis harian | AC §7.2 lulus di staging |
| M2 (minggu 4) | Wizard Peluang Usaha + Generator Konten | AC §7.3–7.4 lulus |
| M3 (minggu 5) | Pembelian kredit QRIS/VA + ledger + paket | AC §7.5 (jalur PG) lulus sandbox |
| M4 (minggu 6) | Kontrak `IDMX`, `MissionRewards`, `IDMXSwapPool` (+`IDMReborn`) di testnet; klaim (gasless) & tukar (gas user) end-to-end | AC §7.6–7.7 lulus testnet |
| M5 (minggu 7) | Wallet card + hubungkan wallet eksternal + kirim ke wallet + riwayat + admin + hardening UU PDP; audit ringan kontrak; Lighthouse targets §12 tercapai | Semua AC §7 lulus staging |
| M6 (minggu 8) | Kontrak ke mainnet BSC (sesuai rencana tokenomics §16), beta tertutup 100 user, perbaikan, **launch publik PWA**, **submit listing DappBay** | PWA live + listing DappBay diajukan |
| M7 (minggu 9–10) | **Rilis Google Play** (TWA + Play Billing) & **submit review iOS** (Capacitor + StoreKit) → rilis App Store; mulai kampanye ranking DappBay | Aplikasi live di Google Play; iOS live/menunggu review; metrik on-chain berjalan |
| Fase 2 | WA bot, digest, review mining, staking IDM Reborn, referral IDMX | — |
| Fase 3 | API B2B + MCP, attestation korpus, price tracker | — |

## 15. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Sumber data berubah/diblokir (TikTok CC, marketplace) | Kualitas jawaban turun | Arsitektur multi-tool + degradasi anggun; parser terisolasi per tool; monitoring keberhasilan tool di admin |
| Biaya AI > revenue di fase awal | Runway terbakar | Cache agresif, cap tool/token, free tier ketat, tarif dapat diubah dari admin tanpa deploy |
| Abuse reward misi / farming IDMX | Emisi IDMX bocor, pool tersedot | Voucher signed + nonce, cap harian di kontrak (klaim & tukar), device fingerprint, deteksi pola di backend |
| Kurs tukar salah set / pool terkuras | Kerugian treasury | Perubahan kurs hanya via owner multisig + timelock; cap harian; alert saldo pool; fitur pausable |
| Kualitas jawaban mengarang | Kepercayaan hancur | Aturan wajib sumber+tanggal, refusal jika data kosong, sampling QA mingguan |
| Review Google Play / App Store | Penolakan / delay rilis | Kredit dibeli via billing store di aplikasi native (sudah by-design); tanpa penjualan token in-app; wallet non-custodial; teks UI bebas framing investasi |
| Regulasi kripto / PDP | Legal | IDMX & IDM Reborn diposisikan token utilitas; tidak ada custody rupiah; tidak ada penjualan token in-app; PDP compliance §12; konsultasi legal sebelum kampanye besar |
| Ketergantungan provider embedded wallet | Lock-in | Fitur ekspor wallet sejak MVP; abstraksi layer wallet di kode |

## 16. Keputusan Terbuka (harus diputuskan Product Owner sebelum/di awal milestone terkait)

1. **Domain & ticker:** domain AIDM (domain baru vs subdomain idmtoken.com); simbol on-chain Token IDM Reborn di DEX dan ticker IDMX.
2. **Provider embedded wallet:** Privy (default PRD) vs Web3Auth vs Particle. *(sebelum M0)*
3. **Payment gateway:** Midtrans vs Xendit. *(sebelum M3)*
4. **Kurs awal IDMX → IDM Reborn** + kebijakan peninjauan berkala (siapa memutuskan, seberapa sering). Ditentukan sambil berjalan, wajib final **sebelum aktivasi tukar di mainnet (M6)**.
5. **Perlakuan IDMX yang masuk pool:** burn (default) vs kembali ke pool reward. *(sebelum M4 — memengaruhi kontrak)*
6. **Minimal & cap tukar harian, angka reward misi** — konfirmasi angka default §7.6–§8.3. *(sebelum M4)*
7. **Harga SKU paket kredit di Google Play & App Store** (menyerap fee store). *(sebelum M7)*
8. **Tokenomics Token IDM Reborn** — alokasi 1 miliar (pool tukar, likuiditas DEX, treasury, tim, vesting) → dokumen tokenomics terpisah, final **sebelum mainnet (M6)**.
9. **Chain final:** semua kontrak & aktivitas on-chain AIDM (IDMX, klaim misi, tukar) di **opBNB** — bukan opsional, keputusan tetap demi gas murah (ditanggung tim) dan konsolidasi metrik DappBay di satu chain. Catatan teknis: karena Token IDM Reborn tetap di BSC (pair BNB di DEX), mekanisme `IDMXSwapPool` perlu jalur lintas-chain (bridge resmi opBNB↔BSC atau kontrak mirror) — detail final ditentukan tim teknis sebelum M4.

## 17. Lampiran — Kontrak Output Agen & Prompt Sistem (ringkas)

**Skema jawaban riset (`research_results.body` jsonb):**
```json
{
  "ringkasan": "2-3 kalimat inti temuan",
  "temuan": [
    {"poin": "…", "angka": "…", "sumber": "tiktok_trends", "tanggal": "2026-08-06"}
  ],
  "peluang_aksi": ["aksi konkret 1", "aksi konkret 2", "aksi konkret 3"],
  "peringatan": "keterbatasan data bila ada",
  "saran_lanjutan": ["chip pertanyaan lanjutan 1", "chip 2"]
}
```

**Inti prompt sistem agen (dikembangkan penuh saat implementasi):**
- Peran: analis pasar UMKM Indonesia; jawab dalam Bahasa Indonesia sederhana, konkret, tanpa jargon.
- Wajib memakai tools untuk klaim angka; setiap angka menyebut sumber + tanggal; dilarang mengarang; jika data tak cukup, katakan jujur.
- Selalu akhiri dengan aksi yang bisa dilakukan user berskala mikro (modal kecil, langkah minggu ini).
- Konteks user (kategori, kota, peran) disertakan; sesuaikan rekomendasi ke lokal.
- Patuh moderasi: hanya topik bisnis/pasar/marketing; tolak selainnya dengan sopan.

---
**Definisi "MVP selesai":** seluruh checkbox AC §7.1–7.9 lulus di production dan M6 tercapai.
**Definisi "FULL APP selesai":** M7 tercapai — PWA live, aplikasi Google Play live, aplikasi iOS live (atau dalam review akhir), listing DappBay aktif.
