---
sidebar_position: 6
slug: /model-ekonomi
id: model-ekonomi
title: "Model ekonomi"
description: "Langganan, imbalan aktivitas, treasury, dan pemisahan rel uang dari rel token."
---

# Model ekonomi

## Dua rel yang sengaja tidak bersinggungan

| Rel | Alat bayar | Untuk apa |
|---|---|---|
| Produk | Uang biasa (QRIS / transfer) | Langganan Premium AIDM |
| Token | IDMX → IDM Reborn | Imbalan aktivitas, ditukar lewat kontrak |

Pemisahan ini disengaja karena dua alasan yang sama-sama mengikat: kepatuhan
toko aplikasi, dan menjaga agar pendapatan produk tidak bergantung pada harga
token — maupun sebaliknya. Produk yang pendapatannya bergantung pada harga
tokennya sendiri akan mengambil keputusan produk demi harga, dan itu terlihat
oleh pengguna sebelum terlihat oleh siapa pun.

## Imbalan aktivitas

IDMX diberikan untuk perbuatan yang memang diinginkan produk — mencatat kedua
sisi arus kas, mencatat lewat suara, membaca laporan, menyegel laporan bulanan.
Bukan sekadar "membuka aplikasi".

Seluruh imbalan **diturunkan dari data sumber**, bukan dari penanda yang bisa
disetel sembarangan. Menghapus transaksi otomatis menurunkan kembali
progresnya.

Klaim imbalan berjalan lewat kupon bertanda tangan yang ditebus di kontrak,
dengan plafon harian dan bulanan per dompet. Rinciannya di bab Arsitektur
token.

## Treasury

Treasury dibagi menjadi operasional, kemitraan dan hibah, cadangan darurat, dan
pembelian kembali. Porsi tiap bagian ada di berkas data yang sama dengan
alokasi.

**Treasury adalah dompet tunggal milik perusahaan**, bukan dompet multipihak.
Alamatnya dipublikasikan di bab Lampiran.

Konsekuensinya kami sebut apa adanya, bukan disamarkan: satu kunci
mengendalikan seluruh isi treasury. Itu memperkuat — bukan melemahkan —
larangan yang berlaku di seluruh dokumen ini, bahwa **kami tidak mengklaim
desentralisasi maupun tata kelola yang aman**. Pembaca yang menilai risiko
sebaiknya menimbang hal ini bersama temuan pemusatan peran di bab Kepatuhan &
risiko.

## Pembelian kembali

Sebagian treasury dialokasikan untuk pembelian kembali. Fungsinya di dokumen
ini dinyatakan sebagai **ketertiban distribusi dan kedalaman pasar** — bukan
sebagai mekanisme untuk mengelola harga.

Pembedaan itu bukan kehalusan bahasa. Penerbit yang menempatkan dirinya sebagai
pengelola harga mengambil posisi yang tidak bisa dipertahankan di hadapan
regulator mana pun, dan menciptakan harapan yang tidak bisa ia penuhi.

## Yang tidak dijanjikan

- Kepemilikan token tidak memberi hak atas pendapatan, laba, maupun distribusi
  apa pun dari perusahaan
- Tidak ada nilai rupiah yang dijanjikan atas imbalan aktivitas — token belum
  diperdagangkan, sehingga harganya belum terbentuk
- Tidak ada janji pencatatan di bursa mana pun
