# Insight untuk Whitepaper IDM Reborn

**Disusun:** 9 September 2026 · **Diperbarui:** 9 September 2026 (ekonomi token v2) · **Untuk:** PT IDM FILM SEJAHTERA
**Sumber:** repositori AIDM, pembacaan langsung on-chain, dan database produksi
**Status dokumen:** bahan mentah terverifikasi — **bukan** draf whitepaper

---

## 0. Cara memakai dokumen ini

Dokumen ini menyediakan bahan yang **bisa dipertanggungjawabkan** untuk
whitepaper. Ia tidak menulis whitepaper-nya: nada, urutan argumen, dan porsi
bab adalah keputusan Anda.

Satu aturan yang menentukan seluruh isinya: **setiap angka di sini punya
sumber yang bisa diperiksa ulang**, dan setiap hal yang belum ada dinyatakan
belum ada. Whitepaper adalah dokumen yang dibaca investor, bursa, dan —
mengingat posisi AIDM — regulator. Satu angka yang tidak bisa dipertahankan
merusak seluruh dokumen, dan kerusakannya tidak bisa ditarik kembali.

Karena itu isinya dipisah tiga tingkat, dan **pemisahan ini jangan diratakan
saat menulis whitepaper**:

| Tanda | Arti |
|---|---|
| ✅ **TERVERIFIKASI** | Dibaca langsung dari rantai, database, atau kode hari ini. Boleh dikutip apa adanya. |
| 🔒 **DIPUTUSKAN** | Sudah dikunci PO tetapi **belum dieksekusi**. Tulis sebagai rencana, jangan sebagai fakta. |
| ❌ **BELUM ADA** | Tidak ada buktinya di repositori ini. **Saya tidak mengarangnya** — harus Anda isi. |

---

## 1. Peta empat proyek — dan batas pengetahuan saya

IDM Reborn menaungi empat proyek.

> **Koreksi terhadap versi 8 September dokumen ini.** Saat itu saya menulis
> "nol bukti" untuk SkemGuard, Film, dan IDM Chain. Itu benar untuk repositori
> AIDM, dan **salah sebagai pernyataan umum** — repositori SkemGuard dan
> landing page ada di mesin yang sama, hanya di luar direktori yang saya
> periksa. Batas pemeriksaan saya terbaca sebagai batas kenyataan, dan itu
> kesalahan saya.

| Proyek | Status bukti | Apa yang ada |
|---|---|---|
| **AIDM** | ✅ Lengkap | Kode produksi, 7 kontrak di testnet, database nyata, pra-audit, metrik pengguna |
| **SkemGuard** | 🟡 Sebagian | Repositori `idmtoken/skemguard` dengan PRD lengkap + addendum reputasi deployer. Mendukung **6 jaringan** (Solana + Ethereum, BSC, Polygon, Base, Robinhood) — dibaca dari `lib/types.ts`. **Domainnya belum ada**: `skemguard.app` nol DNS per 9 Sep 2026 |
| **Film** | 🟡 Sebagian | Landing page menyebut **2 film tayang di bioskop nasional**. Tidak ada dokumen produk di repo mana pun; klaimnya perlu bukti sebelum masuk whitepaper |
| **IDM Chain (L2 BNB)** | ❌ Nol teknis | Disebut di landing page & roadmap ("testnet lebih dulu, mainnet hanya jika metrik tercapai"). **Tidak ada spesifikasi, kontrak, atau riset teknis** di mana pun |

**Konsekuensinya untuk whitepaper.** Porsi teknis blockchain memang menumpuk
di AIDM — dan itu kekuatan, bukan kelemahan, karena AIDM satu-satunya yang
sudah punya kontrak hidup dan pengguna nyata. Tapi whitepaper yang menyebut
empat proyek sementara hanya satu yang punya bukti teknis lengkap akan
langsung terbaca timpang oleh pembaca yang teliti — dan IDM Chain, yang paling
ambisius terdengar, justru yang paling tipis buktinya.

Dua jalan yang jujur, dan pilih satu secara sadar:

1. **Whitepaper bertahap** — IDM Reborn sebagai token ekosistem, AIDM sebagai
   *live product* pertama yang sudah berjalan, tiga lainnya sebagai roadmap
   dengan tanggal dan lingkup yang eksplisit ditandai "belum dibangun".
2. **Tunda** sampai minimal satu proyek lain punya spesifikasi teknis, lalu
   tulis whitepaper empat pilar yang seimbang.

Saya menyarankan **(1)**. Produk yang sudah jalan dengan pengguna nyata lebih
meyakinkan daripada empat janji yang setara bobotnya. §10 memuat kuesioner
untuk mengisi tiga proyek lainnya.

---

## 2. IDM Reborn — token

> **Angka ekonomi TIDAK disalin ke sini.** Sumbernya
> `docs/PERINTAH-AGEN-FINAL.md` **§0.1 versi 2, dikunci PO 9 September 2026**.
> Bagian ini hanya menerangkan bentuk dan alasannya; setiap angka diambil dari
> §0.1 saat whitepaper disusun, bukan dari halaman ini.
>
> **Versi 28 Agustus MATI.** Dokumen ini sempat memuatnya (alokasi
> 30/20/15/15/12/5/3, private sale diskon 33%, treasury 3-dari-5, sirkulasi
> TGE 11,75%). Seluruhnya sudah dicabut — bukan ditandai usang, dicabut.

### 2.1 Bentuk alokasi v2 — apa yang berubah dan kenapa itu penting

Satu perubahan mendominasi versi 2: **pos "Migrasi Holder v1" (16%, 160 juta
IDM) lahir**, dan seluruh pos lain menyusut untuk memberi ruang. Pos ini tidak
punya padanan di struktur lama — jangan mencoba memetakan satu ke yang lain.

Untuk whitepaper, ini bukan sekadar baris tabel. Ia **kewajiban kepada
pemegang token generasi sebelumnya**, 487 alamat, yang dibayar dari suplai
baru. Proyek yang membawa serta pemegang lamanya membaca sangat berbeda dari
proyek yang meninggalkan mereka, dan bab tokenomics sebaiknya menjelaskannya
sebagai keputusan, bukan menyelipkannya sebagai pos.

Perubahan lain: private sale $0,00333 → **$0,003571** (diskon **28,6%**, bukan
33%); treasury 15% → **10%**, multisig 3-dari-5 → **2-dari-3**.

### 2.2 Jadwal migrasi — bagian yang paling mudah salah tulis

| Kohort | Alamat | Di TGE | Sesudahnya |
|---|---|---|---|
| Saldo < 250.000 IDM | 357 (73,3%) | **100%** | — |
| Saldo ≥ 250.000 IDM | 130 | **20%** | linear **6 bulan dari TGE** |

**"Dari TGE", bukan dari tanggal klaim** — dan alasannya layak ditulis di
whitepaper, bukan hanya di kode. Bila dihitung dari tanggal klaim, pemegang
yang mengklaim terlambat justru selesai vesting paling akhir: keterlambatan
membaca pengumuman berubah menjadi hukuman. Dengan `t0` bersama, mengklaim
lebih lambat tidak pernah merugikan.

Ditegakkan `MigrationVesting.sol` (§4), bukan oleh kebijakan.

### 2.3 ⚠️ Satu angka yang masih perlu konfirmasi PO

Jumlah kedua kohort adalah **145.983.301**, sedangkan tabel alokasi menyebut
kewajiban terverifikasi **146.668.760** — **selisih 685.459 token**. Keduanya
dinyatakan berasal dari data migrasi aktual.

Konsekuensinya bukan kosmetik: kolam keterlambatan adalah sisa setelah
kewajiban, jadi ia **13.331.240** atau **14.016.699** tergantung angka mana
yang benar. **Jangan tulis salah satunya ke whitepaper sebelum diputuskan** —
angka yang tidak bisa direkonsiliasi dengan penjumlahannya sendiri adalah hal
pertama yang ditemukan pembaca teliti.

*(Catatan kecil terpisah: 20% × 120.907.014 membulat ke 24.181.403, sehingga
sirkulasi migrasi di TGE berjumlah 49.257.690 secara murni terhadap 49.257.689
di tabel. Selisih satu token, tidak material, dicatat agar tidak dikira salah
ketik.)*

### 2.4 Kolam keterlambatan — TODO, jangan dikarang

±13,3 juta IDM disisihkan untuk pemegang yang terlambat. **Mekanismenya
pro-rata dan belum ditentukan.** Whitepaper boleh menyebut keberadaannya;
tidak boleh menjelaskan cara kerjanya, karena caranya belum ada. Kolam yang
aturannya ditebak lebih buruk daripada kolam yang belum ada — yang pertama
terlihat resmi.

### 2.5 Treasury

100 juta IDM, multisig **2-dari-3** di BNB Chain. Ambang 2-dari-3 dipilih
sadar: dengan 3-dari-3, satu kunci hilang membekukan treasury permanen.

🧑 **Alamat Safe belum ada** dan harus dibuat PO. Lampiran whitepaper yang
menyebut treasury wajib memuat alamatnya — treasury tanpa alamat publik adalah
klaim yang tidak bisa diperiksa.

## 3. Arsitektur ekonomi dua token — inti teknis whitepaper

Ini bagian yang paling layak dijadikan bab tersendiri, karena ia menjelaskan
sesuatu yang jarang dikerjakan dengan benar: **memisahkan token aktivitas dari
token nilai**, di dua jaringan berbeda.

### 3.1 Peran masing-masing ✅

| Token | Jaringan | Pasokan | Peran |
|---|---|---|---|
| **IDMX** | opBNB | 50 miliar | Poin reward aktivitas in-app. Bukan alat pembayaran. |
| **IDM Reborn** | BNB Chain | 1 miliar | Token nilai ekosistem, dipasangkan dengan BNB di DEX |
| IDM lama (native) | — | — | Warisan, **tidak disentuh sama sekali** |

**Kenapa dua, bukan satu.** IDMX diterbitkan terus-menerus sebagai imbalan
aktivitas harian; kalau ia sekaligus token nilai, setiap pencatatan transaksi
menjadi inflasi langsung terhadap holder. Memisahkannya membuat aktivitas
harian murah dan berlimpah, sementara konversi ke nilai lewat gerbang yang
punya kurs, plafon, dan pembakaran.

**Kenapa dua jaringan.** opBNB dipilih untuk aktivitas karena gasnya cukup
murah untuk disponsori aplikasi — pengguna mikro tidak boleh diminta membeli
BNB untuk mencatat penjualan nasi goreng. BNB Chain dipilih untuk token nilai
karena di situlah likuiditas dan bursa berada.

**Ada pos ketiga yang sengaja tidak memakai token sama sekali:** langganan
Premium dibayar dengan uang biasa (QRIS/VA lewat Midtrans), **tidak pernah**
dengan token. Alasannya kepatuhan app store sekaligus pemisahan ekonomi:
ekonomi produk tidak boleh menyandera ekonomi token, dan sebaliknya.

### 3.2 Jembatan swap: burn-on-opBNB → claim-on-BSC ✅

Satu kontrak tidak bisa menyentuh dua jaringan. Mekanismenya:

```
1. Pengguna kumpulkan IDMX dari misi                     (opBNB)
2. SwapInitiator.requestSwap()  → IDMX DIBAKAR SUNGGUHAN  (opBNB)
      · totalSupply berkurang, terlihat di explorer
      · minimum 500 IDMX · cap 2.000 IDMX/minggu/dompet
      · ditolak DI SINI, sebelum burn — burn yang tak bisa ditebus
        adalah satu-satunya hal yang sistem ini tidak boleh hasilkan
3. Relayer memindai event SwapRequested                   (off-chain)
      · 15 konfirmasi (tahan reorg) · kursor di database
      · tanda tangan EIP-712, idempoten (nonce = primary key)
4. SwapClaim.claim(voucher, signature)  → IDM dilepas     (BSC)
      · kurs 50 IDMX : 1 IDM, disimpan on-chain
      · fee 1 IDM flat per klaim, 100% dibakar
      · gas dibayar pengguna (di sinilah ia sudah punya nilai)
```

**Tiga properti yang layak dijelaskan di whitepaper:**

1. **Burn sejati, bukan daur ulang.** IDMX yang ditukar hilang dari
   `totalSupply` — bisa diperiksa siapa pun di explorer. Kolam yang "dibakar"
   dengan cara dipindahkan ke alamat mati adalah klaim yang lebih lemah.
2. **One-way ratchet pada kurs.** `setRate` di `SwapClaim` menolak nilai yang
   memburuk bagi pengguna: kurs hanya boleh bergerak ke arah lebih murah hati.
   Ditegakkan kode, bukan janji. Alasannya tidak bisa ditawar — menaikkan
   kemurahan hati selalu bisa, menurunkannya menghancurkan kepercayaan secara
   permanen.
3. **Replay mustahil.** Setiap voucher membawa nonce; nonce terpakai ditolak
   selamanya. Bahkan backend yang sepenuhnya dikompromikan tidak bisa membuat
   satu voucher dibayar dua kali — kontrak yang menjaganya, bukan server.

### 3.3 Circuit breaker & plafon berlapis ✅

| Lapis | Nilai terpasang | Ditegakkan di |
|---|---|---|
| Minimum tukar | 500 IDMX | SwapInitiator (opBNB) |
| Cap per dompet | 2.000 IDMX / minggu WIB | SwapInitiator |
| Ambang alert global | 100.000 IDMX | SwapInitiator |
| Plafon global (lifetime) | 200.000 IDMX | SwapInitiator |
| Max per voucher | 2.000 IDMX (= 40 IDM) | SwapClaim (BSC) |
| Cap misi harian | 250 IDMX / dompet / hari | MissionRewards |
| Cap misi bulanan | 450 IDMX / dompet / bulan | MissionRewards |
| **Plafon global misi** | **500.000 IDMX / hari, seluruh pengguna** | MissionRewards |

Angka di atas **setelan testnet** dan sengaja konservatif.

**Kejujuran yang justru memperkuat bab keamanan.** Plafon global bukan
pertahanan Sybil, dan whitepaper tidak boleh menyebutnya begitu: kontrak tidak
bisa membedakan seribu alamat milik seribu orang dari seribu milik satu orang
— itu pertanyaan identitas, dan identitas hidup di backend. Yang dilakukan
plafon adalah **membatasi radius ledakan** bila kunci penandatangan bocor:
kerugian berhenti di satu hari, bukan seluruh kolam. Ongkosnya diakui terbuka
— penyalahguna bisa menolak reward semua orang sampai besok.

---

## 4. Inventaris kontrak — dibaca dari rantai hari ini ✅

**Tujuh** kontrak di testnet. Enam kontrak inti hidup sejak 21 Agustus 2026
dengan source terverifikasi 31 Agustus; kontrak ketujuh menyusul 9 September. Alamat lengkap, argumen konstruktor, dan setelan kompilasi ada di
`contracts/ALAMAT-DAN-CATATAN.md`.

| Kontrak | Jaringan | Fungsi |
|---|---|---|
| `IDMX` | opBNB testnet 5611 | Token reward, 50 miliar |
| `MissionRewards` | opBNB 5611 | Bayar reward misi atas voucher EIP-712 |
| `ReportAttestation` | opBNB 5611 | Segel hash laporan on-chain |
| `SwapInitiator` | opBNB 5611 | Bakar IDMX, terbitkan permintaan swap |
| `IDMReborn` | BSC testnet 97 | Token nilai, 1 miliar |
| `SwapClaim` | BSC 97 | Tebus voucher → lepas IDM dari kolam |
| `MigrationVesting` 🆕 | BSC 97 | Melepas alokasi Migrasi Holder v1 sesuai jadwal §0.1 |

> **`MigrationVesting` di testnet memakai pohon merkle DEMO**, bukan data
> migrasi nyata — daftar 487 alamat belum ada di repositori. `merkleRoot`
> immutable, jadi daftar final wajib ada sebelum deploy mainnet; kontrak ini
> tidak bisa "diisi belakangan". Itu bukan keterbatasan melainkan sifat yang
> dituju: alokasi yang bisa diganti owner bukan kewajiban, melainkan janji.

**Keadaan on-chain, dibaca 9 September 2026:**

```
IDMX.totalSupply           50.000.000.000   ✓ cocok dengan tokenomics
IDMReborn.totalSupply       1.000.000.000   ✓
Kolam SwapClaim               150.000.000   ✓ utuh, belum tersentuh
Kolam MissionRewards          100.000.000   ✓ (kontrak baru, 7 Sep)
rateIdmxPerIdm                         50   ✓
maxIdmxPerVoucher                   2.000
weeklyCap / globalThreshold  2.000 / 100.000
lifetimeCap                       200.000
SwapInitiator.totalBurned               0   (fitur Tukar belum dibuka)
```

**Kesetaraan bytecode ↔ kode sumber dibuktikan langsung** untuk keenamnya
(kompilasi ulang + `eth_getCode`, slot `immutable` di-mask).
`domainSeparator` dihitung ulang dan cocok untuk chainId 5611 dan 97 — replay
lintas-chain tertutup secara matematis, bukan secara janji.

> **Catatan untuk penulis whitepaper:** seluruh angka di atas **testnet**.
> Whitepaper harus menyatakan itu dengan jelas. "Kontrak sudah live" tanpa kata
> "testnet" adalah kalimat yang akan dianggap menyesatkan begitu ada yang
> membuka explorer.

---

## 5. Mekanisme AIDM yang layak masuk whitepaper

Tiga di antaranya orisinal dan bisa dipertahankan secara teknis.

### 5.1 Proof-of-Record — segel laporan on-chain ✅

Laporan keuangan disusun jadi **canonical JSON** (kunci terurut, integer
rupiah, zona waktu WIB), di-hash SHA-256, lalu hash-nya saja yang ditulis ke
`ReportAttestation` di opBNB.

**Yang membuatnya benar secara privasi:** data keuangan tetap di database dan
tidak pernah menyentuh rantai. Yang publik hanya sidik jari — cukup untuk
membuktikan laporan itu ada dan tidak diubah pada tanggal tersebut, tidak
cukup untuk mengetahui isinya.

**Yang membuatnya bermakna:** permanensinya. Sesuatu yang bisa dihapus
belakangan tidak akan pernah bisa membuktikan apa pun. Ini juga alasan kenapa
alur hapus akun di AIDM mengakui secara terbuka bahwa hash tetap tinggal —
disampaikan sebagai fitur, bukan sebagai permintaan maaf.

**Nilai lanjutannya B2B**, dan whitepaper boleh menyatakannya: basis data
rekam usaha terverifikasi untuk koperasi/BPR/fintech. **Yang TIDAK boleh
dinyatakan** ada di §8.

### 5.2 Reward aktivitas riil — Proof-of-Activity ✅

Sembilan misi, seluruhnya diturunkan dari data sumber (bukan flag yang bisa
diset sembarangan):

| Misi | Reward | Periode | Ember cap |
|---|---:|---|---|
| Catat transaksi pertama hari ini | 20 | harian | 0 |
| Catat 5 transaksi dalam sehari | 50 | harian | 0 |
| Catat pemasukan **dan** pengeluaran | 20 | harian | 0 |
| Catat pakai suara | 15 | harian | 0 |
| Catat 7 hari beruntun | 100 | mingguan | 0 |
| Buka Laporan minggu ini | 30 | mingguan | 0 |
| Catat 30 hari beruntun | 300 | bulanan | 1 |
| Segel laporan bulanan | 150 | bulanan | 1 |
| Lengkapi profil usaha | 50 | sekali | 1 |

**Maksimum teoretis satu pengguna paling rajin: 50.535 IDMX/tahun**
(105/hari × 365 + 130/minggu × 52 + 450/bulan × 12 + 50)
≈ **1.011 IDM/tahun** pada kurs 50:1.

Angka itu **maksimum**, bukan ekspektasi — mengasumsikan pengguna
menyelesaikan setiap misi setiap hari selama setahun penuh tanpa satu hari
terlewat.

**Ketahanan kolam (aritmetika terbuka, silakan diperiksa):**

| Kolam | Perhitungan | Bertahan |
|---|---|---|
| MissionRewards 100 jt IDMX | 100.000.000 ÷ 50.535 | ≈ **1.979 user-tahun** |
| → beta 100 pengguna | | ≈ **20 tahun** |
| Kolam swap 150 jt IDM | 150.000.000 ÷ 1.011 | ≈ **148.400 user-tahun** |
| → 20.000 pengguna aktif | | ≈ **7,4 tahun** |

Keduanya adalah **batas bawah** karena memakai asumsi pengguna maksimal rajin.

Empat misi dipilih bukan sekadar menambah hadiah, melainkan karena membayar
perilaku yang memang diinginkan produk — dan ini layak dijelaskan: "catat
kedua sisi" ada karena laporan hanya berguna bila pemasukan dan pengeluaran
tercatat; "buka laporan" membayar kebiasaan **membaca**, bukan sekadar
menimbun data.

### 5.3 Gasless dengan batas yang jujur ✅

"Punya akun = punya wallet" — embedded wallet Privy dibuat otomatis saat
daftar, tanpa seed phrase. Gas opBNB disponsori aplikasi; gas klaim di BSC
dibayar pengguna, karena di titik itu ia sudah memegang sesuatu yang bernilai.

Invarian ini ditegakkan **di server**, pada jalur yang harus dilewati setiap
sesi — bukan di komponen tampilan. Pelajaran yang mahal dan layak diceritakan
kalau whitepaper punya bab rekayasa: invarian produk yang menumpang di
komponen UI akan runtuh diam-diam saat komponennya diganti.

---

## 6. Bukti traksi — angka produksi hari ini ✅

Dibaca dari database produksi, 9 September 2026.

| Metrik | Nilai |
|---|---:|
| Pengguna terdaftar | **18** |
| Pengguna dengan wallet | **18 (100%)** |
| Pengguna yang pernah mencatat | 10 |
| Transaksi tercatat | **134** |
| Hari dengan aktivitas tercatat | 32 |
| Klaim misi terkonfirmasi on-chain | **16** |
| IDMX terbayar ke pengguna | **725** |
| Laporan tersegel on-chain | **3** |
| Swap dilakukan | 0 (fitur belum dibuka) |
| Live sejak | 8 Agustus 2026 |

**Ini angka kecil, dan whitepaper harus menyatakannya kecil.** Produk berada
di beta tertutup dengan pengguna uji nyata, bukan skala. Yang membuatnya tetap
berharga untuk dikutip: **setiap klaim misi adalah transaksi on-chain
sungguhan** yang bisa diperiksa di opBNBScan, dan setiap segel adalah hash
yang benar-benar tertulis. Sedikit tapi nyata mengalahkan besar tapi
diproyeksikan — dan pembaca whitepaper tahu bedanya.

Bingkai yang jujur dan tetap kuat: *"Sistemnya sudah berjalan ujung ke ujung
di lingkungan produksi — pencatatan, laporan, segel on-chain, dan pembayaran
reward — dengan pengguna nyata. Yang belum adalah skalanya."*

---

## 7. Keamanan & tata kelola

### 7.1 Pra-audit internal ✅

`docs/audit/LAPORAN-PRA-AUDIT.md` — delapan temuan, seluruhnya dari pemetaan
hak istimewa, **nol dari Slither**. Kodenya rapi; risikonya operasional.

| ID | Severity | Ringkas | Status |
|---|---|---|---|
| F-01 | Critical | `owner` SwapClaim bisa menguras kolam lewat `sweep` | Terbuka |
| F-02 | High | Kebocoran `swapSigner` | Terbuka |
| F-03 | High | Kebocoran `voucherSigner` tanpa cap agregat | **Dimitigasi sebagian** (plafon global) |
| F-04 | High | `owner` MissionRewards bisa menarik seluruh float | Terbuka |
| F-05 | Medium | Cap "bulanan" diakumulasi per hari | ✅ **Diperbaiki** |
| F-06 | Medium | Burn IDMX tanpa jalur pemulihan on-chain | Terbuka |
| F-07 | Info | SwapClaim tanpa circuit breaker | Terbuka |
| F-08 | High | Enam dari tujuh peran istimewa dipegang **satu alamat** | Terbuka |

**F-08 adalah temuan yang paling menentukan bagi whitepaper**, dan ia dinilai
**Critical bila konfigurasi ini terbawa ke mainnet.** Satu alamat memegang
`owner` empat kontrak, `voucherSigner`, dan kunci panas server. Whitepaper
tidak boleh mengklaim desentralisasi atau keamanan tata kelola sebelum ini
diselesaikan.

### 7.2 Yang wajib selesai sebelum mainnet 🔒

- Pisahkan kunci: `owner` → multisig bertimelock; `voucherSigner`,
  `swapSigner`, `relayer` masing-masing terpisah tanpa kewenangan owner
- **`setDailyGlobalCap` wajib masuk rencana multisig sejak dirancang** —
  plafon yang bisa ditinggikan sendiri oleh satu kunci panas tidak membatasi
  apa pun terhadap kunci itu
- Hitung `globalThreshold` dan `lifetimeCap` mainnet lewat runbook ratchet
- **Audit pihak ketiga.** Pra-audit internal bukan penggantinya, dan
  whitepaper tidak boleh menyiratkan sebaliknya

### 7.3 Kepatuhan yang sudah dikerjakan ✅

Layak disebut karena jarang ada di whitepaper proyek kripto Indonesia:

- **UU PDP** — hak penghapusan diimplementasikan penuh: data lokal, identitas
  wallet, dan dompet embedded benar-benar dihapus. Yang tidak bisa dihapus
  (hash on-chain, catatan pembayaran untuk kewajiban pembukuan UU KUP)
  **dinyatakan terbuka kepada pengguna**, bukan disembunyikan
- **Halaman hukum publik** — Syarat & Ketentuan, Kebijakan Privasi,
  Pengembalian Dana, dapat dibuka tanpa akun
- **Purge otomatis** masukan mentah setelah 90 hari
- Catatan pembayaran disimpan **ter-anonimkan** setelah akun dihapus

---

## 8. ⛔ Yang TIDAK boleh diklaim di whitepaper

Daftar ini sama pentingnya dengan bahan di atas. Setiap butir punya alasan
yang sudah diputuskan, bukan kehati-hatian umum.

| Jangan tulis | Kenapa |
|---|---|
| **"Laporan siap diajukan ke bank"** atau klaim kelayakan kredit apa pun | Dicabut PO 15 Agustus 2026. Penerimaan berkas adalah wewenang penilai kredit, bukan sesuatu yang bisa dijanjikan pembuat alat. Belum ada satu pun petugas bank yang menyatakan menerimanya. |
| **Nilai rupiah dari reward** | IDM Reborn belum diperdagangkan; harganya belum terbentuk. UI aplikasi pun hanya menampilkan jumlah token. |
| **"Kontrak sudah live"** tanpa kata testnet | Keenam kontrak di testnet. Explorer akan membantahnya di hari pertama. |
| **"Sudah diaudit"** | Yang ada pra-audit **internal**, dan fase 2–4-nya belum dijalankan — jumlah temuan akan bertambah. |
| **Klaim desentralisasi / tata kelola aman** | F-08 terbuka: enam peran istimewa di satu alamat. |
| **Pasokan IDMX 10 triliun** | Angka usang. Yang benar 50 miliar (§2.3). |
| **Plafon global sebagai anti-Sybil** | Ia pembatas radius ledakan, bukan pertahanan Sybil. Menyebutnya begitu menciptakan rasa aman yang salah. |
| **Proyeksi pengguna sebagai capaian** | 18 pengguna nyata. Proyeksi boleh, asal jelas ditandai proyeksi. |
| **Vesting/buyback sebagai cara menjaga atau menaikkan HARGA** | Aturan bahasa mengikat (§0.1). Rumusan yang dipakai: **ketertiban distribusi** dan **kedalaman pasar**. Kalimat yang menyebut harga menempatkan penerbit sebagai pengelola harga — posisi yang tidak bisa dipertahankan di hadapan regulator mana pun. |
| **Mekanisme kolam keterlambatan** | Belum ditentukan. Sebut keberadaannya, jangan jelaskan cara kerjanya. |

---

## 9. Kerangka bab yang disarankan

| Bab | Isi | Sumber di dokumen ini |
|---|---|---|
| 1. Ringkasan Eksekutif | Masalah, solusi, status jujur | §1, §6 |
| 2. Masalah | Pelaku mikro Indonesia tanpa rekam usaha terverifikasi | `PRD-AIDM.md` §2 |
| 3. Ekosistem IDM Reborn | Empat proyek + status masing-masing | §1 + §10 |
| 4. AIDM — produk yang sudah berjalan | Produk, mekanisme, traksi | §5, §6 |
| 5. Arsitektur Teknis | Dua token, dua chain, jembatan burn→claim | §3, §4 |
| 6. Tokenomics | Alokasi, vesting, treasury | §2 |
| 7. Keamanan & Tata Kelola | Pra-audit, rencana multisig, roadmap audit | §7 |
| 8. Kepatuhan | PDP, pemisahan ekonomi token vs pembayaran | §7.3, §3.1 |
| 9. Roadmap | Mainnet, tiga proyek lain | ❌ butuh isian Anda |
| 10. Tim & Legal | PT IDM FILM SEJAHTERA | ❌ butuh isian Anda |
| 11. Disclaimer & Risiko | Wajib | §8 |

---

## 10. Lubang yang harus Anda isi

Saya tidak mengarang bagian ini. Jawaban Anda menjadi bahan bab 3, 9, dan 10.

### SkemGuard
1. Apa produknya, satu kalimat — masalah apa yang dipecahkan?
2. Siapa penggunanya?
3. Adakah komponen on-chain? Kalau ya: kontrak apa, di jaringan mana?
4. Bagaimana IDM Reborn dipakai di dalamnya — utilitas, akses, atau reward?
5. Statusnya: ide, spesifikasi, prototipe, atau sudah berjalan?
6. Ada repositori/dokumen yang bisa saya baca?

### Film
7. Model bisnisnya: produksi, distribusi, atau pendanaan?
8. Apakah IDM Reborn dipakai untuk pendanaan/bagi hasil? Kalau ya, **ini
   menyentuh regulasi sekuritas** dan harus dirumuskan sangat hati-hati.
9. Hubungannya dengan PT IDM FILM SEJAHTERA sebagai badan hukum penerbit?
10. Ada karya yang sudah jadi atau sedang berjalan?

### IDM Chain (L2 BNB)
11. L2 jenis apa — optimistic rollup, zk, atau sidechain? *(Ini pertanyaan
    teknis paling menentukan; jawaban "belum ditentukan" jauh lebih baik
    daripada istilah yang dipilih karena terdengar bagus.)*
12. Kenapa butuh chain sendiri, sementara AIDM sudah jalan di opBNB? Whitepaper
    harus menjawab ini secara meyakinkan atau L2-nya akan terbaca sebagai
    penambahan demi terdengar ambisius.
13. IDM sebagai gas token L2?
14. Timeline realistis, dan siapa yang mengerjakan?
15. Sudah ada riset teknis, atau masih gagasan?

### Umum
16. Tim inti — nama, peran, latar belakang, publik atau anonim?
17. Target TGE dan bursa yang dituju?
18. Anggaran audit pihak ketiga — sudah dialokasikan? Auditor mana?
19. Bahasa whitepaper: Indonesia, Inggris, atau keduanya?
20. Pembaca utamanya siapa — investor ritel, VC, bursa, atau regulator? **Ini
    menentukan seluruh nada dokumen**, dan keempatnya menuntut penekanan yang
    berbeda.

---

## 11. Rujukan berkas

| Berkas | Isi |
|---|---|
| `docs/PERINTAH-AGEN-FINAL.md` §0.1 | **Tokenomics kanonik** — sumber kebenaran tunggal |
| `contracts/ALAMAT-DAN-CATATAN.md` | Alamat, argumen konstruktor, peran kunci, aturan operasional |
| `docs/audit/LAPORAN-PRA-AUDIT.md` | Model ancaman, temuan F-01…F-08 |
| `PRD-AIDM.md` | Produk, arsitektur, model data |
| `PROGRESS.md` | Riwayat pengerjaan & status milestone |
| `contracts/*.sol` | Kode sumber keenam kontrak |

**Peringatan pemeliharaan:** angka tokenomics **hanya** boleh dikutip dari
`PERINTAH-AGEN-FINAL.md` §0.1. Menyalinnya ke whitepaper menciptakan salinan
kelima yang bisa menyimpang — kalau whitepaper harus memuatnya (dan memang
harus), catat tanggal snapshot-nya dan periksa ulang sebelum publikasi.
