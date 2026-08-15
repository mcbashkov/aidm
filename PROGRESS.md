# Papan Kerja AIDM

Pelacak pekerjaan lintas sesi. **README** menjelaskan produk & cara menjalankan;
berkas ini menjawab satu pertanyaan saja: *apa yang sudah beres, apa berikutnya,
dan siapa yang mengerjakan.*

Diperbarui: **2026-08-15** · cabang `main` @ `97f4d3e`

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

### 2. 🤖 Utang teknis kecil

- [ ] Bundle `/masuk` 848 KB vs target §12 ≤200 KB — SDK Privy, perlu lazy-load
- [ ] 4 tombol Pengaturan di `/akun` masih mati (gaya bahasa AI, notifikasi,
      kebijakan privasi, ekspor wallet)
- [ ] Saldo IDMX di header/Akun masih hardcode `0` — sekarang sudah ada kontrak,
      bisa dibaca on-chain
- [ ] Peringatan saldo kontrak reward menipis (lihat "Ekonomi reward" di bawah)

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
| 5 | Kurs IDMX → IDM Reborn (mekanisme sudah disepakati, **angka rasionya** belum) | sebelum M6 |
| 8 | Alokasi tokenomics 1 miliar IDM Reborn (dokumen terpisah, mungkin perlu review legal) | sebelum M6 |
| 11 | Bridge lintas-chain BSC ↔ opBNB (rekomendasi: kontrak mirror dulu) | sebelum mainnet |

**#8 juga menentukan ukuran kolam reward IDMX** — lihat bagian berikut.

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
