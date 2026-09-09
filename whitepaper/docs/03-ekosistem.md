---
sidebar_position: 4
slug: /ekosistem
id: ekosistem
title: "Ekosistem empat pilar"
description: "AIDM, SkemGuard, IDM Film, dan IDM Chain — berikut status jujur masing-masing."
---

import StatusBadge from '@site/src/components/StatusBadge';
import OnChainStat from '@site/src/components/OnChainStat';

# Ekosistem empat pilar

Empat pilar dengan tingkat kematangan yang sangat berbeda. Menyajikannya
seolah setara akan menyesatkan, jadi tiap bagian membawa statusnya sendiri.

## AIDM <StatusBadge pillar="aidm" />

Aplikasi pencatatan keuangan berbasis percakapan untuk pelaku usaha mikro.
Pengguna mencatat dengan kalimat biasa atau suara; sistem mengubahnya menjadi
catatan terstruktur, lalu menyusun laporan yang bisa dicetak dan disegel.

Ini pilar dengan porsi teknologi blockchain terbesar — dompet otomatis,
imbalan aktivitas on-chain, dan segel laporan semuanya hidup di sini. Laporan
tersegel sejauh ini: <OnChainStat metric="sealedReports" />.

## SkemGuard <StatusBadge pillar="skemguard" />

Pemindai keamanan token untuk enam jaringan. Pengguna menempelkan alamat
kontrak dan menerima penilaian risiko sebelum membeli.

**Utilitas token IDM di SkemGuard saat ini nol, dan itu keputusan desain, bukan
kelalaian.** Halaman metodologinya menyatakan tidak ada pengecualian untuk
token mana pun — termasuk token ekosistem sendiri — tidak ada daftar putih, dan
tidak ada slot berbayar untuk memperbaiki hasil.

Konsekuensinya perlu disebut terang-terangan: utilitas token yang paling lazim
di produk semacam ini — bayar untuk memindai, staking untuk hasil lebih baik,
whitelist — **bertabrakan langsung dengan pembeda produknya sendiri.** Pemindai
keamanan yang hasilnya bisa dipengaruhi uang tidak punya alasan untuk
dipercaya, dan kepercayaan adalah satu-satunya barang yang dijualnya.

Arah yang sedang dipertimbangkan, dan belum diputuskan: token untuk **data
turunan**, bukan untuk vonis — hasil pemindaian tetap gratis dan identik bagi
semua orang, sementara yang berbayar adalah akses ke lapisan reputasi deployer
(API, ekspor, riwayat). Itu menjual pekerjaan akumulasi, bukan menjual pengaruh
atas hasil.

Sampai keputusan itu diambil, dokumen ini tidak mengklaim IDM punya utilitas di
SkemGuard.

## IDM Film <StatusBadge pillar="film" />

Produksi film, dengan dua judul yang sudah tayang di bioskop nasional. Badan
hukum penerbit token adalah PT IDM Film Sejahtera — entitas yang sama.

**Tidak ada skema pendanaan film lewat token**, dan untuk saat ini itu
disengaja. Utilitas yang aman dan tetap bermakna adalah token sebagai **akses**
— tiket, pemutaran perdana, konten di balik layar. Skema yang menautkan
kepemilikan token dengan pendapatan film adalah wilayah yang menuntut nasihat
hukum lebih dulu, dan tidak akan dirumuskan sambil lalu di dokumen ini.

## IDM Chain <StatusBadge pillar="idmchain" />

Layer 2 di atas BNB Chain. **Belum ada spesifikasi teknis, kontrak, maupun
riset arsitektur** — yang ada baru rencana.

Kami menolak menyebut jenis arsitekturnya sebelum risetnya selesai. Istilah
seperti *optimistic rollup*, *zk*, dan *sidechain* punya konsekuensi keamanan,
biaya, dan waktu penarikan yang sangat berbeda; memilih salah satunya karena
terdengar meyakinkan adalah cara cepat kehilangan kepercayaan pembaca teknis.

Pertanyaan yang harus dijawab lebih dulu, dan belum terjawab: **kenapa butuh
chain sendiri, sementara AIDM sudah berjalan baik di opBNB?** Sampai ada
jawaban yang didukung angka biaya nyata, posisi kami adalah *belum diperlukan*.

Komitmennya: testnet lebih dulu; mainnet hanya bila metrik penggunaan tercapai,
dan metriknya diumumkan sebelum dikejar — bukan sesudah.
