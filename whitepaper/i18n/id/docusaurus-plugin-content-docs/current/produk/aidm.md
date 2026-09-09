---
sidebar_position: 1
slug: /produk/aidm
id: aidm
title: "AIDM — pencatatan keuangan UMKM"
description: "AIDM secara rinci: produknya, komponen on-chain, dan apa yang terukur hari ini."
---

import StatusBadge from '@site/src/components/StatusBadge';
import OnChainStat from '@site/src/components/OnChainStat';

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
