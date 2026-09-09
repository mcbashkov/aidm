---
sidebar_position: 1
slug: /
id: ringkasan
title: "Ringkasan eksekutif"
description: "Ringkasan mandiri IDM Reborn — token, empat pilar, dan status jujur tiap bagiannya."
---

import AllocationTable from '@site/src/components/AllocationTable';
import OnChainStat from '@site/src/components/OnChainStat';
import StatusBadge from '@site/src/components/StatusBadge';

# Ringkasan eksekutif

**IDM Reborn** adalah token ekosistem di BNB Chain yang menopang empat produk,
satu di antaranya sudah berjalan dengan pengguna nyata.

Dokumen ini ditulis untuk dibaca dengan curiga. Setiap angka di dalamnya punya
sumber yang bisa Anda periksa sendiri — dari rantai, dari kontrak, atau dari
berkas data yang ikut diterbitkan. Yang belum ada dinyatakan belum ada.

## Apa yang sudah berjalan

| Pilar | Status | Ringkas |
|---|---|---|
| **AIDM** — pencatatan keuangan UMKM | <StatusBadge pillar="aidm" /> | Aplikasi produksi di `ai.idmtoken.com` |
| **SkemGuard** — pemindai keamanan token | <StatusBadge pillar="skemguard" /> | Enam jaringan |
| **IDM Film** — produksi film | <StatusBadge pillar="film" /> | Dua judul tayang di bioskop nasional |
| **IDM Chain** — layer 2 di BNB Chain | <StatusBadge pillar="idmchain" /> | Belum ada spesifikasi teknis |
| Kontrak pintar | <StatusBadge pillar="contracts" /> | Tujuh kontrak, seluruhnya **testnet** |

## Token

Dua token, dua jaringan, dua peran yang sengaja dipisah:

- **IDM Reborn** (BNB Chain) — token nilai ekosistem. Pasokan
  <OnChainStat metric="idmRebornSupply" /> tetap, tanpa fungsi cetak.
- **IDMX** (opBNB) — poin imbalan aktivitas di dalam aplikasi. Pasokan
  <OnChainStat metric="idmxSupply" />.

IDMX ditukar ke IDM Reborn lewat gerbang yang membakar IDMX-nya. Kolam
penukaran berisi <OnChainStat metric="swapClaimPool" suffix=" IDM" />,
terkunci di dalam kontrak.

<AllocationTable />

## Yang perlu Anda ketahui sebelum membaca lebih jauh

- **Seluruh kontrak masih di testnet.** Tidak ada satu pun di mainnet saat
  dokumen ini terbit.
- **Belum ada audit pihak ketiga.** Yang ada pra-audit internal dengan delapan
  temuan, sebagian besar masih terbuka. Rinciannya di bab Kepatuhan & risiko.
- **Peran istimewa masih terpusat.** Satu alamat memegang sebagian besar
  kewenangan kontrak, dan treasury adalah dompet tunggal. Kami tidak mengklaim
  desentralisasi.
- **Token belum diperdagangkan**, sehingga harganya belum terbentuk. Tidak ada
  nilai rupiah yang bisa dijanjikan atas imbalan apa pun.

Empat kalimat di atas bukan disclaimer yang disembunyikan di akhir dokumen. Ia
ada di sini karena pembaca yang mengetahuinya lebih dulu bisa menilai sisanya
dengan tepat.
