---
sidebar_position: 1
slug: /projects/aidm
id: aidm
title: "AIDM — pencatatan keuangan UMKM"
description: "AIDM secara rinci: produknya, komponen on-chain, dan apa yang terukur hari ini."
---

import StatusBadge from '@site/src/components/StatusBadge';
import OnChainStat from '@site/src/components/OnChainStat';
import MissionTable from '@site/src/components/MissionTable';

# AIDM <StatusBadge pillar="aidm" />

**Pilar dengan porsi pekerjaan blockchain terbesar di ekosistem ini.** Seluruh
kontrak pintar yang memindahkan nilai berdiri di belakang produk ini.

## Produknya dalam satu paragraf

AIDM adalah aplikasi pencatatan keuangan berbasis percakapan untuk pelaku usaha
mikro Indonesia. Pengguna mencatat pemasukan dan pengeluaran dengan kalimat
biasa atau suara — *"jual 3 nasi goreng 45rb bayar QRIS"* — dan agen AI
mengubahnya menjadi catatan terstruktur. Dari catatan itu aplikasi menyusun
laporan keuangan yang bisa dicetak, diekspor, dan disegel on-chain.

Prinsip desain di baliknya: pengguna merasa sedang mencatat, sementara sistem
diam-diam membangun rekam usaha yang bisa dibaca pihak lain.

## Kenapa bentuk percakapan itu menentukan

Aplikasi pembukuan sudah banyak, dan sebagian besar tidak dipakai. Yang membuat
begitu adalah bentuknya: formulir dengan kolom, kategori, dan istilah akuntansi
yang menuntut pengguna belajar dulu sebelum bisa mencatat penjualan pertamanya.

Menghilangkan hambatan itu bukan pilihan kosmetik — ia seluruh tesis produknya.
Catatan yang tidak pernah dibuat tidak membuktikan apa pun.

## Empat pilar Web3 di dalam AIDM

**1. Punya akun berarti punya dompet.** Dompet tertanam dibuat otomatis saat
pendaftaran, tanpa frasa pemulihan, dan gas di opBNB disponsori aplikasi.
Pelaku usaha mikro tidak pernah diminta membeli aset kripto hanya untuk
mencatat penjualan.

**2. Aktivitas nyata memperoleh IDMX.** Imbalan diberikan untuk perbuatan yang
memang diinginkan produk — mencatat kedua sisi arus kas, memakai suara, membaca
laporan, menyegel laporan bulanan. Seluruhnya diturunkan dari data sumber,
bukan dari penanda yang bisa disetel sembarangan: menghapus transaksi otomatis
menurunkan kembali progresnya.

**3. Premium dibayar dengan uang, tidak pernah dengan token.** Ini menjaga
kepatuhan toko aplikasi sekaligus mencegah pendapatan produk bergantung pada
harga token.

**4. Laporan disegel on-chain — sidik jarinya saja.** Laporan disusun menjadi
bentuk kanonik lalu di-hash; hanya hash-nya yang ditulis ke opBNB. Data
keuangan tidak pernah menyentuh rantai.

## Bagaimana imbalan benar-benar bekerja

<MissionTable />

Tiga sifatnya lebih penting daripada angkanya:

- **Setiap misi diturunkan dari data sumber.** Tidak ada penanda yang bisa
  disetel server. Menghapus transaksi menurunkan kembali progresnya.
- **Satu misi tidak bisa diturunkan, dan itu ditangani jujur.** Membaca laporan
  tidak meninggalkan jejak di tabel mana pun — ia peristiwa, dan peristiwa
  harus dicatat saat terjadi atau hilang. Yang dicatat hanya satu bit per
  pekan: *pengguna ini membuka Laporan*. Tidak ada periode yang dilihat, tidak
  ada durasi.
- **Plafon ditegakkan on-chain**, berlapis tiga: per dompet per hari, per
  dompet per bulan kalender untuk imbalan bernilai besar, dan plafon global
  harian yang berlaku untuk seluruh pengguna.

## Langganan, dan apa yang tidak disentuhnya

Premium adalah langganan bulanan yang dibayar dengan uang biasa lewat gerbang
pembayaran lokal, dengan masa coba sekali seumur akun. Ia membuka fitur riset
dan generator konten dengan kuota wajar bulanan.

**Mencatat, laporan, misi, dan segel tetap gratis dan berada di luar
langganan.** Lapisan berbayar tidak boleh berdiri di antara pengguna dan
pembukuannya sendiri.

Pembayarannya sekali beli untuk 30 hari, bukan tagihan berulang — instrumen
lokal yang dipakai sebagian besar pelaku usaha mikro tidak bisa ditagih
otomatis, dan memaksakan tagihan berulang berarti memaksakan kartu kredit pada
orang yang tidak punya.

## Keputusan rekayasa yang membentuk produknya

**Angka tidak pernah ditampilkan sebelum diketahui.** Layar yang menggambar
keadaan memuat seolah ia fakta bukan kekurangan kosmetik di aplikasi
pembukuan; angka uang yang salah selama satu detik tetap angka yang salah.
Setiap layar data membedakan *memuat*, *gagal*, dan *kosong* — dan tidak pernah
merender yang satu sebagai yang lain.

**Jam transaksi tidak ditampilkan sama sekali.** AIDM tidak pernah tahu jam
kejadiannya, jadi ia tidak berpura-pura tahu. Pelaku usaha mikro lazim mencatat
sehari penuh pada malam hari; menampilkan jam itu sama menyesatkannya dengan
mengarangnya. Tanggal saja.

**Mencatat tetap jalan saat offline.** Entri diantrekan lokal dan disinkronkan
kemudian. Namun membaca angka uang saat offline gagal secara terlihat, bukan
menampilkan nol yang basi.

## Yang terukur hari ini

| Metrik | Nilai |
|---|---|
| Kolam imbalan yang dipegang kontrak | <OnChainStat metric="missionRewardsPool" suffix=" IDMX" /> |
| Laporan tersegel on-chain | <OnChainStat metric="sealedReports" /> |

Aplikasi berjalan di produksi sejak Agustus 2026 dengan pengguna dan catatan
sungguhan. Jumlah penggunanya sengaja belum dipublikasikan selama masih beta
tertutup — angka sekecil itu lebih mudah disalahbaca daripada dijelaskan.

## Kontrak di balik produk ini

| Kontrak | Jaringan | Peran |
|---|---|---|
| `IDMX` | opBNB testnet | Token imbalan aktivitas |
| `MissionRewards` | opBNB testnet | Membayar imbalan atas kupon bertanda tangan |
| `ReportAttestation` | opBNB testnet | Menyegel sidik jari laporan |
| `SwapInitiator` | opBNB testnet | Membakar IDMX, menerbitkan permintaan tukar |

Keempatnya di testnet. Perilaku, plafon, dan jaminannya dijelaskan di
[Arsitektur token](/arsitektur-token) dan [Teknologi](/teknologi).

## Yang tidak dijanjikan AIDM

AIDM membantu sampai laporan menjadi berkas yang rapi dan tersegel. Mau dibawa
ke mana berkas itu adalah urusan pemiliknya, dan diterima atau tidaknya adalah
wewenang lembaga yang menilai. Kami tidak menjanjikan hasil apa pun di luar
alatnya sendiri.
