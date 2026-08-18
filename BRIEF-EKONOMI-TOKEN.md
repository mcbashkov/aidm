# Briefing: Ekonomi Token AIDM — untuk diskusi

> **Cara pakai berkas ini.** Tempelkan seluruh isinya ke percakapan Claude baru,
> lalu ajukan pertanyaan Anda. Berkas ini sengaja berdiri sendiri: semua konteks,
> angka, dan alasan di baliknya ada di sini, sehingga tidak perlu akses ke kode.
>
> Disusun 2026-08-15 oleh Claude Code (agen yang membangun AIDM) bersama
> MC Basyar (Product Owner). Angka-angka di sini sudah dihitung dari kode yang
> benar-benar berjalan, bukan perkiraan.

---

## 1. Produk ini apa

**AIDM** — aplikasi web (PWA) pencatatan keuangan untuk **pelaku usaha mikro
Indonesia**: pedagang warung, pengemudi ojol, freelancer, penjual online.

Cara kerjanya: pengguna **berbicara atau mengetik kalimat biasa** — *"jual 3 nasi
goreng 45rb bayar QRIS"*, *"narik hari ini dapet 180rb, bensin 25rb"* — lalu AI
mengubahnya jadi catatan transaksi terstruktur. Dari catatan itu aplikasi
menyusun laporan keuangan yang rapi dan bisa diunduh sebagai PDF.

Ini **project crypto secara terbuka** di jaringan **opBNB** (Layer-2 milik BNB
Chain). Prinsipnya "proud but calm": identitas crypto tampil di lapisan wallet,
reward, dan bukti on-chain — sementara alur mencatat harian tetap bersih tanpa
jargon kripto.

**Sudah berjalan di produksi** (`ai.idmtoken.com`): pencatatan, laporan, ekspor
PDF, dan penyegelan laporan ke blockchain sudah dipakai pada akun nyata.

**Target 6 bulan pasca-launch:** 50.000 pengguna terdaftar, 20.000 transaksi
tercatat per hari, dan **ranking di DappBay** (etalase dapp BNB Chain) lewat UAW
riil — *Unique Active Wallets*, metrik utama peringkat di sana.

### Siapa penggunanya (penting untuk menilai keputusan apa pun)

Persona utamanya **bukan crypto-native**. "Bu Sari" pemilik warung 34 tahun dan
"Pak Budi" pengemudi ojol 41 tahun tidak pernah memakai exchange, tidak punya
seed phrase, dan tidak tahu apa itu gas fee. Wallet mereka dibuat otomatis saat
daftar (lewat Privy) tanpa mereka sadari.

Setiap keputusan yang menuntut mereka melakukan langkah crypto-native akan
menghantam kelompok ini paling keras.

---

## 2. Struktur tiga token

| Token | Jaringan | Pasokan | Peran |
|---|---|---|---|
| IDM lama (native) | — | — | warisan, **tidak disentuh sama sekali** |
| **IDM Reborn** | **BSC** | **1 miliar** | token utama ekosistem, dipasangkan dengan BNB |
| **IDMX** | **opBNB** | rencana 10 triliun | poin reward in-app, ditukar ke IDM Reborn |

Ada juga **Kredit AI** — dibeli dengan uang biasa (QRIS/VA), **tidak pernah**
dengan token. Pemisahan ini disengaja demi kepatuhan app store dan agar ekonomi
token tidak bercampur dengan ekonomi pembayaran.

**Catatan penting:** IDM Reborn **belum diperdagangkan**, jadi **harganya belum
terbentuk**. Konsekuensinya, nilai rupiah dari reward belum bisa dijanjikan ke
pengguna — UI hanya boleh menampilkan jumlah token, bukan taksiran rupiah.

**IDMX belum di-deploy**, jadi pasokannya masih bisa diubah.

---

## 3. Yang SUDAH disepakati (jangan dibongkar ulang tanpa alasan kuat)

| # | Keputusan | Tanggal |
|---|---|---|
| 1 | Provider wallet: **Privy** (embedded wallet otomatis, tanpa seed phrase) | selesai |
| 2 | Jaringan aplikasi: **opBNB** (mainnet 204 / testnet 5611) | selesai |
| 3 | Payment gateway: **Midtrans** | 2026-08-08 |
| 4 | Domain: `ai.idmtoken.com` | 2026-08-14 |
| 5 | **IDMX yang masuk pool ditukar → DIBAKAR** (burn), bukan didaur ulang | 2026-08-14 |
| 6 | Angka reward misi dipakai apa adanya (rincian di bawah) | 2026-08-14 |
| 7 | **Jembatan lintas-jaringan: burn-on-opBNB → claim-on-BSC** lewat oracle/relayer internal | 2026-08-15 |
| 8 | Ada **cap tukar mingguan per dompet** untuk mencegah sybil/bot | 2026-08-15 (angkanya belum) |
| 9 | **Janji "laporan siap diajukan ke bank" DIBATALKAN** | 2026-08-15 |

### Penjelasan #9 (agar tidak salah paham)

Sebelumnya produk menjanjikan laporannya "rapi, siap diajukan ke bank". Janji itu
**dicabut** karena tidak pernah diverifikasi — belum ada satu pun petugas bank
yang menyatakan menerimanya. Fitur PDF-nya tetap ada dan tetap lengkap; yang
dihapus adalah klaimnya. Alasannya sederhana: penerimaan berkas adalah wewenang
penilai kredit, bukan sesuatu yang bisa dijanjikan pembuat alat.

### Misi yang membangkitkan IDMX (sudah berjalan di kode)

| Misi | Hadiah | Frekuensi |
|---|---|---|
| Catat transaksi pertama hari ini | 20 IDMX | harian |
| Catat 5 transaksi dalam sehari | 50 IDMX | harian |
| Catat 7 hari beruntun | 100 IDMX | mingguan |
| Segel laporan bulanan ke blockchain | 150 IDMX | bulanan |
| Lengkapi profil usaha | 50 IDMX | sekali |

Batas: **250 IDMX per pengguna per hari** (misi bulanan punya jatah terpisah).

**Pengaman anti-kecurangan yang sudah berjalan:** hanya transaksi valid unik yang
dihitung (nominal > 0, bukan duplikat persis dalam 60 detik); menghapus transaksi
**otomatis menurunkan progres misi**; batas 200 entri/hari/akun.

---

## 4. Yang BELUM disepakati — inti diskusi

### Pertanyaan A — Alokasi 1 miliar IDM Reborn

Belum ada dokumen tokenomics. Usulan dari Claude Code (**belum disetujui**):

| Alokasi | % | Token | Vesting |
|---|---|---|---|
| Ekosistem & Reward *(termasuk kolam tukar IDMX)* | 25% | 250.000.000 | emisi bertahap 48 bln |
| Tim & Founder | 15% | 150.000.000 | cliff 12 bln + linear 36 bln |
| Treasury / Operasional | 15% | 150.000.000 | cliff 6 bln + linear 36 bln |
| Presale (private + public) | 15% | 150.000.000 | private: cliff 6 + linear 18 bln · public: 25% saat TGE + linear 6 bln |
| Likuiditas DEX | 10% | 100.000.000 | LP dikunci 24 bln |
| Cadangan CEX + market making | 8% | 80.000.000 | dibuka saat listing, multisig |
| Marketing & Partnership | 7% | 70.000.000 | linear 24 bln |
| Advisor | 3% | 30.000.000 | cliff 12 bln + linear 24 bln |
| Airdrop komunitas awal | 2% | 20.000.000 | 100% saat TGE |

**Float saat TGE ≈ 15%** (150 juta token beredar).

Alasan angka-angka itu dipilih:
- **Tim 15% + cliff 12 bulan** — di atas 20% jadi bendera merah saat uji tuntas exchange; tanpa cliff, tim bisa menjual di hari pertama.
- **Float 15%** — Binance belakangan terbuka mengkritik pola *low-float/high-FDV*. Float 5% menaikkan harga awal tapi memperkecil peluang listing.
- **LP dikunci 24 bulan** — likuiditas tak terkunci adalah ciri paling umum rug pull.
- **Cadangan CEX terpisah 8%** — market maker akan minta inventori; kalau tidak dialokasikan sejak awal, terpaksa mengambil dari pos lain yang sudah dijanjikan.

**Peringatan yang sudah disampaikan ke PO:** jangan merancang tokenomics
"supaya masuk Binance" — listing spot Binance sangat sulit dan tidak bisa
direncanakan. Yang realistis adalah merancang agar **tidak diskualifikasi**, lalu
masuk lewat jalur ekosistem BNB Chain (Binance Alpha, Binance Wallet campaign,
DappBay) yang lebih terbuka. Juga: **presale punya konsekuensi hukum di
Indonesia** (Bappebti/OJK) dan perlu review legal — di luar kompetensi agen.

**Yang ingin didiskusikan:** apakah proporsi ini masuk akal untuk proyek utilitas
di ekosistem BNB Chain? Ada pos yang kurang atau kebesaran?

---

### Pertanyaan B — Kurs IDMX → IDM Reborn

**Rumus yang dipakai:**

```text
kurs (IDMX per IDM) = IDMX_terbit_selama_periode ÷ IDM_kolam_tukar
IDMX_terbit         = user_aktif × reward_per_user_per_tahun × tahun
IDMX_bisa_ditukar   = IDM_kolam_tukar × kurs        ← BATAS KERAS
```

Baris ketiga yang menentukan: **kolam IDM-lah yang membatasi, bukan pasokan IDMX.**

Dengan asumsi kolam tukar = **150 juta IDM** (15% dari total), 5 tahun, rata-rata
20.000 pengguna aktif, dan reward **50.535 IDMX/pengguna/tahun** (versi misi yang
diusulkan, lihat Pertanyaan D):

| Kurs | IDMX bisa ditukar | Kolam bertahan | Pengguna rajin dapat |
|---|---|---|---|
| 25 : 1 | 3,75 miliar | 3,7 tahun | 2.021 IDM/tahun |
| 34 : 1 *(titik impas)* | 5,10 miliar | 5,0 tahun | 1.486 IDM/tahun |
| **50 : 1** *(usulan)* | **7,50 miliar** | **7,4 tahun** | **1.011 IDM/tahun** |
| 100 : 1 | 15,0 miliar | 14,8 tahun | 505 IDM/tahun |

**Usulan Claude Code: 50 : 1**, dengan alasan **mulai konservatif**. Menaikkan
kemurahan hati selalu bisa dilakukan; menurunkannya menghancurkan kepercayaan
secara permanen. Peninjauan ulang tiap kuartal sudah disepakati sebagai mekanisme.

**Yang ingin didiskusikan:** apakah 50:1 wajar? Adakah cara lain menetapkan kurs
selain membagi kolam dengan proyeksi emisi — misalnya kurs mengambang mengikuti
harga pasar, atau kurs berjenjang?

---

### Pertanyaan C — Pasokan IDMX: 10 triliun tidak koheren

Temuan yang memicu pertanyaan ini:

Pada kurs 50:1 dengan kolam 150 juta IDM, IDMX yang **pernah bisa ditukar** hanya
**7,5 miliar — 0,075% dari 10 triliun**. Sisanya **99,92% tidak akan pernah
beredar**. Untuk menukar seluruh 10 triliun dibutuhkan **200 miliar IDM**,
padahal totalnya cuma 1 miliar — timpang **200 kali lipat**.

Jadi angka 10 triliun bersifat **kosmetik**. Tidak salah secara teknis (berfungsi
sebagai plafon maksimum), tapi menyesatkan siapa pun yang membacanya sebagai
rencana distribusi.

| Pasokan IDMX | Porsi yang benar-benar bisa beredar (kurs 50:1) |
|---|---|
| 10 triliun *(rencana lama)* | 0,08% |
| 100 miliar | 7,5% |
| **10 miliar** *(usulan)* | **75%** |

Menurunkan pasokan **tidak mengubah nominal reward harian sama sekali** (tetap
105 IDMX/hari) — yang berubah hanya plafon di atas kertas. Dan karena IDMX belum
di-deploy, ini masih gratis untuk diubah.

**Yang ingin didiskusikan:** apakah pasokan besar punya nilai psikologis yang
sepadan dengan ketidakkoherenannya? Berapa pasokan yang wajar untuk token poin?

---

### Pertanyaan D — Misi terasa tipis

**Masalah:** di hari biasa hanya **2 misi** yang bisa diklaim. Setelah keduanya
selesai, tab Misi jadi layar mati sampai besok.

Usulan tambahan (**belum dieksekusi**) — dipilih karena membayar perilaku yang
memang diinginkan produk, bukan sekadar menambah hadiah:

| Misi baru | Hadiah | Alasan |
|---|---|---|
| Catat pemasukan **dan** pengeluaran hari ini | 20/hari | laporan hanya berguna kalau dua sisi tercatat |
| Catat pakai suara hari ini | 15/hari | suara adalah pembeda utama, tapi tak ada yang mendorong mencobanya |
| Buka Laporan mingguan | 30/minggu | kebiasaan **membaca** laporan, bukan sekadar menimbun data |
| Runtun 30 hari | 300/bulan | runtun 7 hari terlalu cepat selesai, tak ada tangga berikutnya |

Dampak: 4 misi/hari (dari 2) · **70 → 105 IDMX/hari** · **32.600 → 50.535
IDMX/tahun**. Batas harian 250 tidak perlu diubah (masih ada ruang 2,4×).

---

### Pertanyaan E — Siapa membayar gas? *(paling menentukan)*

Ini perdebatan yang belum selesai antara PO dan agen.

**Posisi PO:** setiap pengguna harus punya BNB sendiri untuk gas — baik saat
mengklaim IDMX maupun saat menukar ke IDM. Alasannya: *"itu bagus dan baik untuk
ekosistem."*

**Keberatan agen** — ada nuansa teknis yang membedakan dua hal yang sering
dianggap satu:

Untuk ranking DappBay, yang dihitung adalah **siapa yang MENGIRIM transaksi**,
bukan siapa yang membayar gasnya. Keduanya bisa dipisah:

| Skema | Pengirim tx | Bayar gas | UAW DappBay | Tembok onboarding |
|---|---|---|---|---|
| Yang terpasang sekarang | relayer treasury | proyek | **1** ❌ | tidak ada |
| Usulan PO | pengguna | pengguna | ✅ nyata | **sangat tinggi** ❌ |
| Jalan tengah (usulan agen) | **pengguna** | **proyek (isi wallet-nya)** | ✅ nyata | tidak ada |

Kekhawatiran agen atas posisi PO: Bu Sari dan Pak Budi **tidak akan pernah punya
BNB**. Untuk mendapatkannya mereka harus daftar exchange, beli BNB, lalu menarik
ke opBNB — persis alur crypto-native yang produk ini hindari sejak awal.
Akibatnya bukan ekosistem yang lebih sehat, melainkan **tidak ada yang
mengklaim**: misi jadi hiasan, IDMX tidak beredar, UAW tetap nol.

Jalan tengahnya: wallet **pengguna** yang mengirim transaksi (jadi UAW-nya sah),
tapi proyek mengisi wallet mereka dengan BNB receh. Biaya di opBNB sangat murah —
sekitar **$240/bulan untuk 20.000 pengguna**.

**Catatan penting:** kontrak yang sudah dibangun mendukung KEDUA skema tanpa
perlu diubah — fungsi klaimnya sengaja bisa dipanggil siapa pun, karena
keamanannya bersandar pada tanda tangan voucher, bukan pada identitas pengirim.

**Yang ingin didiskusikan:** apakah keberatan agen berlebihan? Adakah cara
menjaga semangat "user punya andil" tanpa membangun tembok onboarding? Misalnya:
gas disponsori untuk N klaim pertama lalu pengguna menanggung sendiri?

---

### Pertanyaan F — Angka cap tukar mingguan

Pengguna rajin menghasilkan **735 IDMX/minggu** (105/hari).

| Cap mingguan | Setara (kurs 50:1) | Kelonggaran |
|---|---|---|
| 1.000 IDMX | 20 IDM | 1,4× hasil mingguan |
| **2.000 IDMX** *(usulan)* | **40 IDM** | 2,7× hasil mingguan |
| 5.000 IDMX | 100 IDM | 6,8× hasil mingguan |

Plus usulan **minimum tukar 100 IDMX** agar tidak ada transaksi receh yang biaya
gasnya lebih mahal daripada isinya.

Catatan: sisi *perolehan* sudah dibatasi (maksimum 250 IDMX/hari/akun), jadi cap
tukar ini adalah lapis kedua, bukan satu-satunya pertahanan.

---

## 5. Ringkasan pertanyaan

1. **Alokasi 1 miliar IDM Reborn** — apakah proporsi usulan masuk akal?
2. **Kurs IDMX → IDM** — 50:1 wajar? Ada pendekatan lain selain kolam ÷ emisi?
3. **Pasokan IDMX** — pertahankan 10 triliun atau turunkan ke 10 miliar?
4. **Misi tambahan** — 4 misi usulan sudah tepat, atau ada yang lebih baik?
5. **Gas** — pengguna bayar sendiri, disponsori penuh, atau berjenjang?
6. **Cap tukar mingguan** — 2.000 IDMX?

---

## 6. Batasan yang tidak bisa ditawar

Apa pun hasil diskusinya, tiga hal berikut sudah mengikat:

- **Data keuangan pengguna tidak pernah ditulis ke blockchain** — hanya sidik
  jari kriptografis (hash) laporannya. Ini soal privasi (UU PDP) dan bersifat
  permanen karena blockchain tidak bisa dihapus.
- **Mencatat selalu gratis** — nol Kredit AI, selamanya. Ini jantung produk;
  fitur apa pun yang menambah friksi mencatat ditolak.
- **Dilarang menjanjikan yang tidak bisa ditepati** — tidak boleh ada klaim
  "pasti disetujui bank", "terverifikasi blockchain" atas kebenaran angka, atau
  taksiran nilai rupiah reward selama harga IDM belum terbentuk.
