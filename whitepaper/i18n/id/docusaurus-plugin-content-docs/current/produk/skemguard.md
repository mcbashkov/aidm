---
sidebar_position: 2
slug: /produk/skemguard
id: skemguard
title: "SkemGuard — pemindai keamanan token"
description: "SkemGuard secara rinci: produk, pengukuran nyata, lapisan reputasi deployer, dan tegangan utilitas token yang dinyatakan terbuka."
---

import StatusBadge from '@site/src/components/StatusBadge';

# SkemGuard <StatusBadge pillar="skemguard" />

## Produknya dalam satu kalimat

SkemGuard memindai keamanan token kripto secara langsung: pengguna menempelkan
alamat kontrak dan dalam hitungan detik menerima skor 0–100, kategori risiko,
dan penjelasan berbahasa awam.

Masalahnya konkret. Pembeli ritel tidak punya cara praktis memeriksa apakah
sebuah token bisa dijual kembali, apakah pembuatnya masih bisa mencetak koin
baru atau membekukan dompet, dan apakah likuiditasnya terkunci — *sebelum*
uangnya masuk. Informasi itu ada di rantai, tetapi tersebar dan berbentuk
teknis.

## Posisi

Kesederhanaan pemindai yang paling ringan, dengan kedalaman deteksi dan
simulasi jual milik yang paling berat — ditambah satu pembeda yang tidak
dimiliki keduanya: **netralitas yang dinyatakan dan bisa diperiksa.**

## Diukur, bukan diklaim

Ini bukan prototipe. Aplikasinya hidup, memanggil penyedia data sungguhan, dan
mengembalikan hasil nyata.

| | |
|---|---|
| Jaringan didukung | **6** — Solana, Ethereum, BSC, Polygon, Base, Robinhood |
| Latensi median | **495 ms** |
| Latensi persentil ke-95 | **825 ms** (target internal: di bawah 5 detik) |
| Batas laju | 15 permintaan per menit per IP |
| Dependensi produksi | **3** |

Hasil yang bisa diulang siapa pun dengan menempelkan alamat yang sama: BONK di
Solana berskor aman dengan keyakinan tinggi; SHIB di Ethereum berskor aman
tetapi menandai LP yang tidak terkunci; USDC di Base terdeteksi otomatis.

**Yang belum selesai, dan dinyatakan terbuka di repositori:** kalibrasi bobot
skor, ringkasan AI, dan pengemasan aplikasi terpasang.

## Tanpa kontrak pintar — dan itu memang desainnya

SkemGuard **tidak punya satu pun kontrak pintar**, dan itu bukan kekurangan
yang perlu ditutupi.

SkemGuard membaca rantai; ia tidak menulis ke sana. Ia memanggil RPC dan API
keamanan, lalu menilai. Menambahkan kontrak hanya supaya terdengar "on-chain"
akan memperbesar permukaan serangan tanpa menambah kegunaan.

Prinsip umumnya layak dinyatakan: **tidak setiap bagian ekosistem harus punya
kontrak. Yang harus punya kontrak adalah yang memindahkan nilai.**

## Lapisan reputasi deployer

Skor token menjawab *"token ini aman?"*. Lapisan reputasi menjawab pertanyaan
yang lebih menentukan: **"siapa yang membuatnya, dan apa rekam jejaknya?"**

Nilai strategisnya sederhana: ini satu-satunya bagian SkemGuard yang tidak bisa
disalin dengan berlangganan API. Datanya hanya tumbuh dari akumulasi pemindaian
sendiri. Makin lama dipakai, makin sulit disaingi.

Tiga pengaman mengikat desainnya:

- **Nyatakan fakta, jangan menjatuhkan vonis pada orang.** *"Dompet ini pernah
  men-deploy empat token; pada tiga di antaranya likuiditas ditarik dalam 30
  hari"* — bukan *"deployer ini penipu"*. Penggunanya yang menyimpulkan.
- **Reputasi tidak pernah menentukan vonis**, paling jauh menjadi pengubah yang
  terbatas. Pengembang baru berhak mulai dengan adil.
- **Alamat tidak pernah dikaitkan ke identitas dunia nyata.** Yang dinilai
  perilaku alamat, bukan orangnya — sekaligus menjauhkan sistem dari wilayah
  perlindungan data pribadi.

Posisinya: **sumber intelijen, bukan alat penindakan.**

**Status:** mekanisme pencatatannya sudah dibangun dan diverifikasi ujung ke
ujung, termasuk kolom yang mencatat *dari mana* alamat pembuat itu didapat — di
sebagian rantai, alamat yang tersedia sering kali bukan pembuat aslinya. Ia
**belum menyala di produksi** karena satu kredensial belum diisi. Itu mendesak
dan dinyatakan apa adanya: data ini hanya tumbuh dari akumulasi, dan setiap hari
tanpa pencatatan hilang permanen.

## Utilitas token: saat ini nol — tegangan desain, bukan kelalaian

Ini hal terpenting yang perlu dipahami tentang SkemGuard.

Halaman metodologinya yang sudah tayang menyatakan tidak ada pengecualian untuk
token mana pun — termasuk token ekosistem sendiri — tidak ada daftar putih, dan
tidak ada slot berbayar untuk memperbaiki hasil.

Akibatnya, utilitas token yang paling lazim di produk semacam ini — bayar untuk
memindai, staking untuk hasil lebih baik, whitelist — **bertabrakan langsung
dengan pembeda produknya sendiri.** Pemindai keamanan yang hasilnya bisa
dipengaruhi uang tidak punya alasan untuk dipercaya, dan kepercayaan adalah
satu-satunya barang yang dijualnya.

Tiga jalan yang tidak merusak netralitas:

1. **Token untuk data turunan, bukan untuk vonis.** Hasil pemindaian tetap
   gratis dan identik bagi semua orang; yang berbayar adalah akses ke lapisan
   reputasi — API, ekspor, riwayat. Ini menjual pekerjaan akumulasi, bukan
   menjual pengaruh atas hasil.
2. **Token untuk kuota, bukan untuk kualitas.** Batas laju lebih tinggi bagi
   pemegang. Tidak mengubah satu pun angka yang dilihat pengguna. Aman secara
   prinsip, kecil nilainya.
3. **Tanpa token sama sekali.** SkemGuard diposisikan sebagai aset kepercayaan
   dan pintu masuk ke ekosistem, bukan sebagai mesin permintaan token.

Jalan 1 adalah arah yang sedang dipertimbangkan, dengan jalan 3 sebagai posisi
awal sampai lapisan reputasinya matang. **Sampai keputusan itu diambil, dokumen
ini tidak mengklaim IDM punya utilitas di SkemGuard** — menulis *"IDM dipakai di
SkemGuard"* tanpa menyebut bentuknya adalah klaim yang runtuh pada pemeriksaan
pertama.
