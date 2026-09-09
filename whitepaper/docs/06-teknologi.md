---
sidebar_position: 7
slug: /teknologi
id: teknologi
title: "Teknologi"
description: "BSC dan opBNB, dompet tertanam, segel hash-only, dan keamanan."
---

import OnChainStat from '@site/src/components/OnChainStat';

# Teknologi

## Dompet tanpa hambatan masuk

Prinsipnya: **punya akun berarti punya dompet.** Dompet tertanam dibuat
otomatis saat pendaftaran, tanpa frasa pemulihan yang harus dicatat pengguna,
dan gas untuk aktivitas di opBNB disponsori aplikasi.

Pengguna dapat mengekspor kunci dompetnya kapan saja. Selama ia menyimpan kunci
itu, dompetnya tetap miliknya bahkan setelah akunnya dihapus dari aplikasi.

Pembuatan dompet dijalankan di **server**, pada jalur yang harus dilewati
setiap sesi. Ini terdengar seperti detail implementasi, tetapi ia keputusan
arsitektur yang dibayar mahal: invarian produk yang menumpang pada komponen
tampilan akan runtuh diam-diam ketika komponen itu diganti oleh orang yang
tidak tahu ada invarian di sana.

## Segel laporan — hanya sidik jari

Laporan disusun menjadi bentuk kanonik (kunci terurut, angka bulat, zona waktu
tetap), lalu di-hash. **Hanya hash-nya yang ditulis ke rantai.**

Data keuangan tidak pernah menyentuh blockchain. Yang publik hanya sidik jari —
cukup untuk membuktikan laporan itu ada dan tidak berubah pada tanggal
tersebut, tidak cukup untuk mengetahui isinya.

Sifat yang membuatnya bermakna adalah permanensinya, dan itu berlaku dua arah:
hash tetap ada bahkan setelah pengguna menghapus akunnya. Kami menyampaikan itu
kepada pengguna di dalam aplikasi sebagai konsekuensi, bukan menyembunyikannya
— sesuatu yang bisa dihapus belakangan tidak akan pernah bisa membuktikan apa
pun.

Laporan tersegel sejauh ini: <OnChainStat metric="sealedReports" />.

## Pemrosesan bahasa

Kalimat pengguna diproses model bahasa menjadi entri terstruktur, dengan parser
cadangan berbasis aturan bila model gagal atau lambat. Ada gerbang deterministik
sebelum model dipanggil: kalimat yang tidak memuat jejak uang sama sekali tidak
pernah mencapai model.

Angka uang tidak pernah dikarang. Kalimat yang menyebut transaksi tanpa nominal
menghasilkan catatan yang menunggu, bukan angka tebakan.

## Keamanan yang ditegakkan kontrak

Empat jaminan berikut hidup di dalam kontrak, bukan di server:

1. **Penebusan ganda mustahil** — nomor sekali pakai pada tiap kupon
2. **Plafon ditegakkan on-chain** — server yang gagal atau dikompromikan tidak
   bisa melampauinya
3. **Kurs hanya bisa bergerak ke arah yang menguntungkan pengguna**
4. **Alokasi migrasi tidak bisa diturunkan** — akar merkle tidak bisa diubah
   setelah kontrak dipasang, dan tidak ada fungsi jeda maupun penarikan yang
   bisa menyentuh alokasi yang belum diklaim

Butir keempat punya konsekuensi yang perlu dinyatakan: karena akar merkle tidak
bisa diubah, daftar alokasi **harus final sebelum kontrak dipasang di mainnet**.
Kontrak ini tidak bisa "diisi belakangan". Itu bukan keterbatasan melainkan
sifat yang dituju — alokasi yang bisa diganti pemilik kontrak bukan kewajiban,
melainkan janji.
