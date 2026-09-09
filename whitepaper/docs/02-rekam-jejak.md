---
sidebar_position: 3
slug: /rekam-jejak
id: rekam-jejak
title: "Rekam jejak & migrasi"
description: "Token v1, keputusan menghentikan perdagangan, dan skema migrasi ke IDM Reborn."
---

import OnChainStat from '@site/src/components/OnChainStat';
import Receipt from '@site/src/components/Receipt';

# Rekam jejak & migrasi

## Token generasi pertama

IDM generasi pertama berhenti diperdagangkan atas kesepakatan tim dan pemegang,
sebagai transisi menuju fase "Reborn". Itu keputusan sadar, bukan proyek yang
ditinggalkan — dan bedanya bisa diperiksa: sebagian besar pasokan lama dikunci
permanen di alamat mati.

<Receipt
  claim="Token v1 yang terkunci permanen di alamat 0x…dEaD"
  evidence="Dibaca langsung dari kontrak token v1 di BNB Chain"
  url="https://bscscan.com/token/0x14B13E06f75E1F0Fd51ca2E699589Ef398E10F4C"
  date="lihat tanggal pada angka di bawah" />

Saldo terkunci: <OnChainStat metric="deadBalance" decimals={2} suffix=" IDM v1" />

Angka itu dibaca dari rantai setiap kali situs ini dibangun. Ia tidak diketik.

## Migrasi ke IDM Reborn

Pemegang yang memilih lanjut menerima alokasi IDM Reborn. Daftarnya
terverifikasi dan dikunci ke dalam sebuah *merkle tree* — struktur yang
memungkinkan setiap orang membuktikan haknya sendiri tanpa perlu memercayai
daftar yang kami simpan.

Pos migrasi terbagi tiga bagian yang berdiri sendiri:

| Bagian | Keadaan |
|---|---|
| Kewajiban terverifikasi | Sudah masuk *merkle root*; setiap alamat bisa membuktikan haknya |
| Disisihkan menunggu verifikasi | Alamat penerimanya belum diketahui — **bukan dihapus, bukan dilebur** |
| Kolam keterlambatan | Mekanisme pembagiannya **belum ditentukan** |

Angka ketiganya ada di bab Arsitektur token, diambil dari berkas data yang sama
yang dipakai membangun pohon.

### Kenapa bagian yang disisihkan tidak dilebur saja

Melebur alokasi tanpa alamat ke dalam kolam keterlambatan akan menghapus jejak
bahwa ia milik seseorang. Sekali jejak itu hilang, tidak ada yang akan
mencarinya lagi. Ia berdiri sebagai barisnya sendiri sampai alamatnya
diketahui.

Konsekuensinya jujur: **selama alokasi itu belum beralamat, akar merkle yang
ada hanya sah untuk testnet.** Akar itu tidak bisa diubah setelah kontrak
dipasang, jadi memasangnya di mainnet sekarang berarti mengunci kelalaian itu
secara permanen.

## Jadwal pelepasan migrasi

Dua tingkat, dibedakan oleh ambang saldo, dan **tingkatnya dihitung oleh
kontrak** dari jumlah alokasi — bukan disimpan di dalam daftar:

- Di bawah ambang → seluruhnya terbuka saat TGE
- Pada atau di atas ambang → sebagian terbuka saat TGE, sisanya matang linear
  selama enam bulan

Kematangan dihitung dari **waktu TGE**, bukan dari tanggal seseorang mengklaim.
Kalau dihitung dari tanggal klaim, pemegang yang terlambat membaca pengumuman
justru selesai vesting paling akhir — keterlambatan berubah menjadi hukuman.
Dengan waktu awal bersama, mengklaim lebih lambat tidak pernah merugikan: yang
sudah matang tetap matang dan menunggu.
