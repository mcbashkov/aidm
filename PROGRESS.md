# Papan Kerja AIDM

Pelacak pekerjaan lintas sesi. **README** menjelaskan produk & cara menjalankan;
berkas ini menjawab satu pertanyaan saja: *apa yang sudah beres, apa berikutnya,
dan siapa yang mengerjakan.*

Diperbarui: **2026-08-15** · cabang `main` @ `fd8e8ff`

**Legenda pemilik:** 🧑 = butuh tangan Anda (kunci, dompet, keputusan bisnis,
perangkat fisik) · 🤖 = bisa saya kerjakan sendiri

---

## Keadaan sekarang

| Milestone | Status | Bukti |
|---|---|---|
| M0 fondasi | ✅ selesai | migrasi 0001–0017, rute & onboarding v3.0 |
| M1 parser & tab Catat | ✅ selesai | `test:parser` 200/200 |
| M2 suara & offline | ✅ selesai | uji lapangan Android 2026-08-14 (3 akun nyata) |
| M3 Laporan & PDF | ✅ selesai | `test:api` mem-baca ulang isi PDF, bukan cuma header |
| M4 segel + misi | ✅ kode selesai | segel **live di opBNB testnet**; misi tinggal deploy kontrak |
| M5 premium & kredit | ⬜ belum mulai | — |
| M6 mainnet & beta | ⬜ belum mulai | — |
| M7 Play & App Store | ⬜ belum mulai | — |

**Gerbang otomatis terkini:** `test:parser` 200/200 · `test:canonical` 23/23 ·
`test:api` 115/115 · typecheck · lint · build · CI hijau.

**Produksi:** `ai.idmtoken.com` (Vercel) — auto-deploy dari `main`.

**On-chain (opBNB testnet, chainId 5611):**
`ReportAttestation` = `0xa83c201c3759fa1a92bd17dbebb46b85029a84c4`

---

## Berikutnya — berurutan

### 1. 🧑 Aktifkan klaim misi (menutup M4 sepenuhnya)

```bash
pnpm deploy:rewards          # deploy IDMX + MissionRewards + danai kontrak
```

- [ ] Wallet deployer terisi tBNB **opBNB Testnet (5611)** — bukan BSC Testnet (97)
- [ ] Jalankan skrip, salin 4 env yang dicetak ke `.env.local`
- [ ] Salin 4 env yang sama ke Environment Variables Vercel → **redeploy**
- [ ] Uji: buka tab Misi, klaim "Catat transaksi pertama hari ini" → IDMX masuk,
      tautan opBNBScan tampil

Sampai ini selesai: tombol Klaim nonaktif berketerangan, API menjawab 501.
Aman berada di produksi — tidak ada yang rusak, hanya belum aktif.

### 2. 🤖 Hidupkan tab Misi tiap hari — **disepakati 2026-08-15, siap dikerjakan**

Masalahnya nyata: di hari biasa hanya **2 misi** yang bisa diklaim. Setelah
keduanya selesai, tab Misi jadi layar mati sampai besok. Empat misi berikut
dipilih bukan sekadar menambah hadiah, tapi karena **membayar perilaku yang
memang kita inginkan**:

- [ ] Catat pemasukan **dan** pengeluaran hari ini — **20/hari**
      *(laporan hanya berguna kalau dua sisi tercatat; sekarang user bisa cuma
      mencatat pemasukan dan laporannya timpang)*
- [ ] Catat pakai suara hari ini — **15/hari**
      *(suara adalah pembeda utama vs BukuWarung, tapi tidak ada apa pun yang
      mendorong orang mencobanya)*
- [ ] Buka Laporan mingguan — **30/minggu**
      *(kebiasaan MEMBACA laporan — inti bankability, bukan sekadar menimbun data)*
- [ ] Runtun 30 hari — **300/bulan**
      *(runtun 7 hari terlalu cepat selesai lalu tidak ada tangga berikutnya)*

Dampak: 4 misi/hari (dari 2) · 70 → **105 IDMX/hari** · 32.600 → **50.535
IDMX/tahun**. Cap harian 250 tidak perlu diubah (masih ada ruang 2,4×). Kolam
100 juta tetap cukup untuk beta 100 user selama ~20 tahun (dari 31).

### 3. 🤖 Utang teknis kecil

- [ ] Peringatan saldo kontrak reward menipis — kalau habis, klaim *revert* dan
      user melihat kegagalan membingungkan, bukan penjelasan
- [ ] Saldo IDMX di header/Akun masih hardcode `0` — kontraknya sudah ada,
      tinggal dibaca on-chain
- [ ] Bundle `/masuk` 848 KB vs target §12 ≤200 KB — SDK Privy, perlu lazy-load
- [ ] 4 tombol Pengaturan di `/akun` masih mati (gaya bahasa AI, notifikasi,
      kebijakan privasi, ekspor wallet)

### 3. 🧑 Verifikasi lapangan yang belum dilakukan

- [ ] Prompt instal PWA di Android (ikon maskable sudah lengkap sejak M0 — kalau
      gagal, penyebabnya bukan itu)
- [ ] Serahkan 1 PDF ke petugas bank/koperasi sungguhan — **ini gerbang wajib M6**,
      dan satu-satunya yang tidak bisa disimulasikan

### 4. 🤖 M5 — premium di balik kredit

- [ ] Fitur riset & konten dipagari Kredit AI (§7.8)
- [ ] Pembelian kredit Midtrans (QRIS/VA) — env sudah di-scaffold
- [ ] Hardening PDP: purge `raw_input` 90 hari (§16 #10, sudah diputuskan)

### 5. 🧑 M6 — mainnet & beta tertutup 100 user

Prasyarat sebelum mulai: keputusan §16 #5, #8, #11 (lihat di bawah).

---

## Keputusan yang menunggu Anda (§16)

Delapan dari sebelas sudah terkunci. Tiga sisanya sengaja tidak saya putuskan
sepihak — masing-masing berkonsekuensi finansial, legal, atau keamanan.

| # | Keputusan | Kapan dibutuhkan |
|---|---|---|
| 8 | **Alokasi tokenomics 1 miliar IDM Reborn** — berapa % ke kolam swap | **memblokir #5** |
| 5 | Kurs IDMX → IDM Reborn (mekanisme sudah disepakati, **angka rasionya** belum) | sebelum fitur Tukar |
| 11 | **Lintas-chain BSC ↔ opBNB** (rekomendasi: kontrak mirror IDM di opBNB) | **memblokir fitur Tukar** |

### Kenapa #8 dan #11 lebih mendesak daripada yang tercatat sebelumnya

**#5 tidak bisa diputuskan sebelum #8.** Kurs bukan pilihan bebas, melainkan
hasil bagi:

```text
kurs = IDMX yang akan terbit selama periode ÷ IDM yang dialokasikan ke kolam swap
```

Pembilangnya sudah bisa dihitung (lihat bagian ekonomi). Penyebutnya = #8.
Selama #8 kosong, angka kurs apa pun hanyalah tebakan berbaju perhitungan.

Peta konsekuensi (asumsi 5 tahun · rata-rata 20.000 user aktif · misi versi usulan):

| Alokasi kolam swap | IDM tersedia | Kurs impas | User rajin dapat |
|---|---|---|---|
| 10% dari 1 miliar | 100 juta IDM | ~51 IDMX = 1 IDM | ~991 IDM/tahun |
| **20%** | 200 juta IDM | **~25 IDMX = 1 IDM** | ~2.021 IDM/tahun |
| 30% | 300 juta IDM | ~17 IDMX = 1 IDM | ~2.973 IDM/tahun |

**Saran arah:** mulai konservatif (angka IDMX per IDM lebih tinggi), lalu
longgarkan tiap kuartal sesuai mekanisme §16 #5 yang sudah disepakati.
Alasannya tidak bisa ditawar: menaikkan kemurahan hati selalu bisa, menurunkannya
menghancurkan kepercayaan secara permanen.

**Peringatan komunikasi:** harga IDM Reborn belum terbentuk (token belum
diperdagangkan). Jadi nilai rupiah reward **belum bisa dijanjikan ke user** —
UI harus menampilkan jumlah IDM, bukan taksiran rupiah.

**#11 ternyata memblokir fitur Tukar, bukan sekadar "menjelang mainnet".**
IDMX hidup di opBNB, IDM Reborn di BSC. Satu kontrak swap tidak bisa menyentuh
dua jaringan sekaligus. Selama #11 belum diputuskan, menu Tukar tidak bisa
dibangun sama sekali.

### Alur Tukar yang direncanakan (§7.7 — terhalang #8 & #11)

1. User kumpulkan IDMX dari misi (opBNB)
2. Buka menu Tukar
3. Kontrak `IDMXSwapPool`: **IDMX dibakar** (§16 #6 sudah diputuskan), IDM
   dilepas dari kolam pada kurs sistem
4. IDM masuk wallet user; menjembatani ke BSC menyusul sebagai fitur terpisah

Tabel `swaps` sudah ada sejak migrasi 0005 — skemanya siap, kontrak & kursnya
yang belum.

---

## Ekonomi reward IDMX — perhitungan

Angka pendanaan awal kontrak reward (**100 juta IDMX**) di
`scripts/deploy-rewards.mjs` adalah **float kerja untuk testnet & beta**, bukan
angka yang diturunkan dari tokenomics. Berikut dasarnya, supaya bisa ditinjau.

**Yang bisa diperoleh satu pengguna paling rajin dalam setahun:**

| Misi | Nilai | Frekuensi maksimal | Setahun |
|---|---|---|---|
| Catat transaksi pertama hari ini | 20 | harian | 7.300 |
| Catat 5 transaksi dalam sehari | 50 | harian | 18.250 |
| Catat 7 hari beruntun | 100 | mingguan | 5.200 |
| Segel laporan bulanan | 150 | bulanan | 1.800 |
| Lengkapi profil usaha | 50 | sekali | 50 |
| **Total** | | | **≈ 32.600 IDMX/tahun** |

Catatan: cap harian 250 IDMX **tidak pernah tersentuh** — misi harian yang
tersedia hanya berjumlah 70/hari. Cap itu jaring pengaman untuk misi baru di
masa depan dan untuk penyalahgunaan, bukan batas yang mengikat hari ini.

**Berapa lama 100 juta IDMX bertahan:**

| Skala | Perhitungan | Cukup untuk |
|---|---|---|
| Testnet (beberapa akun uji) | — | praktis tak terbatas |
| **Beta tertutup M6 (100 user)** | 100 × 32.600 = 3,26 jt/tahun | **~30 tahun** |
| Target §3 (50.000 user, ~35% aktif) | ≈ 600 jt/tahun | **~2 bulan** |

**Kesimpulan jujur:** 100 juta **memadai untuk testnet dan beta M6**, dan itu
memang cakupan yang sedang kita kerjakan. Angka itu **tidak** disiapkan untuk
skala 50.000 user — di sana kolam reward habis dalam hitungan bulan.

Perspektif pasokan: 100 juta dari 10 triliun = **0,001%**. Jadi ini bukan soal
kekurangan token, melainkan soal *berapa banyak yang sengaja dialokasikan untuk
reward* — dan itu justru keputusan §16 #8 yang masih terbuka.

**Yang perlu dilakukan sebelum launch publik:**

1. Tetapkan alokasi kolam reward di dokumen tokenomics (§16 #8) — 🧑
2. Danai ulang kontrak sesuai alokasi itu; mengisi ulang cukup `transfer` biasa
   dari treasury, tidak perlu deploy ulang — 🧑
3. **Pasang peringatan saldo menipis** — 🤖. Ini risiko operasional nyata: bila
   saldo kontrak habis, klaim akan *revert* dan pengguna melihat kegagalan yang
   membingungkan, bukan pesan yang menjelaskan. Sebaiknya API memeriksa saldo
   lebih dulu dan berkata apa adanya.

---

## Catatan yang menghemat waktu nanti

- **Uji lapangan wajib untuk hal yang menyentuh perangkat.** Bug service worker
  yang membekukan login baru tidak muncul di localhost sama sekali — SW memang
  dimatikan saat `NODE_ENV=development`. Bug apa pun di SW secara struktural
  mustahil terlihat di dev.
- **Database uji = database produksi.** `SUPABASE_DB_URL` menunjuk instance yang
  sama dengan Vercel, dan kini berisi akun nyata. `pnpm test:api` aman (data uji
  ber-prefix `did:privy:__test__` dan dibersihkan), tapi query test wajib
  di-scope ketat ke user uji.
- **Jalur sukses on-chain tidak diuji rutin.** `test:api` sengaja hanya menguji
  penolakannya, karena menjalankan klaim/segel sungguhan akan membakar gas
  testnet tiap kali test dijalankan. Jalur sukses diverifikasi manual.
- **Env tanpa `NEXT_PUBLIC_` tidak boleh dibaca komponen klien.** Di browser
  nilainya `undefined` dan diam-diam jatuh ke nilai default yang salah. Pola
  benar: server merakit nilai jadinya, klien tinggal menampilkan.
