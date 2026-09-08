# Insight Whitepaper — Pilar 2, 3, dan 4

**SkemGuard · IDM Film · IDM Chain**

**Disusun:** 9 September 2026
**Sifat:** dokumen pendamping — mengisi §10 dari `INSIGHT-WHITEPAPER-IDM-REBORN.md`
**Sumber:** repositori SkemGuard, dokumen produksi film, situs live idmtoken.com,
dan pembacaan langsung ke API penyedia data

---

## 0. Kenapa dokumen ini ada

Dokumen induk (`INSIGHT-WHITEPAPER-IDM-REBORN.md`) menyatakan sesuatu yang jujur
dan penting:

> | **SkemGuard** | ❌ Nol | Tidak ada satu pun berkas, rujukan, atau baris kode di repositori ini |
> | **Film** | ❌ Nol | Hanya nama badan hukum. Tidak ada dokumen produk |
> | **IDM Chain (L2 BNB)** | ❌ Nol | Tidak ada spesifikasi, kontrak, maupun rujukan teknis |

Itu benar **dari dalam repositori AIDM**. Tapi bahannya ada — hanya di tempat
lain. Dokumen ini mengisi tiga lubang itu dengan bahan yang bisa diperiksa ulang,
memakai tanda yang sama persis supaya keduanya bisa dibaca sebagai satu berkas:

| Tanda | Arti |
|---|---|
| ✅ **TERVERIFIKASI** | Dibaca langsung dari kode, dokumen, rantai, atau API hari ini |
| 🔒 **DIPUTUSKAN** | Sudah dikunci tetapi belum dieksekusi. Tulis sebagai rencana |
| ❌ **BELUM ADA** | Tidak ada buktinya. Tidak saya karang — harus Anda isi |

Satu peringatan yang perlu didahulukan: **§4 memuat tiga hal di situs live yang
sudah tidak cocok dengan kenyataan.** Perbaiki itu sebelum whitepaper terbit,
karena whitepaper yang bertentangan dengan halaman depannya sendiri akan
merusak kredibilitas keduanya sekaligus.

---

## 1. SkemGuard — jawaban Q1–Q6

### 1.1 Produk dan masalah yang dipecahkan ✅

**Satu kalimat:** SkemGuard memindai keamanan token kripto secara real-time —
pengguna menempel *contract address*, dalam hitungan detik mendapat skor 0–100,
kategori risiko, dan penjelasan bahasa awam.

Masalahnya konkret: pembeli ritel tidak punya cara memeriksa apakah sebuah token
bisa dijual kembali, apakah pembuatnya masih bisa mencetak koin baru atau
membekukan dompet, dan apakah likuiditasnya terkunci — sebelum uangnya masuk.
Informasi itu sebenarnya ada di rantai, tapi tersebar dan berbentuk teknis.

**Posisi:** kesederhanaan UX ala RugCheck + kedalaman deteksi dan simulasi jual
ala TokenSniffer, dengan satu pembeda yang tidak dimiliki keduanya: **netralitas
yang dinyatakan dan bisa diperiksa** (lihat §1.6).

### 1.2 Pengguna ✅

- **Primer:** trader dan investor ritel Indonesia, pemula sampai menengah, yang
  sering mengecek token baru sebelum membeli.
- **Sekunder:** komunitas kripto global pada fase go-global.
- Antarmuka bilingual ID/EN, **Indonesia-first** — bahasa Indonesia adalah
  default, bukan terjemahan.

### 1.3 Status — sudah berjalan, dengan data nyata ✅

Ini bukan prototipe. Aplikasinya hidup, memanggil penyedia data sungguhan, dan
mengembalikan hasil pemindaian nyata.

| Hal | Angka | Cara memeriksa |
|---|---|---|
| Milestone selesai | 8 dari 11 | `README.md` |
| Commit | 20 | `git rev-list --count HEAD` |
| Baris kode | ~4.900 (22 komponen + 23 modul) | repo |
| Dependensi produksi | **3** (next, react, react-dom) | `package.json` |
| Chain didukung | **6** — Solana, Ethereum, BSC, Robinhood, Polygon, Base | `lib/pipeline/detectChain.ts` |
| Latency p50 | **495 ms** | uji 14 token nyata lintas 5 chain |
| Latency p95 | **825 ms** | target internal p95 < 5 detik |
| Rate limit | 15 permintaan/menit/IP | `lib/rateLimit.ts` |

Contoh hasil nyata yang bisa diulang siapa pun:

```
BONK  @ Solana    AMAN 90    keyakinan tinggi   likuiditas US$553.925
SHIB  @ Ethereum  AMAN 80    LP tidak terkunci
USDC  @ Base      AMAN 82    chain terdeteksi otomatis
```

**Yang belum:** kalibrasi bobot skor (M8), ringkasan AI (M6), dan kemasan PWA
(M10). Ketiganya dinyatakan terbuka di repo, bukan disembunyikan.

### 1.4 Komponen on-chain: **tidak ada** ✅ — dan itu memang desainnya

Jawaban jujur untuk Q3: **SkemGuard tidak punya satu pun kontrak pintar.**

Itu bukan kekurangan yang harus ditutupi. SkemGuard adalah pembaca rantai, bukan
penulis: ia memanggil RPC dan API keamanan, lalu menilai. Menambahkan kontrak
hanya supaya terdengar "on-chain" akan menambah permukaan serangan tanpa
menambah kegunaan.

Untuk whitepaper, ini justru bahan yang baik: **tidak setiap bagian ekosistem
harus punya kontrak.** Yang harus punya kontrak adalah yang memindahkan nilai.

### 1.5 ⚠️ Utilitas token IDM di SkemGuard: **nol** — dan ini tegangan desain, bukan kelalaian

Ini temuan paling menentukan untuk whitepaper, dan perlu dibaca pelan-pelan.

**Faktanya ✅:** seluruh kode SkemGuard diperiksa — tidak ada wallet connect,
tidak ada token gating, tidak ada reward, tidak ada pembayaran. Nol sentuhan
dengan IDM Reborn selain logo.

**Kenapa ini tidak bisa diselesaikan dengan sekadar "tambahkan utilitas":**
halaman metodologi SkemGuard yang sudah tayang menyatakan, dalam bahasa yang
bisa dibaca siapa pun:

> "Tidak ada pengecualian untuk token mana pun, termasuk token ekosistem IDM
> sendiri. Tidak ada daftar putih, tidak ada penyesuaian skor karena kedekatan,
> dan **tidak ada slot berbayar untuk memperbaiki hasil**."

Jadi utilitas token yang paling lazim — bayar untuk memindai, staking untuk hasil
lebih baik, whitelist — **secara struktural bertabrakan dengan pembeda produknya
sendiri.** Sebuah pemindai keamanan yang hasilnya bisa dipengaruhi uang tidak
punya alasan untuk dipercaya, dan kepercayaan adalah satu-satunya barang yang
dijual SkemGuard.

**Tiga jalan yang tidak merusak netralitas** — pilih sadar, jangan dibiarkan
mengambang di whitepaper:

1. **Token untuk data turunan, bukan untuk vonis.** Hasil pemindaian tetap gratis
   dan identik untuk semua orang; yang berbayar adalah akses ke *lapisan reputasi
   deployer* (§1.6) — API, ekspor laporan, riwayat. Ini menjual pekerjaan
   akumulasi, bukan menjual pengaruh atas hasil.
2. **Token untuk kuota, bukan untuk kualitas.** Batas laju lebih tinggi bagi
   pemegang. Tidak mengubah satu pun angka yang dilihat pengguna. Aman secara
   prinsip, tapi nilainya kecil.
3. **Tanpa token sama sekali.** SkemGuard diposisikan sebagai aset kepercayaan
   dan pintu masuk pengguna ke ekosistem, bukan sebagai mesin permintaan token.
   Paling jujur, dan **paling sulit ditulis** di whitepaper yang menjual token.

Saya menyarankan **(1)**, dengan (3) sebagai posisi awal sampai lapisan
reputasinya matang. Yang tidak boleh: menulis "IDM dipakai di SkemGuard" tanpa
menyebut bentuknya — itu klaim yang akan langsung runtuh saat diperiksa.

### 1.6 Aset strategis: lapisan reputasi deployer 🔒

Ini bagian yang paling layak masuk whitepaper dari seluruh SkemGuard, dan
spesifikasinya sudah ada (`docs/SkemGuard-Addendum-Reputasi-Deployer.md`).

Skor token menjawab "token ini aman?". Lapisan reputasi menjawab pertanyaan yang
lebih menentukan: **"siapa yang membuatnya, dan apa rekam jejaknya?"**

Nilai strategisnya dinyatakan dalam satu kalimat yang layak dikutip utuh:

> Ini satu-satunya bagian SkemGuard yang **tidak bisa disalin dengan berlangganan
> API**. Data ini hanya tumbuh dari akumulasi scan sendiri. Makin lama dipakai,
> makin sulit disaingi.

**Status hari ini ✅:** pencatatan sudah dibangun dan diverifikasi ujung-ke-ujung
— alamat pembuat token direkam pada tiap pemindaian, lengkap dengan kolom
`deployer_source` yang mencatat *dari mana* alamat itu didapat, karena di Solana
yang tersedia sering kali bukan pembuat asli.

**Yang belum ❌:** pencatatannya **belum menyala di produksi** karena kredensial
Supabase belum diisi. Ini mendesak dan perlu dinyatakan apa adanya: data rekam
jejak hanya tumbuh dari akumulasi, dan hari yang lewat tanpa pencatatan hilang
permanen.

Tujuh pengaman yang mengikat desainnya juga bahan whitepaper yang kuat, terutama
tiga ini:

- **Nyatakan fakta, jangan vonis orang.** "Dompet ini pernah men-deploy 4 token;
  pada 3 di antaranya likuiditas ditarik dalam 30 hari" — bukan "deployer ini
  penipu". Pengguna yang menyimpulkan.
- **Reputasi tidak pernah menjadi penentu vonis**, maksimal pengubah terbatas.
  Developer baru berhak mulai dengan adil.
- **Tidak pernah mengaitkan alamat ke identitas dunia nyata.** Menilai perilaku
  alamat, bukan orang — sekaligus menjauhkan sistem dari wilayah UU PDP.

Posisi yang disarankan di whitepaper: **sumber intelijen, bukan alat
penindakan.** Penegakan OJK menyasar platform berizin; deployer anonim di DEX ada
di luar perimeter itu.

### 1.7 Yang boleh dan tidak boleh diklaim

**Boleh ✅**
- "Live dan bisa dipakai siapa pun hari ini" — benar
- "Memindai 6 jaringan" — benar per hari ini
- "p50 di bawah 500 ms" — terukur
- "Metodologi skor terbuka untuk publik" — halaman `/metode` sudah tayang

**Tidak boleh ⛔**
- **"Akurat"** atau angka akurasi apa pun. Bobotnya belum dikalibrasi, dan
  aplikasinya sendiri menampilkan peringatan itu di tiap hasil. Menyebut angka
  akurasi sebelum kalibrasi adalah klaim yang tidak bisa dipertahankan.
- **"Mendeteksi semua scam".** Simulasi bersifat point-in-time; kontrak bisa
  di-upgrade setelah dipindai.
- **"Terintegrasi dengan token IDM"** — belum, lihat §1.5.
- **"Diaudit"** — tidak ada audit pihak ketiga.

Satu contoh yang menunjukkan kenapa kalibrasi belum selesai, dan sebaiknya
**dipakai sebagai bukti kejujuran, bukan disembunyikan**: rubrik saat ini menilai
USDT, WBTC, dan CAKE sebagai *Bahaya skor 0* — benar menurut aturannya sendiri
(ketiganya bisa mencetak dan kepemilikannya belum dilepas), tapi jelas belum
layak terbit. Itulah pekerjaan M8.

---

## 2. IDM Film — jawaban Q7–Q10

Dokumen induk mencatat "hanya nama badan hukum". Kenyataannya jauh lebih kuat:
**dua film sudah tayang di bioskop nasional**, dan berkas produksinya lengkap.

### 2.1 Model bisnis ✅

Dua peran berbeda pada dua karya berbeda — dan bedanya penting untuk whitepaper:

| Tahun | Karya | Peran IDM Film | Bukti |
|---|---|---|---|
| 2023 | *Jin Qorin* | **Distributor**, bersama White Collar Pictures | tayang 23 Maret, Cinema XXI |
| 2026 | *Leave No One Behind* | **Rumah produksi (PH)** | tayang 23 Juli, 30 bioskop XXI |

Detail LNOB yang terverifikasi dari berkas pengajuan resmi ✅:
- PH: **PT IDM FILM SEJAHTERA**
- Durasi **74 menit**, tanggal tayang **23 Juli 2026**
- **30 bioskop jaringan XXI**, tersebar di Jakarta, Bogor, Depok, Bandung, Solo,
  Surabaya, Sidoarjo, dan kota lain
- Jalur distribusi tambahan: draft perjanjian dengan **CGV** dan format perjanjian
  bagi hasil dengan **Platinum Cineplex**

Berkas pendukung yang ada dan bisa dirujuk: BAST, daftar bioskop berkop resmi,
data kontrak PH–distributor 2026, brief film, dan trailer.

### 2.2 ⚠️ Pendanaan lewat token — pertanyaan paling berisiko (Q8) ❌

Tidak ada bukti bahwa IDM Reborn dipakai untuk mendanai film atau membagi
hasilnya, dan **itu kabar baik untuk sekarang.**

Kalau nanti dirancang demikian, perlu diketahui sejak awal: skema "beli token,
dapat bagian dari pendapatan film" adalah **kontrak investasi**, dan di Indonesia
sejak Januari 2026 pengawasan aset kripto ada di OJK dengan fokus perlindungan
investor. Ini bukan hal yang bisa dirumuskan sambil lalu di whitepaper.

Yang **aman** dan tetap bermakna: token sebagai akses (tiket, pemutaran perdana,
merchandise, konten di balik layar) — utilitas konsumsi, bukan janji imbal hasil.

Yang **berbahaya**: kata "bagi hasil", "dividen", "return", "investasi" di dekat
kata "token" tanpa nasihat hukum lebih dulu.

### 2.3 Hubungan badan hukum (Q9) ✅

**PT IDM Film Sejahtera** adalah badan hukum penerbit, NIB **1006240127505** —
sudah tercantum di situs live. Perlu diperjelas di whitepaper: badan hukum yang
sama menaungi empat pilar, atau ada entitas terpisah? Pembaca institusional akan
menanyakan ini lebih dulu daripada hal teknis mana pun.

---

## 3. IDM Chain (L2 BNB) — jawaban Q11–Q15

### 3.1 Status: **belum ada spesifikasi** ❌

Diperiksa di seluruh repositori dan dokumen: tidak ada spesifikasi teknis, tidak
ada kontrak, tidak ada riset arsitektur. Yang ada hanya penyebutan sebagai
rencana.

Satu-satunya pernyataan publik yang sudah tayang, dan ini sudah dirumuskan dengan
baik — pertahankan:

> **IDM Chain (L2).** Testnet lebih dulu. Mainnet hanya jika metrik penggunaan
> tercapai — metriknya diumumkan sebelum dikejar, bukan sesudah.

### 3.2 ⚠️ Pertanyaan yang harus dijawab whitepaper, bukan dihindari

Pertanyaan Q12 dari dokumen induk adalah yang paling menentukan, dan saya
menegaskannya: **kenapa butuh chain sendiri, sementara AIDM sudah berjalan di
opBNB?**

Kalau whitepaper tidak menjawab ini secara meyakinkan, L2 akan terbaca sebagai
tambahan supaya dokumennya terdengar ambisius — dan pembaca teknis akan
menyimpulkan itu dalam sepuluh detik. L2 tanpa alasan yang memaksa adalah tanda
bahaya yang sudah dikenal luas di industri.

Tiga alasan yang *bisa* memaksa, kalau memang berlaku:
- Biaya gas AIDM pada volume tertentu membuat opBNB tidak ekonomis — **buktikan
  dengan angka biaya nyata per transaksi hari ini dan proyeksinya**
- Kebutuhan kontrol atas urutan transaksi atau privasi data UMKM
- Gas token IDM menciptakan permintaan struktural yang tidak bisa didapat dengan
  cara lain

Kalau tidak satu pun berlaku hari ini, jawaban paling kuat justru: **"belum
diperlukan, dan kami akan mengatakannya kalau memang belum."** Itu lebih
meyakinkan daripada arsitektur yang dikarang.

### 3.3 Yang jangan ditulis sebelum ada risetnya ⛔

Jangan memilih istilah karena terdengar bagus. "Optimistic rollup", "zk", dan
"sidechain" punya konsekuensi keamanan, biaya, dan waktu penarikan yang sangat
berbeda. **"Arsitektur belum ditentukan; keputusan diambil setelah riset teknis
selesai"** jauh lebih baik daripada istilah yang dipilih untuk kesan.

---

## 4. ⚠️ Tiga hal di situs live yang sudah tidak cocok

Diperiksa hari ini terhadap idmtoken.com dan repo. Perbaiki sebelum whitepaper
terbit — whitepaper yang bertentangan dengan halaman depannya sendiri merusak
kredibilitas keduanya.

| # | Di situs | Kenyataan ✅ | Tindakan |
|---|---|---|---|
| 1 | Tombol SkemGuard menuju `https://skemguard.app` | **Domain itu tidak resolve.** Yang hidup: `skemguard.vercel.app` | Daftarkan domainnya, atau ubah tautannya |
| 2 | Counter "5 jaringan yang dipindai SkemGuard" | **6 jaringan** sejak Robinhood Chain ditambahkan | Perbarui angkanya |
| 3 | PRD SkemGuard menyebut "1 dari **3** pilar" | Ekosistem kini **4 pilar** | Perbarui PRD §1.1 |

Catatan tambahan: klaim "2 film tayang di bioskop nasional" ✅ **terverifikasi**
dan bisa dipertahankan — bahkan bisa dipertajam menjadi "30 bioskop XXI" untuk
LNOB.

---

## 5. Benang merah keempat pilar — usulan tulang punggung naratif

Ini bagian yang paling saya sarankan Anda pertimbangkan, karena whitepaper empat
pilar yang tidak punya benang merah akan terbaca sebagai empat proyek yang
kebetulan satu pemilik.

**Benang merahnya bukan "blockchain". Benang merahnya: bukti untuk pihak yang
biasanya tidak dipercaya.**

| Pilar | Siapa yang tidak dipercaya | Bukti yang diberikan |
|---|---|---|
| **AIDM** | UMKM tanpa pembukuan formal — sulit dapat kredit | Laporan keuangan yang tersegel on-chain, bisa diverifikasi pihak ketiga |
| **SkemGuard** | Pembeli ritel yang tidak bisa membaca kontrak | Temuan on-chain, dengan sumber tiap sinyal dicatat |
| **IDM Film** | Rumah produksi independen tanpa rekam jejak | BAST, kontrak distributor, 30 bioskop — bukti yang bisa diperiksa |
| **IDM Chain** | *(belum ada)* | *(harus dijawab, atau ditunda)* |

Tiga pilar pertama semuanya menjawab bentuk masalah yang sama: **ada yang benar,
tapi tidak ada cara membuktikannya.** Itu posisi yang tajam, khas Indonesia, dan
sulit ditiru — jauh lebih kuat daripada "ekosistem Web3 serbaguna".

Bahan pendukung yang memperkuat: SkemGuard **menolak memberi skor** ketika
datanya tidak cukup, dan **membatasi vonis** ketika kemampuan jual tidak bisa
diverifikasi. Alat yang berani mengatakan "saya tidak tahu" adalah bukti perilaku
paling kuat yang bisa ditunjukkan sebuah produk kepercayaan — dan itu bisa
diperiksa siapa pun hari ini.

Satu lagi yang layak dinyatakan terus terang: **volume nol IDM hari ini adalah
keputusan sadar**, bukan token mati — tim dan holder sepakat menghentikan
perdagangan DEX untuk transisi ke fase Reborn. 487 pemegang mengirim tokennya
untuk ikut ke babak berikutnya. Angka itu kecil, tapi jujur, dan bisa diperiksa
di BscScan.

---

## 6. Yang masih harus Anda isi

Pertanyaan §10 dokumen induk yang **sudah terjawab** oleh dokumen ini: Q1, Q2,
Q3, Q5, Q6 (SkemGuard) · Q7, Q9, Q10 (Film) · Q11, Q15 (Chain, jawabannya
"belum ada").

Yang **masih terbuka**, dan hanya Anda yang bisa menjawab:

1. **Q4 — bentuk utilitas IDM di SkemGuard.** Pilih satu dari tiga jalan di §1.5.
   Ini yang paling mendesak: klaim "satu token, empat ekosistem" di halaman depan
   belum berlaku untuk SkemGuard.
2. **Q8 — apakah film akan didanai token.** Kalau ya, hentikan penulisan bab itu
   sampai ada nasihat hukum.
3. **Q12–Q14 — alasan yang memaksa untuk L2**, gas token, dan timeline. Kalau
   belum ada, tulis "belum diperlukan".
4. **Q16–Q20 — tim, TGE, anggaran audit, bahasa, dan pembaca utama.** Yang
   terakhir menentukan seluruh nada dokumen.
5. **Kredensial Supabase** supaya pencatatan deployer menyala. Ini satu-satunya
   butir di daftar ini yang **kehilangan nilainya setiap hari ditunda**.

---

## 7. Rujukan berkas

| Berkas | Isi |
|---|---|
| `idmtoken/skemguard/docs/PRD.md` | Produk, arsitektur, kontrak API, rubrik skor |
| `idmtoken/skemguard/docs/SkemGuard-Addendum-Reputasi-Deployer.md` | Lapisan reputasi + tujuh pengaman |
| `idmtoken/skemguard/supabase/schema.sql` | Skema audit & pencatatan deployer |
| `idm-reborn-landing-page/copy-deck-landing-idm-reborn.md` | Klaim publik yang sudah tayang |
| `film_LNOB/BIOSKOP_LNOB_KOP_RESMI.pdf` | Pengajuan resmi, 30 bioskop XXI |
| `film_LNOB/Daftar_Bioskop_Penayangan_LNOB.pdf` | Daftar bioskop per kota |
| `aidm/docs/INSIGHT-WHITEPAPER-IDM-REBORN.md` | **Dokumen induk** — AIDM & tokenomics |

**Peringatan pemeliharaan.** Angka SkemGuard di dokumen ini adalah snapshot
9 September 2026 dan bergerak cepat — milestone, jumlah chain, dan latency semua
berubah dalam sepekan terakhir. Periksa ulang ke repo sebelum publikasi, jangan
salin dari sini ke whitepaper tanpa verifikasi.
