---
sidebar_position: 9
slug: /kepatuhan
id: kepatuhan
title: "Kepatuhan & risiko"
description: "Perlindungan data pribadi, temuan keamanan, dan faktor risiko."
---

import StatusBadge from '@site/src/components/StatusBadge';

# Kepatuhan & risiko

## Perlindungan data pribadi

AIDM menyimpan data keuangan pengguna, dan itu menuntut perlakuan yang jelas.

- **Hak penghapusan diterapkan penuh.** Menghapus akun benar-benar menghapus
  catatan transaksi, laporan, profil usaha, dompet, dan identitas masuk.
- **Yang tidak bisa dihapus dinyatakan terbuka kepada pengguna**, bukan
  disembunyikan: sidik jari laporan yang sudah tersegel tetap ada di
  blockchain, dan catatan pembayaran disimpan ter-anonimkan untuk kewajiban
  pembukuan. Keduanya disampaikan di dalam aplikasi sebelum penghapusan
  dikonfirmasi.
- **Masukan mentah dihapus otomatis** setelah jangka waktu tertentu.
- Dokumen hukum — syarat & ketentuan, kebijakan privasi, kebijakan pengembalian
  dana — dapat dibuka tanpa akun.

## Temuan keamanan

Pra-audit **internal** menghasilkan delapan temuan. Tidak satu pun berasal dari
alat analisis otomatis; seluruhnya dari pemetaan kewenangan. Kodenya rapi —
permukaan risikonya operasional.

| Tingkat | Ringkas |
|---|---|
| Kritis | Pemilik kontrak dapat memindahkan seluruh isi kolam penukaran |
| Tinggi | Kebocoran kunci penandatangan pada dua jalur berbeda |
| Tinggi | Pemilik kontrak dapat menarik seluruh dana kolam imbalan |
| Tinggi | **Sebagian besar peran istimewa dipegang satu alamat** |
| Sedang | Pembakaran tanpa jalur pemulihan on-chain |

Satu temuan tingkat sedang mengenai perhitungan periode plafon sudah
diperbaiki dan diuji ulang. Sisanya **masih terbuka**, dan penyelesaiannya
adalah prasyarat penerapan mainnet.

**Kontrak vesting migrasi belum dianalisis sama sekali** — ia ditulis setelah
pra-audit selesai. Jumlah temuan akan bertambah.

## Faktor risiko

Dinyatakan langsung, bukan diperhalus.

1. **Seluruh kontrak masih di testnet.** <StatusBadge pillar="contracts" />
   Perilaku di mainnet belum pernah diuji dengan nilai sungguhan.
2. **Belum ada audit pihak ketiga.**
3. **Kewenangan terpusat.** Satu alamat memegang sebagian besar peran istimewa,
   dan treasury adalah dompet tunggal. Kompromi pada kunci itu berdampak luas.
4. **Token belum diperdagangkan.** Tidak ada harga, tidak ada likuiditas, dan
   tidak ada jaminan keduanya akan terbentuk.
5. **Ketergantungan pada pihak ketiga** — penyedia dompet, penyedia jaringan,
   penyedia model bahasa, dan gerbang pembayaran. Gangguan pada salah satunya
   berdampak pada layanan.
6. **Regulasi aset kripto di Indonesia berada dalam pengawasan OJK** dan dapat
   berubah. Perubahan aturan dapat memengaruhi rencana yang tertulis di
   dokumen ini.
7. **Satu alokasi migrasi belum punya alamat penerima**, sehingga daftar
   alokasi belum final.
8. **Dokumen ini masih draf.** Seluruh angka, alamat, dan jadwal dapat berubah
   hingga penerapan mainnet.

## Disclaimer

Dokumen ini bersifat informatif. Ia bukan penawaran, ajakan membeli, maupun
nasihat keuangan, hukum, atau pajak. Kepemilikan token tidak memberi hak atas
pendapatan, laba, maupun distribusi apa pun dari perusahaan. Pembaca yang
mempertimbangkan keterlibatan sebaiknya melakukan penilaian sendiri dan mencari
nasihat profesional yang sesuai dengan yurisdiksinya.
