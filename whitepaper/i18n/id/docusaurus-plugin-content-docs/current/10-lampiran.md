---
sidebar_position: 11
slug: /lampiran
id: lampiran
title: "Lampiran"
description: "Alamat kontrak, sumber data, dan glosarium."
---

import OnChainStat from '@site/src/components/OnChainStat';

# Lampiran

## Alamat kontrak

> ⚠️ **Seluruh kontrak di bawah berada di TESTNET.** Alamat mainnet akan
> menggantikan bagian ini setelah penerapan, dan versi dokumen ini akan
> dinaikkan bersamanya.

| Kontrak | Jaringan | Peran |
|---|---|---|
| `IDMX` | opBNB testnet | Token imbalan aktivitas |
| `MissionRewards` | opBNB testnet | Membayar imbalan atas kupon bertanda tangan |
| `ReportAttestation` | opBNB testnet | Menyegel sidik jari laporan |
| `SwapInitiator` | opBNB testnet | Membakar IDMX, menerbitkan permintaan tukar |
| `IDMReborn` | BNB Chain testnet | Token nilai ekosistem |
| `SwapClaim` | BNB Chain testnet | Menebus kupon, melepas IDM dari kolam |
| `MigrationVesting` | BNB Chain testnet | Melepas alokasi migrasi sesuai jadwal |

Alamat lengkap, argumen konstruktor, dan setelan kompilasi tiap kontrak
diterbitkan di repositori proyek. Source keenam kontrak inti dan kontrak
vesting migrasi sudah terverifikasi di penjelajah blok.

## Angka on-chain

Seluruh angka berikut dibaca langsung dari rantai saat situs ini dibangun,
lengkap dengan tanggal pembacaannya.

| Metrik | Nilai |
|---|---|
| Pasokan IDM Reborn | <OnChainStat metric="idmRebornSupply" /> |
| Pasokan IDMX | <OnChainStat metric="idmxSupply" /> |
| Token v1 terkunci di alamat mati | <OnChainStat metric="deadBalance" decimals={2} /> |
| Kolam penukaran | <OnChainStat metric="swapClaimPool" /> |
| Kolam imbalan aktivitas | <OnChainStat metric="missionRewardsPool" /> |
| Laporan tersegel | <OnChainStat metric="sealedReports" /> |

Bila sebuah angka membawa penanda "perlu diperbarui", artinya pembacaan
terakhir gagal dan nilai yang ditampilkan berasal dari cache. Kami memilih
menampilkan angka lama yang jujur tentang umurnya daripada menggagalkan
halaman.

## Sumber data

| Berkas | Isi |
|---|---|
| `data/tokenomics.json` | Alokasi, jadwal pelepasan, treasury |
| `data/onchain.cache.json` | Hasil pembacaan rantai terakhir |
| `data/status.json` | Status tiap pilar |
| `data/migration-allocations.csv` | Daftar alokasi migrasi terverifikasi |

## Glosarium

| Istilah | Arti |
|---|---|
| **TGE** | Saat token pertama kali diterbitkan dan mulai dapat beredar |
| **Kolam swap** | Cadangan IDM yang terkunci di kontrak untuk penukaran IDMX |
| **Merkle tree** | Struktur data yang memungkinkan seseorang membuktikan haknya tanpa mengungkap seluruh daftar |
| **Merkle root** | Ringkasan satu nilai dari seluruh daftar; tidak bisa diubah setelah dipasang |
| **Vesting** | Pelepasan token secara bertahap menurut jadwal |
| **Cliff** | Jangka waktu sebelum pelepasan bertahap mulai berjalan |
| **Segel laporan** | Penulisan sidik jari laporan ke rantai; isinya tetap privat |
| **Dompet tertanam** | Dompet yang dibuat otomatis oleh aplikasi, tanpa frasa pemulihan |
| **Burn** | Pemusnahan token; pasokan berkurang dan terlihat di penjelajah blok |
| **Testnet** | Jaringan uji. Token di atasnya tidak punya nilai ekonomi |
