---
sidebar_position: 4
slug: /projects/idm-chain
id: idm-chain
title: "IDM Chain — rencana, dan apa yang belum ada"
description: "IDM Chain secara rinci: rencana tanpa spesifikasi, pertanyaan yang harus dijawab lebih dulu, dan komitmen yang mengikatnya."
---

import StatusBadge from '@site/src/components/StatusBadge';

# IDM Chain <StatusBadge pillar="idmchain" />

Layer 2 di atas BNB Chain. Halaman ini sengaja yang terpendek di antara empat
pilar, karena memang sedikit yang bisa dijelaskan — dan kami lebih memilih
mengatakannya daripada mengisi ruangnya.

## Yang sudah ada

Sebuah rencana, dan komitmen publik tentang bagaimana ia akan dijalankan.

## Yang belum ada

**Tidak ada spesifikasi teknis. Tidak ada kontrak. Tidak ada riset
arsitektur.**

Kami memeriksa repositori dan dokumen sebelum menulis kalimat itu, bukan
sesudahnya.

## Kenapa kami belum menyebut jenis arsitekturnya

*Optimistic rollup*, *zk*, dan *sidechain* bukan label yang bisa dipertukarkan.
Ketiganya membawa asumsi keamanan, profil biaya, dan waktu penarikan yang
sangat berbeda. Memilih salah satunya karena terbaca meyakinkan adalah cara
tercepat kehilangan pembaca teknis, sebab pembaca itu akan mengajukan
pertanyaan kedua yang tidak bisa dijawab dokumennya.

**"Arsitektur belum ditentukan; keputusan diambil setelah riset teknis
selesai"** adalah kalimat yang lebih lemah untuk ditulis dan lebih kuat untuk
dipertahankan.

## Pertanyaan yang harus dijawab lebih dulu

**Kenapa butuh chain sendiri, sementara AIDM sudah berjalan baik di opBNB?**

Kalau whitepaper tidak bisa menjawabnya secara meyakinkan, L2 akan terbaca
sebagai tambahan agar dokumennya terdengar ambisius — dan pembaca teknis
menyimpulkan itu dalam hitungan detik. L2 tanpa alasan yang memaksa adalah
tanda bahaya yang sudah dikenal luas.

Tiga alasan yang *bisa* memaksa, bila memang berlaku:

- Biaya gas pada volume transaksi tertentu membuat opBNB tidak ekonomis — dan
  itu harus dibuktikan dengan biaya nyata per transaksi hari ini beserta
  proyeksinya, bukan sekadar dinyatakan
- Kebutuhan kendali atas urutan transaksi, atau atas privasi data pelaku usaha
  mikro
- IDM sebagai token gas menciptakan permintaan struktural yang tidak bisa
  diperoleh dengan cara lain

**Bila tidak satu pun berlaku hari ini, jawaban terkuat adalah: belum
diperlukan, dan kami akan mengatakannya.** Itu lebih meyakinkan daripada
arsitektur yang dikarang untuk mengisi sebuah bab.

## Komitmen yang mengikat

- **Testnet lebih dulu.**
- **Mainnet hanya bila metrik penggunaan tercapai** — dan metriknya diumumkan
  sebelum dikejar, bukan sesudah. Target yang diterbitkan setelah tercapai
  bukan target; ia deskripsi.

## Cara membaca halaman ini

Ketiadaan rincian di sini bukan kekosongan yang hendak kami tambal diam-diam.
Ia keadaan yang berlaku sekarang, dinyatakan pada tingkat keterlihatan yang
sama dengan pilar-pilar yang sudah lebih jauh. Ketika risetnya ada, halaman ini
berubah, dan versi dokumennya berubah bersamanya.
