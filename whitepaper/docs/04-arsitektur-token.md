---
sidebar_position: 5
slug: /arsitektur-token
id: arsitektur-token
title: "Arsitektur token"
description: "IDM Reborn, IDMX, properti kontrak, alokasi, dan jadwal pelepasan."
---

import AllocationTable from '@site/src/components/AllocationTable';
import UnlockCurve from '@site/src/components/UnlockCurve';
import OnChainStat from '@site/src/components/OnChainStat';

# Arsitektur token

## Dua token, dua peran

| | IDM Reborn | IDMX |
|---|---|---|
| Jaringan | BNB Chain | opBNB |
| Pasokan | <OnChainStat metric="idmRebornSupply" /> | <OnChainStat metric="idmxSupply" /> |
| Peran | Token nilai ekosistem | Poin imbalan aktivitas |
| Fungsi cetak | Tidak ada | Tidak ada |

**Kenapa dua, bukan satu.** IDMX diterbitkan terus-menerus sebagai imbalan
aktivitas harian. Kalau ia sekaligus token nilai, setiap pencatatan transaksi
menjadi inflasi langsung terhadap pemegang. Memisahkannya membuat aktivitas
harian murah dan berlimpah, sementara konversi ke nilai melewati gerbang yang
punya kurs, plafon, dan pembakaran.

**Kenapa dua jaringan.** opBNB dipilih untuk aktivitas karena gasnya cukup
murah untuk disponsori aplikasi — pelaku usaha mikro tidak boleh diminta
membeli aset kripto hanya untuk mencatat penjualan. BNB Chain dipilih untuk
token nilai karena di situlah likuiditas berada.

Ada pos ketiga yang sengaja **tidak** memakai token sama sekali: langganan
Premium AIDM dibayar dengan uang biasa. Ekonomi produk tidak boleh menyandera
ekonomi token, dan sebaliknya.

## Properti kontrak IDM Reborn

- Pasokan tetap, **tanpa fungsi cetak**
- **Tanpa pajak beli/jual** — ERC-20 standar murni. Ini keputusan kompatibilitas
  listing, bukan sekadar keramahan: bursa menolak token bertax karena merusak
  akuntansi order book mereka
- Biaya transfer datar yang **dibakar seluruhnya**

## Alokasi

<AllocationTable />

Pos migrasi terbagi tiga baris terpisah, dan jumlah ketiganya **tepat** sama
dengan alokasi induknya — diperiksa otomatis setiap kali situs ini dibangun.
Selisih sepeser pun berarti ada token yang tidak punya rumah.

## Jadwal pelepasan

<UnlockCurve months={24} />

Kurva di atas dihitung dari jadwal vesting tiap pos ditambah emisi migrasi
enam bulan. Ia tidak digambar tangan: bila jadwalnya berubah, kurvanya ikut
berubah.

Garis putus-putus menandai sirkulasi saat TGE.

## Penukaran IDMX → IDM Reborn

Satu kontrak tidak bisa menyentuh dua jaringan sekaligus, jadi penukarannya
berbentuk jembatan bertanda tangan:

1. Pengguna mengumpulkan IDMX dari aktivitas di aplikasi (opBNB)
2. IDMX **dibakar sungguhan** — pasokan berkurang, terlihat di penjelajah blok
3. Layanan penghubung menandatangani kupon setelah menunggu konfirmasi yang
   cukup untuk tahan terhadap reorganisasi rantai
4. Kupon ditebus di BNB Chain; IDM dilepas dari kolam

Tiga sifat yang layak diperiksa sendiri oleh pembaca:

- **Pembakaran sejati.** IDMX yang ditukar hilang dari pasokan. Kolam yang
  "dibakar" dengan cara dipindahkan ke alamat mati adalah klaim yang lebih
  lemah.
- **Kurs satu arah.** Fungsi pengubah kurs menolak nilai yang memburuk bagi
  pengguna. Menaikkan kemurahan hati selalu bisa; menurunkannya menghancurkan
  kepercayaan secara permanen — jadi kemungkinan itu ditutup oleh kode, bukan
  oleh janji.
- **Penebusan ganda mustahil.** Setiap kupon membawa nomor sekali pakai. Bahkan
  server yang sepenuhnya dikompromikan tidak bisa membuat satu kupon dibayar
  dua kali; kontraklah yang menolaknya.

Kolam penukaran: <OnChainStat metric="swapClaimPool" suffix=" IDM" />, dan
kolam imbalan aktivitas: <OnChainStat metric="missionRewardsPool" suffix=" IDMX" />.

## Plafon berlapis

Batas dipasang di beberapa tingkat sekaligus: minimum penukaran, plafon per
dompet per minggu, plafon harian per dompet untuk imbalan, plafon bulanan untuk
imbalan bernilai besar, dan **plafon global harian** yang berlaku untuk seluruh
pengguna sekaligus.

Plafon global bukan pertahanan terhadap penyalahgunaan identitas, dan tidak
boleh dibaca begitu: kontrak tidak bisa membedakan seribu alamat milik seribu
orang dari seribu milik satu orang — itu pertanyaan identitas, dan identitas
hidup di luar rantai. Yang dilakukannya adalah **membatasi radius kerusakan**
bila kunci penandatangan bocor: kerugian berhenti di satu hari, bukan seluruh
kolam.

Ongkosnya diakui: siapa pun yang menghabiskan plafon global menunda imbalan
semua orang sampai hari berikutnya. Pada skala sekarang, pertukaran itu
menguntungkan.
