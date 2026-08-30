# Laporan Pra-Audit Keamanan — Ekosistem IDM

**PT IDM FILM SEJAHTERA**
**Tanggal:** 31 Agustus 2026
**Commit yang diaudit:** `31857946a18d997b61960ce9422484e82064a8a6`
**Status dokumen:** HIDUP — disusun bertahap dalam 4 fase. Fase 1 dan analisis
otomatis (Slither) selesai; Fase 2–4 menyusul dan akan ditambahkan ke dokumen
yang sama.

---

## 0. Ringkasan Eksekutif

### 0.1 Ruang lingkup

Enam kontrak Solidity `0.8.26`, tanpa dependensi eksternal (tidak ada
OpenZeppelin), tersebar di dua chain:

| Kontrak | Chain (testnet saat ini) |
|---|---|
| `IDMX.sol` | opBNB Testnet (chainId 5611) |
| `MissionRewards.sol` | opBNB Testnet (chainId 5611) |
| `ReportAttestation.sol` | opBNB Testnet (chainId 5611) |
| `SwapInitiator.sol` | opBNB Testnet (chainId 5611) |
| `IDMReborn.sol` | BSC Testnet (chainId 97) |
| `SwapClaim.sol` | BSC Testnet (chainId 97) |

Di luar lingkup: seluruh kode aplikasi (`app/`, `lib/`, `components/`),
backend Supabase, dan skrip deployment. Skrip deployment dibaca hanya untuk
mengambil nilai parameter konstruktor, bukan untuk diaudit.

### 0.2 Ringkasan temuan per severity

Status sampai akhir Fase 1 + analisis otomatis.

| Severity | Jumlah | ID |
|---|---|---|
| Critical | 1 | F-01 |
| High | 4 | F-02, F-03, F-04, F-08 |
| Medium | 2 | F-05, F-06 |
| Low | 0 | — |
| Informational | 1 | F-07 |
| **Total** | **8** | |

Catatan penting tentang angka ini: **nol** dari delapan temuan berasal dari
Slither. Slither tidak menemukan satu pun masalah nyata (rincian dan alasan
di §4). Kedelapan temuan berasal dari pemetaan hak istimewa di Fase 1 dan
dari pemeriksaan konfigurasi on-chain (§1.3) — yaitu dari pertanyaan "apa
yang bisa dilakukan pemegang kunci", bukan dari pola kode yang salah. Ini konsisten dengan gaya kontraknya: kodenya rapi dan
konservatif; permukaan risikonya ada pada kepercayaan operasional, bukan
pada bug implementasi.

Fase 2 (sapuan kelas kerentanan), Fase 3 (invarian ekonomi), dan Fase 4
(kesiapan operasional) belum dijalankan. Angka di atas **akan bertambah**.

### 0.3 Status perbaikan

Semua temuan berstatus **Terbuka**. Belum ada baris kode yang diubah — fase
ini sengaja baca-saja, agar auditor pihak ketiga menerima kode dalam keadaan
yang sama seperti yang dianalisis di sini.

### 0.4 Metodologi & alat

| Tahap | Alat / metode | Status |
|---|---|---|
| Analisis statik otomatis | Slither 0.11.5, solc 0.8.26 (biner statis resmi), 101 detektor | ✅ Selesai |
| Pencocokan bytecode on-chain ↔ kode sumber | Kompilasi ulang + `eth_getCode`, dengan masking slot `immutableReferences` | ✅ Selesai (§1.2) |
| Pemeriksaan konfigurasi on-chain | `eth_call` atas peran istimewa, parameter, dan saldo | ✅ Selesai (§1.3) |
| Rekonstruksi arsitektur & alur nilai | Pembacaan manual baris-per-baris | ✅ Selesai (Fase 1) |
| Model ancaman & peta hak istimewa | Pembacaan manual, berbantuan AI | ✅ Selesai (Fase 1) |
| Sapuan kelas kerentanan | Manual, checklist SWC/SCSVS | ⬜ Fase 2 |
| Invarian ekonomi | Manual + perhitungan | ⬜ Fase 3 |
| Kesiapan operasional | Manual | ⬜ Fase 4 |
| Fuzzing / symbolic execution (Echidna, Medusa, Halmos) | — | ❌ Tidak dijalankan |
| Verifikasi formal | — | ❌ Tidak dijalankan |
| Uji integrasi on-chain (fork testing) | — | ❌ Tidak dijalankan |

### 0.5 PERNYATAAN JUJUR

> Dokumen ini adalah **pra-audit internal**, disusun oleh tim internal
> PT IDM Film Sejahtera dengan bantuan model AI (Claude) dan alat analisis
> statik otomatis (Slither).
>
> **Ini BUKAN audit keamanan independen.** Tidak ada pihak ketiga yang
> memeriksa temuan di sini. Penyusunnya bukan pihak yang independen dari
> pengembang kontrak. Tidak ada jaminan kelengkapan: kelas kerentanan yang
> tidak terpikirkan oleh penyusun tidak akan muncul di dokumen ini.
>
> Tujuan dokumen ini adalah **mempersiapkan audit pihak ketiga** — memetakan
> sistem, membersihkan temuan yang jelas lebih dulu, dan memberi auditor titik
> awal yang terdokumentasi. Dokumen ini tidak boleh dipakai, dikutip, atau
> dipasarkan sebagai bukti bahwa kontrak-kontrak ini telah diaudit.
>
> Di beberapa tempat dokumen ini menuliskan **TIDAK YAKIN** secara eksplisit.
> Itu disengaja: batas pengetahuan penyusun ditandai, bukan ditutupi.

---

## 1. Ruang Lingkup & Informasi Kontrak

**Commit yang dianalisis:** `31857946a18d997b61960ce9422484e82064a8a6`
(branch `main`, pohon kerja bersih pada saat analisis).

Semua nomor baris di seluruh dokumen ini merujuk ke commit tersebut.

| Kontrak | Chain | Alamat (testnet) | Solidity | Baris (total / tanpa banner) | Verifikasi source | Dependensi |
|---|---|---|---|---|---|---|
| `IDMX.sol` | opBNB Testnet (5611) | `0xccf9551396cb559e5c2caa1006485d051b7cf09a` | `0.8.26` (pinned) | 145 / 122 | ✅ bytecode cocok · explorer ⬜ | Tidak ada |
| `MissionRewards.sol` | opBNB Testnet (5611) | `0xbc6f412024cee7e8117bd1ee35759d027fce11e5` | `0.8.26` (pinned) | 287 / 264 | ✅ bytecode cocok · explorer ⬜ | Tidak ada |
| `ReportAttestation.sol` | opBNB Testnet (5611) | `0xa83c201c3759fa1a92bd17dbebb46b85029a84c4` | `0.8.26` (pinned) | 180 / 157 | ✅ bytecode cocok · explorer ⬜ | Tidak ada |
| `SwapInitiator.sol` | opBNB Testnet (5611) | `0xa4f00039540dfdd040635a17090bf4e797168b63` | `0.8.26` (pinned) | 253 / 230 | ✅ bytecode cocok · explorer ⬜ | Tidak ada |
| `IDMReborn.sol` | BSC Testnet (97) | `0x78c7e68142e7e1b564c0fd342954aa515a3d2f5b` | `0.8.26` (pinned) | 158 / 135 | ✅ bytecode cocok · explorer ⬜ | Tidak ada |
| `SwapClaim.sol` | BSC Testnet (97) | `0xccf9551396cb559e5c2caa1006485d051b7cf09a` | `0.8.26` (pinned) | 287 / 264 | ✅ bytecode cocok · explorer ⬜ | Tidak ada |
| | | | | **1.310 / 1.172** | | |

**"Tanpa banner"** = dikurangi 23 baris header ASCII-art + tautan kanal resmi
yang identik di keenam berkas (baris 1–23 setiap berkas).

**Semua alamat di atas adalah testnet.** Belum ada deployment mainnet.

**Verifikasi source di explorer masih ⬜.** Publikasi source ke
opbnb-testnet.bscscan.com dan testnet.bscscan.com belum dilakukan. Namun
kesetaraan kode sumber dengan bytecode on-chain **sudah dibuktikan secara
independen** di §1.2 — bukti yang secara teknis lebih kuat daripada badge
verifikasi explorer, karena tidak bergantung pada pihak ketiga mana pun.
Verifikasi explorer tetap perlu dilakukan demi transparansi publik dan karena
bursa mensyaratkannya.

**Tabrakan alamat — TERJAWAB, bukan kesalahan konfigurasi.** `IDMX` (opBNB
Testnet) dan `SwapClaim` (BSC Testnet) memang berbagi alamat yang sama persis
(`0xccf955…f09a`). Pembacaan `eth_getCode` mengonfirmasi bahwa di alamat itu
terdapat **kode yang berbeda di dua chain**: 1.629 byte (IDMX) di opBNB
Testnet dan 3.659 byte (SwapClaim) di BSC Testnet, masing-masing cocok dengan
kode sumbernya sendiri. Ini tabrakan `CREATE` yang wajar — deployer dan nonce
yang sama menghasilkan alamat yang sama di dua chain — bukan salah salin.

### 1.1 Parameter deployment (testnet saat ini)

Diambil dari skrip deployment, bukan dari kode kontrak. Auditor harus
memverifikasi nilai on-chain yang sebenarnya.

| Parameter | Kontrak | Nilai testnet | Sumber |
|---|---|---|---|
| Pasokan IDMX | `IDMX` | 50.000.000.000 IDMX | `scripts/deploy-rewards.mjs:46` |
| Float reward awal | `MissionRewards` | 100.000.000 IDMX | `scripts/deploy-rewards.mjs:50` |
| `caps[0]` (harian) | `MissionRewards` | 250 IDMX | `scripts/deploy-rewards.mjs:51` |
| `caps[1]` ("bulanan") | `MissionRewards` | 450 IDMX | `scripts/deploy-rewards.mjs:54` |
| `INITIAL_SUPPLY` | `IDMReborn` | 1.000.000.000 IDM | `IDMReborn.sol:55` (konstanta) |
| Kolam swap | `SwapClaim` | 150.000.000 IDM | `scripts/fund-swap-pool.mjs:51` |
| `rateIdmxPerIdm` awal | `SwapClaim` | 50 | `SwapClaim.sol:138` (hardcoded) |
| `FEE_IDM` | `SwapClaim` | 1 IDM | `SwapClaim.sol:88` (konstanta) |
| `maxIdmxPerVoucher` | `SwapClaim` | 2.000 IDMX | `scripts/deploy-swap-bsc.mjs:18` |
| `MIN_SWAP` | `SwapInitiator` | 500 IDMX | `SwapInitiator.sol:61` (konstanta) |
| `weeklyCap` | `SwapInitiator` | 2.000 IDMX | `scripts/deploy-swap-opbnb.mjs:51` |
| `globalThreshold` | `SwapInitiator` | 100.000 IDMX | `scripts/deploy-swap-opbnb.mjs:68` |
| `lifetimeCap` | `SwapInitiator` | 200.000 IDMX | `scripts/deploy-swap-opbnb.mjs:69` |

Untuk mainnet, `globalThreshold` dan `lifetimeCap` wajib diisi dari env dan
skrip menolak berjalan tanpa keduanya (`scripts/deploy-swap-opbnb.mjs:56-63`).

---

### 1.2 Pembuktian kesetaraan bytecode on-chain ↔ kode sumber

Pertanyaan pertama setiap auditor adalah: *apakah kode yang saya baca memang
kode yang berjalan di chain?* Pertanyaan itu dijawab langsung, tanpa
bergantung pada explorer.

**Metode.** Setiap berkas dikompilasi ulang dengan solc `0.8.26` dan setelan
yang identik dengan skrip deploy (optimizer aktif, 200 runs, `evmVersion`
dibiarkan default), lalu `evm.deployedBytecode` dibandingkan dengan hasil
`eth_getCode` pada alamat yang bersangkutan.

Perbandingan mentah menunjukkan tiga kontrak "tidak cocok" **dengan panjang
byte yang persis sama** — tanda khas placeholder `immutable`, yang baru diisi
saat konstruksi dan karena itu tidak ada dalam hasil kompilasi lokal.
Hipotesis ini diuji, bukan diasumsikan: seluruh slot pada
`evm.deployedBytecode.immutableReferences` dinolkan di kedua sisi, lalu
perbandingan diulang.

**Hasil — keenam kontrak cocok.**

| Kontrak | Badan kode (slot immutable di-mask) | Metadata CBOR | Slot immutable |
|---|---|---|---|
| `IDMX` | ✅ identik | ✅ identik | 0 |
| `IDMReborn` | ✅ identik | ✅ identik | 0 |
| `MissionRewards` | ✅ identik | ✅ identik | 5 |
| `SwapInitiator` | ✅ identik | ✅ identik | 2 |
| `SwapClaim` | ✅ identik | ✅ identik | 6 |
| `ReportAttestation` | ✅ identik | 🟡 berbeda | 0 |

**Nilai `immutable` yang terbaca dari bytecode on-chain**, dan karena itu tidak
dapat diubah oleh siapa pun setelah deployment:

| Kontrak | Field | Nilai on-chain | Seharusnya | |
|---|---|---|---|---|
| `MissionRewards` | `token` | `0xccf9551396cb559e5c2caa1006485d051b7cf09a` | alamat `IDMX` | ✅ |
| `SwapInitiator` | `idmx` | `0xccf9551396cb559e5c2caa1006485d051b7cf09a` | alamat `IDMX` | ✅ |
| `SwapClaim` | `idm` | `0x78c7e68142e7e1b564c0fd342954aa515a3d2f5b` | alamat `IDMReborn` | ✅ |

Ini **menutup asumsi kepercayaan A-6** (§3.3): alamat token yang dipakai
ketiga kontrak bukan lagi sesuatu yang harus dipercaya, melainkan fakta yang
sudah diverifikasi dari bytecode. Konsekuensinya, dasar penilaian "positif
palsu" untuk temuan `reentrancy-events` Slither (§4.3.2) kini berpijak pada
bukti, bukan pada asumsi deployment.

**`domainSeparator` EIP-712 terikat chainId yang benar.** Kedua nilai
`domainSeparator` yang tertanam di bytecode dihitung ulang secara independen
dan cocok persis:

| Kontrak | chainId | `domainSeparator` | |
|---|---|---|---|
| `MissionRewards` | 5611 (opBNB Testnet) | `0x8315ddac…24fd5` | ✅ |
| `SwapClaim` | 97 (BSC Testnet) | `0x642dfa82…da463` | ✅ |

Karena chainId dan `address(this)` ikut masuk ke dalam `domainSeparator`,
voucher yang sah di satu chain secara matematis tidak dapat dipakai ulang di
chain lain maupun di kontrak lain. Perlindungan replay lintas chain
**terbukti bekerja**, bukan sekadar terlihat benar di kode.

**Satu catatan — metadata `ReportAttestation` berbeda.** Badan kodenya identik,
sehingga perilakunya dijamin sama; yang berbeda hanya hash IPFS metadata di
ekor bytecode. Hash itu mencakup teks sumber **persis**, termasuk komentar dan
spasi. Kedua versi yang ada di riwayat git (`c2bf2c5` dan `99a6136`) diuji dan
**tidak ada yang menghasilkan hash metadata on-chain**. Kesimpulan yang jujur:
kontrak ini di-deploy dari teks sumber antara yang tidak pernah di-commit —
kemungkinan besar hanya berbeda pada komentar, karena bytecode fungsionalnya
identik. **TIDAK YAKIN** teks persisnya seperti apa; teks itu tampaknya sudah
tidak ada. Dampak praktisnya terbatas: verifikasi explorer untuk kontrak ini
mungkin menghasilkan *similar match* alih-alih *exact match*.

Catatan reproduksibilitas terkait: `package.json:50` menyematkan `solc` sebagai
`^0.8.26`. Tanda caret memungkinkan `pnpm install` di kemudian hari menarik
minor version yang lebih baru — dan memang `solc@0.8.36` sudah ikut terpasang
di `node_modules`. Kompilasi ulang di masa depan karena itu tidak dijamin
menghasilkan bytecode yang sama dengan yang sekarang ada on-chain, kecuali
versinya dipatok persis.

### 1.3 Konfigurasi on-chain terverifikasi (testnet)

Dibaca langsung lewat `eth_call`. Ini basis fakta untuk §3.2.

**Peran istimewa:**

| Peran | Alamat |
|---|---|
| `owner` `MissionRewards` | `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3` |
| `owner` `ReportAttestation` | `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3` |
| `owner` `SwapInitiator` | `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3` |
| `owner` `SwapClaim` | `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3` |
| `voucherSigner` `MissionRewards` | `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3` |
| `relayer` `ReportAttestation` | `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3` |
| `swapSigner` `SwapClaim` | `0xbc2bfb1a2765700b846abad68328b15093763c97` |
| `owner` `IDMX` / `IDMReborn` | — tidak ada, sesuai desain ✅ |

**Enam dari tujuh peran dipegang satu alamat yang sama.** Lihat temuan
**F-08 (High)**. `pendingOwner` keempat kontrak bernilai `address(0)`, jadi
tidak ada perpindahan kepemilikan yang sedang menunggu — kepemilikan belum
dipindahkan ke multisig mana pun.

**Parameter — tidak ada drift dari nilai deploy:**

| Kontrak | Parameter | On-chain | Nilai deploy | |
|---|---|---|---|---|
| `MissionRewards` | `caps[0]` | 250 IDMX | 250 | ✅ |
| `MissionRewards` | `caps[1]` | 450 IDMX | 450 | ✅ |
| `SwapInitiator` | `weeklyCap` | 2.000 IDMX | 2.000 | ✅ |
| `SwapInitiator` | `globalThreshold` | 100.000 IDMX | 100.000 | ✅ |
| `SwapInitiator` | `lifetimeCap` | 200.000 IDMX | 200.000 | ✅ |
| `SwapClaim` | `rateIdmxPerIdm` | 50 | 50 | ✅ |
| `SwapClaim` | `maxIdmxPerVoucher` | 2.000 IDMX | 2.000 | ✅ |

**Suplai, kolam, dan aktivitas:**

| Item | Nilai |
|---|---|
| `IDMX.totalSupply` | 50.000.000.000 IDMX (utuh, belum ada burn) |
| `IDMReborn.totalSupply` | 1.000.000.000 IDM (utuh) |
| Kolam IDM di `SwapClaim` | 150.000.000 IDM |
| Float IDMX di `MissionRewards` | 99.999.340 IDMX (≈660 IDMX sudah diklaim) |
| `SwapInitiator.totalBurned` | 0 IDMX |
| `SwapInitiator.nonceCounter` | 0 |
| `paused` (keempat kontrak) | semuanya aktif, tidak ada yang ter-pause |

`totalBurned` dan `nonceCounter` yang masih nol berarti **belum ada satu pun
swap lintas chain yang dieksekusi** di testnet. Jalur yang memikul risiko
tertinggi dalam sistem ini karena itu belum pernah dilalui transaksi nyata —
konteks yang perlu diketahui auditor saat menilai kematangan operasional
(Fase 4).

---

## 2. Arsitektur Sistem — Fase 1

### 2.1 Dua chain, dua token, satu jembatan bertanda tangan

Sistem ini **bukan** bridge kriptografis. Tidak ada light client, tidak ada
bukti Merkle, tidak ada pembacaan state lintas chain. Yang menghubungkan kedua
chain adalah **satu relayer off-chain yang menandatangani voucher EIP-712**.
Ini fakta arsitektural paling penting dalam dokumen ini, dan semua yang ada di
§3 mengalir darinya.

### 2.2 Diagram alur nilai

```
╔══════════════════════════════════════════════════════════════════════════╗
║  opBNB (chainId 5611 testnet / 204 mainnet)                              ║
╚══════════════════════════════════════════════════════════════════════════╝

  [Deployer]
      │ constructor IDMX(treasury, 50e9)          IDMX.sol:63-68
      ▼
  ┌──────────────────────────────────────────┐
  │ IDMX  (50 miliar, TANPA fungsi mint)     │
  │ pasokan hanya bisa TURUN                 │  IDMX.sol:43-145
  └──────────────────────────────────────────┘
      │ transfer biasa (dari treasury)
      │ 100 juta IDMX sebagai float
      ▼
  ┌──────────────────────────────────────────┐
  │ MissionRewards (memegang float IDMX)     │  MissionRewards.sol:58-287
  └──────────────────────────────────────────┘
      │
      │  ┌─ voucher EIP-712 ditandatangani `voucherSigner` (SERVER KAMI)
      │  │  MissionRewards.sol:83, 240
      │  ▼
      │ claim(v, sig) — siapa pun boleh submit,          :234-260
      │ penerima SELALU v.user, bukan pengirim tx        :258
      ▼
  ┌──────────────────────────────────────────┐
  │  DOMPET USER  (saldo IDMX)               │
  └──────────────────────────────────────────┘
      │ approve(SwapInitiator, n)                 IDMX.sol:75-79
      │ swap(n)  ← tx dikirim USER sendiri        SwapInitiator.sol:214-252
      ▼
  ┌──────────────────────────────────────────┐
  │ SwapInitiator — SATU-SATUNYA pintu keluar│  SwapInitiator.sol:51-253
  │  gerbang SEBELUM burn:                   │
  │   · paused                        :215   │
  │   · MIN_SWAP 500 IDMX             :216   │
  │   · weeklyCap per dompet          :220   │
  │   · lifetimeCap global            :225   │
  │   · circuit breaker (auto-pause)  :243   │
  └──────────────────────────────────────────┘
      │ idmx.burnFrom(user, n)   → IDMX MUSNAH  :250  (IDMX.sol:124-133)
      │ emit SwapRequested(user, n, nonce, ts)  :251
      ▼
  ══════════════ ⚠️ BATAS KEPERCAYAAN — TIDAK ADA JAMINAN ON-CHAIN ═══════════
      │
      │   RELAYER OFF-CHAIN (server kami, lib/swap/relayer-server.ts)
      │   · mengamati event SwapRequested
      │   · menandatangani SwapVoucher{user, idmxBurned, nonce, deadline}
      │   · TIDAK ADA MEKANISME ON-CHAIN yang memaksanya menandatangani
      │   · TIDAK ADA BUKTI ON-CHAIN bahwa burn benar-benar terjadi
      │
      ══════════════════════════════════════════════════════════════════════
      ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  BNB Smart Chain (chainId 97 testnet / 56 mainnet)                       ║
╚══════════════════════════════════════════════════════════════════════════╝

  [Deployer]
      │ constructor IDMReborn(treasury) → 1 miliar IDM   IDMReborn.sol:76-81
      ▼
  ┌──────────────────────────────────────────┐
  │ IDMReborn — TANPA owner, TANPA privilege │  IDMReborn.sol:48-158
  │ tanpa mint / pause / blacklist / fee     │
  └──────────────────────────────────────────┘
      │ transfer biasa dari treasury: 150 juta IDM
      ▼
  ┌──────────────────────────────────────────┐
  │ SwapClaim — memegang KOLAM 150 juta IDM  │  SwapClaim.sol:59-287
  │  gerbang:                                │
  │   · paused                        :227   │
  │   · deadline voucher              :228   │
  │   · nonce sekali pakai (global)   :229   │
  │   · tanda tangan == swapSigner    :230   │
  │   · maxIdmxPerVoucher             :235   │
  └──────────────────────────────────────────┘
      │ gross = idmxBurned / rateIdmxPerIdm             :239
      │ net   = gross − 1 IDM                           :244
      │ idm.burn(1 IDM)  → benar-benar dibakar          :252
      │ idm.transfer(v.user, net)                       :258
      ▼
  ┌──────────────────────────────────────────┐
  │  DOMPET USER  (saldo IDM Reborn)         │
  └──────────────────────────────────────────┘
      │ setelah ini: ERC-20 biasa, keluar ke DEX/CEX
      ▼
   (di luar sistem)


  ── Jalur terpisah, tidak menyentuh nilai ──────────────────────────────────
  ReportAttestation (opBNB)                     ReportAttestation.sol:49-180
   · menyimpan HANYA bytes32 hash + uint64 timestamp
   · TIDAK memegang token apa pun
   · TIDAK ada fungsi transfer / withdraw / payable
```

### 2.3 Ke mana nilai bisa keluar dari sistem

Ada **empat** pintu keluar nilai, dan hanya empat:

| # | Pintu | Lokasi | Siapa yang membuka |
|---|---|---|---|
| 1 | `MissionRewards.claim` → float IDMX ke user | `MissionRewards.sol:258` | Siapa pun yang memegang voucher sah dari `voucherSigner` |
| 2 | `MissionRewards.sweep` → float IDMX ke mana pun | `MissionRewards.sol:177-180` | **owner** `MissionRewards` |
| 3 | `SwapClaim.claim` → kolam IDM ke user | `SwapClaim.sol:258` | Siapa pun yang memegang voucher sah dari `swapSigner` |
| 4 | `SwapClaim.sweep` → kolam IDM ke mana pun | `SwapClaim.sol:190-193` | **owner** `SwapClaim` |

`IDMX`, `IDMReborn`, `SwapInitiator`, dan `ReportAttestation` **tidak memiliki
pintu keluar nilai sama sekali**. `SwapInitiator` hanya memusnahkan; ia tidak
pernah memegang token (`burnFrom` menarik langsung dari dompet user,
`SwapInitiator.sol:250`).

### 2.4 Observasi arsitektural (bukan temuan — untuk konteks auditor)

1. **Tidak ada dependensi eksternal.** Keenam kontrak berdiri sendiri; tidak
   ada `import` sama sekali. Konsekuensinya: tidak ada risiko rantai pasok
   pustaka, tetapi juga tidak ada manfaat dari kode OpenZeppelin yang sudah
   teruji berat — setiap pola (two-step ownable, pausable, EIP-712,
   pemulihan tanda tangan) ditulis ulang dari nol dan harus diaudit dari nol.
   Ini pilihan sadar yang didokumentasikan di komentar kontrak
   (`IDMX.sol:29-31`, `ReportAttestation.sol:42-44`).

2. **Pragma dikunci ketat.** `pragma solidity 0.8.26;` tanpa `^` di keenam
   berkas — output kompilasi deterministik. Praktik yang baik.

3. **Tidak ada proxy, tidak ada upgradeability.** Keenam kontrak tidak dapat
   di-upgrade. Migrasi dilakukan lewat `sweep` + deploy kontrak baru.

4. **`IDMReborn` benar-benar tanpa owner.** Diverifikasi baris per baris:
   tidak ada variabel `owner`, tidak ada modifier, tidak ada fungsi
   administratif apa pun di `IDMReborn.sol:48-158`. Klaim di komentar
   (`IDMReborn.sol:33-38`) sesuai dengan kode. Ini poin kuat untuk listing CEX.

5. **`IDMX` juga tanpa owner.** Sama: `IDMX.sol:43-145` tidak memiliki fungsi
   administratif. Cap pasokan ditegakkan oleh ketiadaan fungsi `mint`, bukan
   oleh pemeriksaan runtime.

---

## 3. Model Ancaman — Fase 1

### 3.1 Inventaris LENGKAP fungsi pengubah state

Seluruh fungsi non-`view`/non-`pure` di keenam kontrak, tanpa kecuali.
Fungsi `view`/`pure` sengaja tidak dimasukkan karena tidak mengubah state.

#### `IDMX.sol` (opBNB) — 5 fungsi pengubah state

| Fungsi | Baris | Siapa boleh panggil | Apa yang berubah |
|---|---|---|---|
| `constructor` | 63-68 | Deployer, sekali | `totalSupply`, `balanceOf[treasury]` |
| `transfer` | 70-73 | Siapa pun | `balanceOf[from]`, `balanceOf[to]` |
| `approve` | 75-79 | Siapa pun | `allowance[msg.sender][spender]` |
| `transferFrom` | 81-97 | Siapa pun dengan allowance | `allowance`, `balanceOf` ×2 |
| `burn` | 117-119 | Siapa pun (atas saldo sendiri) | `balanceOf[msg.sender]`, `totalSupply` ↓ |
| `burnFrom` | 124-133 | Siapa pun dengan allowance | `allowance`, `balanceOf[from]`, `totalSupply` ↓ |

Tidak ada fungsi `onlyOwner`. Tidak ada `mint`.

#### `IDMReborn.sol` (BSC) — 5 fungsi pengubah state

| Fungsi | Baris | Siapa boleh panggil | Apa yang berubah |
|---|---|---|---|
| `constructor` | 76-81 | Deployer, sekali | `totalSupply = 1e9`, `balanceOf[treasury]` |
| `transfer` | 83-86 | Siapa pun | `balanceOf` ×2 |
| `approve` | 88-92 | Siapa pun | `allowance[msg.sender][spender]` |
| `transferFrom` | 94-110 | Siapa pun dengan allowance | `allowance`, `balanceOf` ×2 |
| `burn` | 130-132 | Siapa pun (atas saldo sendiri) | `balanceOf`, `totalSupply` ↓ |
| `burnFrom` | 137-146 | Siapa pun dengan allowance | `allowance`, `balanceOf`, `totalSupply` ↓ |

Tidak ada fungsi `onlyOwner`. Tidak ada `mint`. Tidak ada pajak transfer.

#### `MissionRewards.sol` (opBNB) — 7 fungsi pengubah state

| Fungsi | Baris | Siapa boleh panggil | Apa yang berubah |
|---|---|---|---|
| `constructor` | 124-154 | Deployer, sekali | `owner`, `voucherSigner`, `caps[0]`, `caps[1]`, `domainSeparator` (immutable) |
| `setVoucherSigner` | 158-162 | **owner** | `voucherSigner` — mengganti kunci yang memvalidasi SEMUA voucher |
| `setCap` | 164-168 | **owner** | `caps[bucket]` — naik atau turun, tanpa batas atas |
| `setPaused` | 170-173 | **owner** | `paused` |
| `sweep` | 177-180 | **owner** | **Memindahkan token IDMX ke alamat mana pun, jumlah bebas** |
| `transferOwnership` | 182-185 | **owner** | `pendingOwner` |
| `acceptOwnership` | 187-192 | Hanya `pendingOwner` | `owner`, `pendingOwner` |
| `claim` | 234-260 | **Siapa pun** dengan voucher bertanda tangan `voucherSigner` | `nonceUsed[user][nonce]`, `claimedOnDay[user][bucket][day]`, transfer IDMX ke `v.user` |

#### `ReportAttestation.sol` (opBNB) — 6 fungsi pengubah state

| Fungsi | Baris | Siapa boleh panggil | Apa yang berubah |
|---|---|---|---|
| `constructor` | 97-102 | Deployer, sekali | `owner`, `relayer` |
| `setRelayer` | 106-110 | **owner** | `relayer` |
| `setPaused` | 112-115 | **owner** | `paused` |
| `transferOwnership` | 119-122 | **owner** | `pendingOwner` |
| `acceptOwnership` | 124-129 | Hanya `pendingOwner` | `owner`, `pendingOwner` |
| `attest` | 135-140 | **Siapa pun** (untuk dirinya sendiri) | `seals[msg.sender][periodKey]` |
| `attestFor` | 146-153 | Hanya **relayer** | `seals[user][periodKey]` — untuk user mana pun |

Kontrak ini tidak memegang dan tidak memindahkan token apa pun. Tidak ada
fungsi `payable`, tidak ada `withdraw`, tidak ada `selfdestruct`.

#### `SwapInitiator.sol` (opBNB) — 7 fungsi pengubah state

| Fungsi | Baris | Siapa boleh panggil | Apa yang berubah |
|---|---|---|---|
| `constructor` | 124-139 | Deployer, sekali | `owner`, `idmx` (immutable), `weeklyCap`, `globalThreshold`, `lifetimeCap` |
| `setWeeklyCap` | 148-151 | **owner** | `weeklyCap` |
| `setGlobalThreshold` | 153-156 | **owner** | `globalThreshold` |
| `setLifetimeCap` | 167-170 | **owner** | `lifetimeCap` — bisa naik maupun turun |
| `setPaused` | 173-176 | **owner** | `paused` (termasuk un-pause setelah breaker trip) |
| `transferOwnership` | 178-181 | **owner** | `pendingOwner` |
| `acceptOwnership` | 183-188 | Hanya `pendingOwner` | `owner`, `pendingOwner` |
| `swap` | 214-252 | **Siapa pun** (untuk dirinya sendiri) | `usedThisWeek`, `weeklyTotal`, `totalBurned`, `nonceCounter`, mungkin `paused`, dan **memusnahkan IDMX user** |

Tidak ada `sweep` — kontrak ini memang tidak pernah memegang token.

#### `SwapClaim.sol` (BSC) — 8 fungsi pengubah state

| Fungsi | Baris | Siapa boleh panggil | Apa yang berubah |
|---|---|---|---|
| `constructor` | 133-156 | Deployer, sekali | `owner`, `idm` (immutable), `swapSigner`, `rateIdmxPerIdm = 50`, `maxIdmxPerVoucher`, `domainSeparator` |
| `setRate` | 163-167 | **owner** | `rateIdmxPerIdm` — **hanya boleh TURUN** (ratchet, ditegakkan di :164) |
| `setSwapSigner` | 169-173 | **owner** | `swapSigner` — mengganti kunci yang memvalidasi SEMUA voucher |
| `setMaxIdmxPerVoucher` | 179-182 | **owner** | `maxIdmxPerVoucher` — naik atau turun, tanpa batas atas |
| `setPaused` | 184-187 | **owner** | `paused` |
| `sweep` | 190-193 | **owner** | **Memindahkan IDM kolam ke alamat mana pun, jumlah bebas** |
| `transferOwnership` | 195-198 | **owner** | `pendingOwner` |
| `acceptOwnership` | 200-205 | Hanya `pendingOwner` | `owner`, `pendingOwner` |
| `claim` | 226-260 | **Siapa pun** dengan voucher bertanda tangan `swapSigner` | `nonceUsed[nonce]`, burn 1 IDM, transfer IDM ke `v.user` |

**Total: 38 fungsi pengubah state di enam kontrak.**

### 3.2 Peta hak istimewa

Sistem ini memiliki **lima** peran istimewa. Berikut masing-masing, beserta
kerusakan maksimum bila kuncinya bocor.

---

#### Peran 1 — `owner` dari `SwapClaim` (BSC)

**Bisa melakukan:** `setRate` (hanya menurunkan), `setSwapSigner`,
`setMaxIdmxPerVoucher` (tanpa batas), `setPaused`, `sweep`,
`transferOwnership`. (`SwapClaim.sol:163-205`)

**Kerusakan maksimum bila kunci bocor:**
**Seluruh kolam 150.000.000 IDM hilang dalam SATU transaksi**, lewat
`sweep(attacker, 150_000_000e18)` (`SwapClaim.sol:190-193`). Tidak ada
timelock, tidak ada batas jumlah, tidak ada tujuan yang dibatasi.
Setelah itu setiap voucher yang sah — termasuk voucher untuk IDMX yang
**sudah dibakar dan tidak bisa dikembalikan** — akan gagal karena kolam kosong.

**Apakah bisa mengambil dana user?** ⚠️ **YA.** Lihat temuan **F-01
(Critical)**.

Nuansa yang harus dibaca auditor: 150 juta IDM di `SwapClaim` bukan deposit
kustodian milik user — itu kolam milik penerbit. Tetapi user yang sudah
membakar IDMX-nya memiliki klaim yang tidak dapat dibatalkan atas kolam itu.
Menguras kolam berarti menghapus klaim tersebut secara sepihak. Menurut
kriteria yang dipakai bursa ("apakah ada kunci yang bisa mengambil dana yang
menjadi hak user"), ini masuk kategori Critical.

---

#### Peran 2 — `owner` dari `MissionRewards` (opBNB)

**Bisa melakukan:** `setVoucherSigner`, `setCap` (naik/turun tanpa batas),
`setPaused`, `sweep`, `transferOwnership`. (`MissionRewards.sol:158-192`)

**Kerusakan maksimum bila kunci bocor:**
Seluruh float IDMX di kontrak (100.000.000 IDMX di testnet) hilang lewat
`sweep` (`MissionRewards.sol:177-180`). Selain itu `setCap(0, type(uint256).max)`
menghapus batas harian on-chain, dan `setVoucherSigner(attacker)` memberi
penyerang kemampuan menerbitkan voucher sendiri.

**Apakah bisa mengambil dana user?** Sebagian. IDMX di `MissionRewards`
belum menjadi milik user mana pun — belum diklaim. Tetapi voucher yang
**sudah ditandatangani dan belum ditukar** merepresentasikan reward yang sudah
diperoleh user; `sweep` membuat voucher itu tidak bisa dibayar. Lihat temuan
**F-04 (High)**.

---

#### Peran 3 — `owner` dari `SwapInitiator` (opBNB)

**Bisa melakukan:** `setWeeklyCap`, `setGlobalThreshold`, `setLifetimeCap`,
`setPaused`, `transferOwnership`. (`SwapInitiator.sol:148-188`)

**Kerusakan maksimum bila kunci bocor:**
Tidak ada token yang bisa diambil — kontrak ini tidak memegang token dan tidak
punya `sweep`. Kerusakan terbesarnya ada dua arah:

- **Denial of service:** `setPaused(true)` menutup satu-satunya pintu keluar
  IDMX (`SwapInitiator.sol:215`). IDMX pengguna menjadi terkunci di opBNB —
  bukan hilang, tapi tidak bisa ditukar. Tidak ada mekanisme un-pause selain
  owner sendiri.
- **Merusak invarian likuiditas:** menaikkan `lifetimeCap` dan `weeklyCap`
  melebihi kapasitas kolam BSC memungkinkan burn diterima yang kolamnya tidak
  bisa bayar. Runbook di komentar (`SwapInitiator.sol:143-147`, `:158-166`)
  mengakui urutan operasi ini kritis, tetapi **urutannya tidak ditegakkan oleh
  kode** — hanya oleh disiplin operator. Analisis kuantitatifnya masuk Fase 3.

**Apakah bisa mengambil dana user?** Tidak secara langsung. Bisa mengunci
(DoS) dan bisa merusak jaminan likuiditas.

---

#### Peran 4 — `voucherSigner` (`MissionRewards`) dan `swapSigner` (`SwapClaim`)

Dua kunci berbeda, pola yang sama: satu kunci EIP-712 yang tanda tangannya
adalah **satu-satunya** syarat pembayaran.
(`MissionRewards.sol:83, 240` · `SwapClaim.sol:81, 230`)

**Kerusakan maksimum bila `swapSigner` bocor:**
Penyerang dapat membuat voucher untuk nonce mana pun yang belum terpakai.
Ruang nonce adalah `uint256` penuh dan `nonceUsed` (`SwapClaim.sol:101`) hanya
menolak nonce yang **sudah** dipakai — tidak ada pemeriksaan bahwa nonce itu
benar-benar berasal dari `SwapRequested` di opBNB. Satu-satunya pembatas
per-voucher adalah `maxIdmxPerVoucher` (2.000 IDMX → 40 IDM bruto → 39 IDM
neto, `SwapClaim.sol:235-244`). **Tidak ada batas agregat, tidak ada batas
per-hari, tidak ada circuit breaker di sisi BSC.**

Perhitungan jujur: menguras 150 juta IDM pada 39 IDM/voucher membutuhkan
≈ 3,85 juta transaksi. Itu friksi nyata — biaya gas dan waktu — dan owner
punya waktu untuk `setPaused(true)` bila pemantauan berjalan. Jadi ini
**bukan** pencurian satu transaksi. Tetapi terhadap penyerang dengan modal dan
waktu tak terbatas (asumsi yang diminta di §3.5), plafon kerugiannya tetap
**seluruh kolam**. Lihat temuan **F-02 (High)**.

**Kerusakan maksimum bila `voucherSigner` bocor:**
Penyerang menerbitkan voucher untuk alamat-alamat yang ia kendalikan sendiri.
Cap `claimedOnDay` (`MissionRewards.sol:92, 246`) dikunci **per alamat**, jadi
penyerang cukup memakai alamat baru — cap tidak membatasi total sama sekali.
Plafon kerugian = seluruh float IDMX di kontrak. Lihat temuan **F-03 (High)**.

Ini mengoreksi klaim di komentar kontrak `MissionRewards.sol:46-49` ("a bug or
a compromise in the backend cannot exceed it"): pernyataan itu benar
**per-user**, tidak benar **secara agregat**. Auditor akan membaca komentar
tersebut dan menanyakan hal ini.

---

#### Peran 5 — `relayer` (`ReportAttestation`)

**Bisa melakukan:** memanggil `attestFor(user, periodKey, hash)` untuk alamat
user mana pun (`ReportAttestation.sol:146-153`).

**Kerusakan maksimum bila kunci bocor:**
Penyerang dapat menuliskan hash palsu ke `seals[korban][periodKey]`, menimpa
segel sah milik korban (`ReportAttestation.sol:160` menimpa tanpa syarat).
Verifikasi pihak ketiga terhadap laporan asli korban kemudian mengembalikan
`false` (`ReportAttestation.sol:169-179`). Ini kerusakan **integritas dan
reputasi**, bukan kerugian finansial: kontrak tidak memegang token.

Mitigasi yang sudah ada di kode: riwayat lengkap tetap terbaca dari event
`Sealed` (`ReportAttestation.sol:69-74`), sehingga penimpaan meninggalkan
jejak. Korban dapat menyegel ulang sendiri lewat `attest`
(`ReportAttestation.sol:135-140`) tanpa bergantung pada relayer.

**Apakah bisa mengambil dana user?** Tidak. Tidak ada token di kontrak ini.

---

#### Ringkasan: siapa bisa mengambil dana user?

| Peran | Bisa ambil dana user? | Plafon | Temuan |
|---|---|---|---|
| `owner` `SwapClaim` | ⚠️ **YA** — 1 transaksi | 150.000.000 IDM | **F-01 Critical** |
| `owner` `MissionRewards` | ⚠️ Sebagian — 1 transaksi | Seluruh float IDMX | **F-04 High** |
| `swapSigner` | ⚠️ YA — bertahap | 150.000.000 IDM | **F-02 High** |
| `voucherSigner` | ⚠️ YA — bertahap | Seluruh float IDMX | **F-03 High** |
| `owner` `SwapInitiator` | Tidak (DoS + rusak invarian) | — | Fase 3/4 |
| `relayer` `ReportAttestation` | Tidak | — | — |

⚠️ **Pada konfigurasi testnet saat ini, enam baris pertama tabel ini adalah
satu kunci yang sama** (§1.3). Plafon gabungannya: 150.000.000 IDM + seluruh
float IDMX, dari satu kompromi. Lihat **F-08**.

**Catatan konfigurasi — TERVERIFIKASI, dan hasilnya buruk.** Pembacaan
on-chain (§1.3) menunjukkan **enam dari tujuh peran di atas dipegang oleh satu
alamat yang sama**, `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3`: keempat
`owner`, `voucherSigner` `MissionRewards`, dan `relayer` `ReportAttestation`.
Hanya `swapSigner` yang terpisah. `pendingOwner` keempat kontrak masih
`address(0)`, jadi kepemilikan belum dipindahkan ke multisig mana pun.

Konsekuensinya, tabel di atas **tidak boleh dibaca sebagai enam permukaan
serangan yang terpisah**. Pada konfigurasi testnet saat ini, kolom "kerusakan
maksimum" untuk `owner` `SwapClaim`, `owner` `MissionRewards`, `owner`
`SwapInitiator`, `voucherSigner`, dan `relayer` semuanya terjadi **sekaligus**
dari satu kebocoran kunci. Yang paling tajam: `voucherSigner` adalah kunci
panas yang harus tersedia bagi server aplikasi untuk menandatangani voucher
misi, dan kunci itulah yang juga memegang `SwapClaim.sweep` atas kolam 150 juta
IDM. Lihat temuan **F-08 (High)**.

Komentar `ReportAttestation.sol:46-47` menyatakan kepemilikan produksi akan
dipindahkan ke "timelocked multisig". Rencana itu **belum terlaksana** pada
deployment testnet. **TIDAK YAKIN** apakah kunci penandatangan disimpan di
HSM/KMS dan bagaimana prosedur rotasinya — itu tetap pemeriksaan Fase 4.

### 3.3 Asumsi kepercayaan — hal yang dianggap benar tapi TIDAK ditegakkan kode

Bagian ini adalah yang paling sering ditanyakan auditor. Setiap butir di bawah
adalah hal yang harus benar agar sistem bekerja, tetapi **tidak ada satu baris
kode pun** yang memastikannya.

| # | Asumsi | Ditegakkan oleh | Konsekuensi bila salah |
|---|---|---|---|
| A-1 | **Relayer swap akan menandatangani voucher untuk setiap `SwapRequested`.** | Tidak ada. Murni operasional. | IDMX user sudah musnah (`SwapInitiator.sol:250`) tanpa jalur pemulihan on-chain. Kerugian permanen. Lihat **F-06**. |
| A-2 | **Relayer swap hanya menandatangani nonce yang benar-benar berasal dari `SwapRequested` di opBNB.** | Tidak ada. `SwapClaim` tidak punya cara membuktikan burn terjadi (`SwapClaim.sol:229` hanya cek nonce belum dipakai). | Voucher fiktif dibayar dari kolam. Lihat **F-02**. |
| A-3 | **Relayer swap menandatangani `idmxBurned` yang persis sama dengan yang dibakar.** | Tidak ada. | Pembayaran berlebih, dibatasi hanya oleh `maxIdmxPerVoucher` (`SwapClaim.sol:235`). |
| A-4 | **Server tidak menerbitkan voucher misi untuk misi yang tidak diselesaikan.** | Tidak ada. Kontrak tidak tahu apa arti `missionId` — komentar `MissionRewards.sol:61` menyatakannya eksplisit: "opaque to this contract". | Reward diterbitkan tanpa dasar. Dibatasi cap per-alamat, tidak dibatasi secara agregat. Lihat **F-03**. |
| A-5 | **Satu manusia tidak mengendalikan banyak alamat (anti-Sybil).** | Tidak ada di kontrak. Semua cap (`claimedOnDay`, `usedThisWeek`) dikunci per-alamat. | Cap harian/mingguan dilewati dengan membuat alamat baru. Anti-Sybil sepenuhnya bergantung pada backend (KYC/deteksi akun) yang di luar lingkup audit ini. |
| A-6 | ~~**`token` di `MissionRewards` dan `idm` di `SwapClaim` menunjuk ke kontrak ERC-20 yang benar.**~~ ✅ **TIDAK LAGI ASUMSI** | Terverifikasi on-chain di §1.2: nilai `immutable` dibaca langsung dari bytecode dan cocok dengan alamat `IDMX`/`IDMReborn`. Karena `immutable`, nilai itu tidak dapat diubah siapa pun. | — (asumsi ditutup; dasar penilaian positif palsu §4.3.2 kini berpijak pada bukti) |
| A-7 | **Operator mengikuti urutan operasi yang benar saat mengubah cap.** Yaitu: naikkan `maxIdmxPerVoucher` (BSC) **sebelum** `weeklyCap` (opBNB); perketat `lifetimeCap` **sebelum** memperbaiki `rate`. | Tidak ada. Hanya komentar: `SwapInitiator.sol:143-147`, `SwapInitiator.sol:158-166`, `SwapClaim.sol:175-178`. Kedua kontrak ada di chain berbeda sehingga saling-kunci on-chain memang tidak mungkin. | Jendela waktu di mana burn diterima yang voucher-nya akan ditolak — persis hal yang menurut komentar `SwapInitiator.sol:37-42` tidak boleh terjadi. Analisis Fase 3. |
| A-8 | **Kunci `voucherSigner`, `swapSigner`, dan `relayer` disimpan aman dan terpisah dari kunci `owner`.** | Tidak ada. | Lihat §3.2. |
| A-9 | **Chain opBNB dan BSC keduanya hidup dan tidak melakukan reorg dalam.** | Tidak ada. Relayer bereaksi terhadap event; kedalaman konfirmasi yang dipakai relayer di luar lingkup audit kontrak ini. | Reorg di opBNB setelah relayer menandatangani → voucher untuk burn yang tidak jadi terjadi. **TIDAK YAKIN** seberapa besar risiko praktisnya; perlu ditanyakan ke auditor. |
| A-10 | **`block.timestamp` yang dilaporkan validator cukup akurat.** | Tidak ada; hanya konsensus chain. | Batas hari/minggu UTC+7 (`MissionRewards.sol:197`, `SwapInitiator.sol:196`) bisa digeser beberapa detik. Dampak praktis kecil; diperiksa di Fase 2. |

### 3.4 Trust boundary

```
  ┌────────────────────────────────────────────────────────────────────┐
  │  DIJAMIN ON-CHAIN — dapat diverifikasi siapa pun dari bytecode     │
  ├────────────────────────────────────────────────────────────────────┤
  │  · Pasokan IDM 1 miliar tetap, tanpa mint          IDMReborn:55,76 │
  │  · IDMReborn tanpa owner & tanpa privilege         IDMReborn:48-158│
  │  · Pasokan IDMX tanpa mint                         IDMX:43-145     │
  │  · Burn benar-benar mengurangi totalSupply         IDMX:135-144    │
  │  · Fee 1 IDM benar-benar dibakar, tidak dikutip    SwapClaim:252   │
  │  · Rate hanya bisa membaik (ratchet satu arah)     SwapClaim:164   │
  │  · Nonce sekali pakai — anti-replay                MissionRewards:239│
  │                                                    SwapClaim:229   │
  │  · Cap harian per-alamat                           MissionRewards:246│
  │  · Cap mingguan per-alamat + lifetime cap          SwapInitiator:220,225│
  │  · Circuit breaker mingguan (auto-pause)           SwapInitiator:243│
  │  · Semua penolakan swap terjadi SEBELUM burn       SwapInitiator:215-225│
  │  · Kepemilikan dua langkah (butuh accept)          keempat kontrak │
  │  · Anti-malleability tanda tangan (cek s upper-half)MissionRewards:280│
  │                                                    SwapClaim:280   │
  │  · Penerima selalu v.user, bukan pengirim tx       MissionRewards:258│
  │                                                    SwapClaim:258   │
  └────────────────────────────────────────────────────────────────────┘
                                  │
  ════════════════════ BATAS KEPERCAYAAN ════════════════════════════════
                                  │
  ┌────────────────────────────────────────────────────────────────────┐
  │  BERGANTUNG PADA SERVER KAMI — tidak dapat diverifikasi on-chain   │
  ├────────────────────────────────────────────────────────────────────┤
  │  · Relayer swap opBNB→BSC (lib/swap/relayer-server.ts)             │
  │      Apakah ia menandatangani? Apakah nonce-nya asli? Apakah       │
  │      jumlahnya benar? → tidak ada jawaban on-chain (A-1, A-2, A-3) │
  │  · Penandatangan voucher misi (lib/missions/relayer.ts)            │
  │      Apakah misinya benar-benar selesai? → missionId opaque (A-4)  │
  │  · Relayer segel (attestFor)                                       │
  │      Apakah hash-nya milik user yang benar?                        │
  │  · Anti-Sybil / satu-manusia-satu-akun (A-5)                       │
  │  · Kebenaran isi laporan yang di-hash (ReportAttestation:36-40      │
  │      menyatakan eksplisit: kontrak hanya membuktikan INTEGRITAS,   │
  │      bukan kebenaran angka)                                        │
  │  · Disiplin urutan operasi saat mengubah cap lintas chain (A-7)    │
  │  · Manajemen kunci: owner, signer, relayer (A-8)                   │
  └────────────────────────────────────────────────────────────────────┘
```

Berkas server yang disebut di atas dinamai hanya untuk menunjukkan letak
batasnya; **isinya tidak diaudit** — di luar lingkup yang ditetapkan.

### 3.5 Pertanyaan penyerang

"Kalau saya penyerang dengan modal tak terbatas dan waktu tak terbatas, apa
yang paling ingin saya curi di sini, dan lewat pintu mana?"

---

**`IDMReborn.sol` — Tidak ada yang bisa dicuri dari kontraknya.**
Saya ingin 1 miliar IDM, tapi kontraknya tidak punya pintu: tidak ada owner,
tidak ada mint, tidak ada pause, tidak ada fungsi administratif
(`IDMReborn.sol:48-158`). Satu-satunya cara mendapat IDM dari kontrak ini
adalah memegang kunci privat sebuah alamat yang punya saldo. Serangan saya
bergeser ke **dompet treasury** (`IDM_TREASURY_ADDRESS`, memegang sisa ±850
juta IDM) — dan itu masalah keamanan kunci, bukan masalah kontrak. Kontrak
ini adalah bagian paling kuat dari sistem.

---

**`IDMX.sol` — Sama, tidak ada pintu di kontrak.**
Tidak ada mint, tidak ada owner (`IDMX.sol:43-145`). IDMX juga tidak punya
nilai pasar langsung — nilainya baru muncul setelah ditukar jadi IDM. Jadi
saya tidak menyerang IDMX; saya menyerang **jalur penukarannya**. Satu hal
yang saya perhatikan: `burnFrom` (`IDMX.sol:124-133`) bisa dipanggil siapa
pun yang punya allowance. Kalau user memberi allowance tak terbatas ke
`SwapInitiator`, `SwapInitiator` bisa membakar seluruh saldo IDMX user kapan
saja — tapi `SwapInitiator` tidak punya kode yang melakukan itu di luar
`swap()` yang dipanggil user sendiri, dan kontraknya tidak bisa di-upgrade.
Jadi ini aman selama alamat `SwapInitiator` yang di-approve memang kontrak
yang benar. **Yang mau saya curi: tidak ada. Pintu: tidak ada.**

---

**`SwapClaim.sol` — INI TARGET UTAMA SAYA. 150 juta IDM, cair, di satu alamat.**

Ini kontrak dengan nilai tertinggi di seluruh sistem, dan saya punya **dua
pintu**:

*Pintu 1 — kunci `owner`.* Satu panggilan `sweep(alamat_saya, 150_000_000e18)`
(`SwapClaim.sol:190-193`) dan selesai. Tanpa timelock, tanpa batas jumlah,
tanpa daftar tujuan yang diizinkan. Ini pintu terlebar di seluruh sistem, dan
kalau saya penyerang, ke sinilah seluruh anggaran serangan saya diarahkan:
phishing, malware, rekayasa sosial, atau menyuap orang yang memegang kunci.
Kontraknya sendiri sempurna aman — saya menyerang manusianya.

*Pintu 2 — kunci `swapSigner`.* Lebih lambat tapi sama fatalnya. Saya bisa
menandatangani voucher untuk nonce apa pun yang belum terpakai; `SwapClaim`
tidak punya cara membuktikan burn di opBNB benar-benar terjadi
(`SwapClaim.sol:229` hanya memeriksa nonce belum dipakai, bukan asalnya).
Saya dibatasi 2.000 IDMX per voucher (`SwapClaim.sol:235`) = 39 IDM neto, jadi
saya butuh ±3,85 juta transaksi untuk kolam penuh. Dengan waktu tak terbatas
itu bukan penghalang — tapi saya berlomba melawan pemantauan: begitu owner
memanggil `setPaused(true)` saya berhenti. Jadi strategi saya adalah menyerang
pelan, di bawah ambang alarm — dan di sini saya perhatikan bahwa **`SwapClaim`
tidak punya circuit breaker sama sekali**, tidak seperti `SwapInitiator` yang
punya auto-pause di `:243`. Sisi BSC hanya diawasi manusia.

*Yang tidak bisa saya lakukan:* menaikkan `rate` untuk mendevaluasi user —
`setRate` menolaknya secara aritmetis (`SwapClaim.sol:164`). Memakai ulang
voucher — nonce dikonsumsi sebelum transfer (`SwapClaim.sol:249`). Memakai
tanda tangan malleable — dicegah di `:280`. Reentrancy lewat token —
`idm` immutable dan `IDMReborn` tidak punya hook.

---

**`MissionRewards.sol` — Target kedua. Float IDMX, dan yang lebih menarik:
pencetak IDMX yang efektif.**

*Yang saya inginkan:* IDMX gratis dalam jumlah besar — bukan karena IDMX
berharga, tapi karena IDMX adalah **bahan baku** untuk menguras kolam IDM
lewat jalur yang sah. Kalau saya bisa mencetak IDMX sesuka hati, saya tidak
perlu memalsukan voucher swap sama sekali: saya cukup swap seperti user biasa.

*Pintu:* kunci `voucherSigner` (`MissionRewards.sol:83`). Cap harian tidak
menghentikan saya karena dikunci per-alamat (`MissionRewards.sol:246`) — saya
pakai 10.000 alamat. Ini alasan mengapa klaim di komentar `:46-49` perlu
dibaca hati-hati oleh auditor.

*Rem yang benar-benar menahan saya:* bukan `MissionRewards`, melainkan
`SwapInitiator`. `weeklyCap` 2.000 IDMX per dompet per minggu
(`SwapInitiator.sol:220`) memaksa saya menyebar IDMX curian ke ribuan dompet
dan menunggu berminggu-minggu, dan `globalThreshold` (`:243`) akan mem-pause
kontrak secara otomatis begitu volume mingguan agregat menembus ambang.
Arsitektur berlapis ini bekerja — dan layak disebut sebagai kekuatan sistem.

*Pintu kedua:* kunci `owner` → `sweep` (`MissionRewards.sol:177-180`) untuk
float IDMX-nya langsung. Nilainya lebih rendah dari kolam IDM, tapi satu
transaksi.

---

**`SwapInitiator.sol` — Tidak ada yang bisa dicuri. Yang bisa saya lakukan:
merusak.**

Kontrak ini tidak pernah memegang token (`burnFrom` menarik langsung dari
dompet user, `SwapInitiator.sol:250`) dan tidak punya `sweep`. Jadi saya tidak
mencuri di sini — saya **menyabotase**.

*Kalau saya pegang kunci `owner`:* `setPaused(true)` (`:173-176`) menutup
satu-satunya pintu keluar IDMX. Seluruh IDMX di ekosistem menjadi tidak bisa
ditukar, tanpa batas waktu. Bagi bursa, "token tidak bisa keluar" adalah
skenario yang sama buruknya dengan pencurian.

*Kalau saya penyerang tanpa kunci:* saya bisa **memicu circuit breaker
sebagai serangan DoS**. Saya swap dalam jumlah besar sampai `weeklyTotal`
menembus `globalThreshold` (`:243`), kontrak mem-pause dirinya sendiri, dan
semua user jujur terkunci sampai owner turun tangan manual. Biayanya bagi saya
adalah IDMX yang saya bakar — tapi saya tetap dapat IDM-nya lewat voucher yang
sah, jadi biaya bersih saya hanya fee 1 IDM per klaim ditambah gas. Dengan
modal tak terbatas, ini serangan DoS yang murah. **Apakah ini masalah nyata
atau trade-off yang disengaja — perlu dianalisis di Fase 2/Fase 3.** Komentar
di `:66-69` menunjukkan breaker memang dirancang untuk membatasi kerugian,
bukan untuk tahan terhadap DoS yang disengaja.

*Yang tidak bisa saya lakukan:* membuat burn yang tidak bisa ditebus lewat
kontrak ini sendiri. Setiap penolakan memang terjadi sebelum `burnFrom`
(`:215-225` sebelum `:250`). Invarian itu ditegakkan dengan benar di level
kontrak.

---

**`ReportAttestation.sol` — Tidak ada uang. Yang saya curi adalah kredibilitas.**

Tidak ada token, tidak ada `payable`, tidak ada `withdraw`
(`ReportAttestation.sol:49-180`). Jadi tidak ada yang bisa dicuri secara
finansial dari kontrak ini.

*Yang saya inginkan:* merusak segel seseorang. Kalau saya pegang kunci
`relayer`, saya panggil `attestFor(korban, periodKey, hash_sampah)`
(`:146-153`); `_attest` menimpa entri lama tanpa syarat (`:160`), dan
verifikasi laporan asli korban langsung mengembalikan `false` (`:169-179`).
Kalau korban adalah perusahaan yang sedang mengajukan kredit dengan
mengandalkan segel ini, kerusakannya nyata meski tidak ada rupiah yang
berpindah.

*Yang membatasi saya:* seluruh riwayat tetap ada di event `Sealed` (`:69-74`),
jadi penimpaan saya terlihat. Dan korban bisa menyegel ulang sendiri lewat
`attest` (`:135-140`) tanpa izin siapa pun. Kerusakannya bisa diperbaiki.

*Catatan yang menguntungkan penerbit:* kontrak ini secara tipe data tidak
mungkin membocorkan data keuangan — tidak ada satu pun fungsi yang menerima
`string` atau angka bisnis. Klaim di komentar `:30-34` benar dan dapat
diverifikasi dari tanda tangan fungsinya saja.

---

## 4. Hasil Analisis Otomatis (Slither) — Bagian A

### 4.1 Konfigurasi

| Item | Nilai |
|---|---|
| Alat | Slither `0.11.5` |
| Kompiler | `solc 0.8.26+commit.8a97fa7a.Linux.g++` (biner statis resmi dari `ethereum/solidity` releases) |
| Perintah | `slither contracts/ --solc <solc-0.8.26>` |
| Cakupan | 9 kontrak (6 kontrak + 3 interface: `IERC20`, `IIDMX`, `IIDM`) |
| Detektor aktif | 101 (set default penuh, termasuk informational & optimization) |
| Hasil | **11 temuan** — semua Low atau Informational. **Nol** High, **nol** Medium. |
| Keluaran mentah | [`slither-raw.txt`](slither-raw.txt) · [`slither-raw.json`](slither-raw.json) |

Kompilasi keenam kontrak berhasil tanpa error dan tanpa warning yang
dilaporkan Slither. Tidak ada detektor yang gagal berjalan.

**Catatan pemasangan:** Slither sudah tersedia di lingkungan build. `solc`
sistem berversi 0.8.24 sementara kontrak mengunci `pragma solidity 0.8.26`,
sehingga biner statis 0.8.26 resmi diunduh dan diberikan lewat `--solc`.
Instalasi `pip` ke sistem diblokir PEP 668 (Debian externally-managed
environment), tetapi hal itu tidak menghambat karena Slither sudah terpasang.
Tidak ada langkah Bagian A yang dilewati.

### 4.2 Tabel triase

Ke-11 temuan Slither, dinilai satu per satu.

| ID | Temuan | Severity Slither (impact/confidence) | Kontrak:baris | Penilaian | Alasan |
|---|---|---|---|---|---|
| S-01 | `missing-zero-check`: `transferOwnership(to)` tidak memvalidasi `to != address(0)` | Low / Medium | `MissionRewards.sol:182-183` | **POSITIF PALSU** | Lihat §4.3.1 |
| S-02 | `missing-zero-check`: idem | Low / Medium | `SwapInitiator.sol:178-179` | **POSITIF PALSU** | Lihat §4.3.1 |
| S-03 | `missing-zero-check`: idem | Low / Medium | `ReportAttestation.sol:119-120` | **POSITIF PALSU** | Lihat §4.3.1 |
| S-04 | `missing-zero-check`: idem | Low / Medium | `SwapClaim.sol:195-196` | **POSITIF PALSU** | Lihat §4.3.1 |
| S-05 | `reentrancy-events`: event `Claimed` diemit setelah `token.transfer` | Low / Medium | `MissionRewards.sol:234-260` (call di `:258`, event di `:259`) | **POSITIF PALSU** | Lihat §4.3.2 |
| S-06 | `reentrancy-events`: event `SwapRequested` diemit setelah `idmx.burnFrom` | Low / Medium | `SwapInitiator.sol:214-252` (call di `:250`, event di `:251`) | **POSITIF PALSU** | Lihat §4.3.2 |
| S-07 | `reentrancy-events`: event `SwapClaimed` diemit setelah `idm.burn` + `idm.transfer` | Low / Medium | `SwapClaim.sol:226-260` (call di `:252`,`:258`, event di `:259`) | **POSITIF PALSU** | Lihat §4.3.2 |
| S-08 | `timestamp`: `block.timestamp > v.deadline` | Low / Medium | `MissionRewards.sol:238` | **POSITIF PALSU** (untuk perbandingan deadline) | Lihat §4.3.3 |
| S-09 | `timestamp`: `block.timestamp > v.deadline` | Low / Medium | `SwapClaim.sol:228` | **POSITIF PALSU** (untuk perbandingan deadline) | Lihat §4.3.3 |
| S-10 | `assembly`: `_recoverSigner` memakai inline assembly | Informational / High | `MissionRewards.sol:271-275` | **POSITIF PALSU** | Lihat §4.3.4 |
| S-11 | `assembly`: idem | Informational / High | `SwapClaim.sol:271-275` | **POSITIF PALSU** | Lihat §4.3.4 |

**Ringkasan triase: 0 NYATA · 11 POSITIF PALSU · 0 PERLU PERIKSA MANUAL.**

Tidak ada satu pun temuan Slither yang naik ke §8. Ini bukan karena temuan
diabaikan, melainkan karena alasan yang dijabarkan di §4.3 di bawah; keluaran
mentahnya dilampirkan utuh agar auditor bisa menilai sendiri.

Satu hal yang **tidak** dinilai positif palsu tapi juga bukan temuan Slither:
S-08/S-09 hanya menyoroti perbandingan `deadline`. Detektor `timestamp` Slither
**tidak** menyoroti `dayUtc7` (`MissionRewards.sol:196-198`) dan `weekUtc7`
(`SwapInitiator.sol:195-197`), padahal keduanya juga memakai `block.timestamp`
untuk menentukan batas ember cap. Manipulasi batas hari/minggu adalah kelas
serangan yang berbeda dan **belum dianalisis** — masuk daftar kerja Fase 2.

### 4.3 Penjelasan penilaian

#### 4.3.1 S-01 s.d. S-04 — `missing-zero-check` pada `transferOwnership`

**Penilaian: POSITIF PALSU.**

Slither menandai ini karena polanya (`pendingOwner = to` tanpa cek nol) mirip
dengan kesalahan klasik pada `transferOwnership` **satu langkah**, di mana
`owner = address(0)` membuat kontrak kehilangan owner selamanya.

Di sini polanya **dua langkah**. Menulis `pendingOwner = address(0)` tidak
memindahkan kepemilikan apa pun. Perpindahan hanya terjadi di
`acceptOwnership`, yang mensyaratkan `msg.sender == pendingOwner`
(`MissionRewards.sol:188`, `ReportAttestation.sol:125`,
`SwapInitiator.sol:184`, `SwapClaim.sol:201`). Karena `address(0)` tidak
memiliki kunci privat dan tidak dapat mengirim transaksi, kondisi itu tidak
akan pernah terpenuhi. `owner` tetap tidak berubah.

Lebih jauh: memanggil `transferOwnership(address(0))` justru merupakan idiom
standar untuk **membatalkan** perpindahan kepemilikan yang sedang menunggu —
persis perilaku `Ownable2Step` OpenZeppelin, yang juga sengaja tidak memasang
cek nol di sana. Menambahkan `if (to == address(0)) revert ZeroAddress();`
justru akan menghapus kemampuan membatalkan itu.

Konfirmasi tambahan: keempat kontrak **memang** memasang cek alamat nol di
tempat yang benar-benar berbahaya — `MissionRewards.sol:159` (`setVoucherSigner`),
`MissionRewards.sol:178` (`sweep`), `ReportAttestation.sol:107` (`setRelayer`),
`SwapClaim.sol:170` (`setSwapSigner`), `SwapClaim.sol:191` (`sweep`), dan di
semua konstruktor. Jadi ketiadaan cek di `transferOwnership` konsisten dengan
pilihan sadar, bukan kelalaian yang menyeluruh.

#### 4.3.2 S-05 s.d. S-07 — `reentrancy-events`

**Penilaian: POSITIF PALSU.**

Detektor `reentrancy-events` adalah detektor Slither dengan severity terendah:
ia **tidak** melaporkan reentrancy yang dapat dieksploitasi. Ia hanya
melaporkan bahwa sebuah `emit` terjadi setelah external call, sehingga urutan
event yang terlihat oleh pengamat off-chain bisa tidak sesuai urutan
kronologis bila call tersebut re-entrant. Dampaknya terbatas pada indexer,
bukan pada state on-chain.

Tiga alasan mengapa tidak ada risiko di sini:

1. **Callee-nya bukan kontrak sembarangan.** Ketiga external call menuju
   token yang alamatnya `immutable` — `token` di `MissionRewards.sol:77`,
   `idmx` di `SwapInitiator.sol:52`, `idm` di `SwapClaim.sol:75`. Alamat itu
   ditetapkan di konstruktor dan tidak dapat diubah oleh siapa pun setelahnya
   (tidak ada setter, tidak ada proxy). Callee-nya adalah `IDMX` dan
   `IDMReborn`, keduanya dalam lingkup audit ini.

2. **`IDMX` dan `IDMReborn` tidak memiliki callback hook.** Diverifikasi baris
   per baris: `IDMX._transfer` (`IDMX.sol:99-108`), `IDMX._burn`
   (`:135-144`), `IDMReborn._transfer` (`IDMReborn.sol:112-121`),
   `IDMReborn._burn` (`:148-157`) hanya melakukan aritmetika saldo dan
   `emit`. **Tidak ada `call`, tidak ada `delegatecall`, tidak ada
   `transfer`/`send` ether, tidak ada hook ERC-777 `tokensReceived`, tidak ada
   `onTransferReceived` ERC-1363.** Tidak ada jalur eksekusi yang mengembalikan
   kendali ke pemanggil. Reentrancy secara teknis tidak mungkin.

3. **Pola checks-effects-interactions diikuti dengan benar sekalipun.**
   Bahkan seandainya token bisa re-enter, state sudah final sebelum call:
   `MissionRewards.sol:251-252` menulis `nonceUsed` dan `claimedOnDay` sebelum
   `:258`; `SwapClaim.sol:249` menulis `nonceUsed` sebelum `:252`/`:258`;
   `SwapInitiator.sol:230-233` menulis semua akumulator dan nonce sebelum
   `:250`. Masuk kembali akan langsung tertolak oleh cek nonce/cap.

**Batas kepercayaan yang jujur:** poin 1 dan 2 bergantung pada asumsi A-6 —
bahwa alamat token yang dipasang di konstruktor memang menunjuk ke `IDMX` dan
`IDMReborn` yang dianalisis di sini, bukan ke kontrak lain. Karena
`immutable`, itu hanya perlu benar **sekali**, pada saat deploy, dan dapat
diverifikasi on-chain oleh siapa pun. Auditor sebaiknya mengonfirmasi ini
langsung terhadap alamat mainnet.

#### 4.3.3 S-08, S-09 — `timestamp` pada perbandingan `deadline`

**Penilaian: POSITIF PALSU (untuk perbandingan yang ditandai).**

Slither menandai setiap penggunaan `block.timestamp` dalam perbandingan.
Kekhawatiran umumnya: validator dapat menggeser `block.timestamp` beberapa
detik dan mengubah hasil perbandingan.

Di sini perbandingannya adalah kedaluwarsa voucher
(`MissionRewards.sol:238`, `SwapClaim.sol:228`). Pergeseran beberapa detik
hanya dapat mengubah hasilnya untuk voucher yang **tepat berada di detik
kedaluwarsanya**. Konsekuensi maksimalnya: sebuah voucher yang seharusnya
kedaluwarsa masih diterima (atau sebaliknya, ditolak beberapa detik lebih
awal). Tidak ada keuntungan ekonomi yang bisa diekstrak dari itu: voucher
tetap harus ditandatangani signer yang sah, nonce-nya tetap sekali pakai, dan
jumlahnya tetap sama. Voucher yang ditolak dapat diterbitkan ulang oleh
backend.

Ini pola standar yang dipakai setiap implementasi EIP-712 dengan deadline,
termasuk `ERC20Permit` OpenZeppelin. Tidak ada alternatif yang lebih baik:
tidak ada sumber waktu on-chain selain `block.timestamp` dan `block.number`.

**Yang TIDAK ditangani oleh penilaian ini** (dan karena itu disebut eksplisit):
`block.timestamp` juga dipakai untuk menghitung batas ember cap di
`dayUtc7` (`MissionRewards.sol:196-198`, dipanggil di `:224`,`:244`) dan
`weekUtc7` (`SwapInitiator.sol:195-197`, dipanggil di `:201`,`:218`). Di sana
manipulasi timestamp menyentuh **cap**, bukan sekadar deadline — kelas dampak
yang berbeda. Slither tidak menandainya. Analisis manual atas kelas ini
**belum dilakukan** dan dijadwalkan di Fase 2.

#### 4.3.4 S-10, S-11 — `assembly` pada `_recoverSigner`

**Penilaian: POSITIF PALSU.**

Detektor ini bersifat Informational murni: Slither melaporkan **setiap**
penggunaan inline assembly tanpa menilai apakah penggunaannya salah, karena
analisis statiknya tidak menembus blok assembly.

Blok yang ditandai (`MissionRewards.sol:271-275`, `SwapClaim.sol:271-275`)
identik di kedua kontrak dan hanya membaca tiga nilai dari calldata:

```solidity
r      := calldataload(sig.offset)
s      := calldataload(add(sig.offset, 32))
vParam := byte(0, calldataload(add(sig.offset, 64)))
```

Ini adalah pemisahan tanda tangan 65-byte yang konvensional — pola yang sama
dengan `ECDSA.tryRecover` OpenZeppelin. Empat hal yang membuatnya aman, dan
semuanya berada **di luar** blok assembly sehingga dapat diverifikasi Slither
maupun pembaca:

1. **Panjang dicek lebih dulu.** `if (sig.length != 65) revert InvalidSignature();`
   (`MissionRewards.sol:267`, `SwapClaim.sol:267`) dijalankan sebelum blok
   assembly, sehingga `calldataload` tidak pernah membaca di luar batas
   calldata tanda tangan.
2. **Malleability ditolak.** Nilai `s` di paruh atas order kurva ditolak
   (`MissionRewards.sol:280-282`, `SwapClaim.sol:280-282`), sehingga hanya satu
   tanda tangan valid per digest. Ini justru **lebih ketat** dari yang
   diwajibkan, dan pantas dicatat sebagai poin positif.
3. **Hasil `ecrecover == address(0)` ditolak.** (`MissionRewards.sol:284`,
   `SwapClaim.sol:284`) Ini menutup kegagalan diam `ecrecover` yang menjadi
   sumber bug klasik.
4. **Fungsinya `pure`.** Tidak ada state yang disentuh, tidak ada memori
   kontrak yang ditulis — assembly hanya membaca calldata ke variabel stack.

Menggantinya dengan `abi.decode` biasa akan menghasilkan perilaku yang sama
dengan gas lebih tinggi; penggunaan assembly di sini adalah optimasi yang
lazim, bukan penghindaran pemeriksaan.

### 4.4 Batas dari analisis otomatis — dibaca bersama §0.5

Nol temuan nyata dari Slither adalah hasil yang bagus, tetapi maknanya harus
dibatasi dengan jujur. Slither **secara struktural tidak dapat** melihat:

- **Invarian lintas chain.** `SwapInitiator` (opBNB) dan `SwapClaim` (BSC)
  dianalisis sebagai dua kontrak yang tidak berhubungan. Hubungan
  `lifetimeCap` ↔ ukuran kolam, dan `weeklyCap` ↔ `maxIdmxPerVoucher`, tidak
  terlihat sama sekali oleh alat ini. (Fase 3)
- **Invarian ekonomi.** Apakah 150 juta IDM cukup untuk 50 miliar IDMX pada
  rate 50:1 adalah pertanyaan aritmetika yang tidak dimiliki Slither
  konteksnya. (Fase 3)
- **Risiko sentralisasi.** Semua temuan F-01 s.d. F-04 di §8 adalah fungsi
  yang bekerja **persis seperti yang ditulis**. Slither tidak menandai
  `sweep` karena `sweep` tidak salah secara kode — ia hanya berbahaya secara
  kewenangan.
- **Asumsi kepercayaan off-chain.** Seluruh §3.3 tidak terlihat oleh alat
  statik apa pun.
- **Logika bisnis.** Apakah ember `caps[1]` seharusnya bulanan atau harian
  (F-05) adalah pertanyaan niat, bukan pertanyaan kode.

Karena itu, ketiadaan temuan Slither **tidak boleh dikutip** sebagai bukti
keamanan kontrak.

---

## 5. Sapuan Kelas Kerentanan

⬜ **Menunggu Fase 2.**

Direncanakan mencakup, minimal: reentrancy lintas fungsi, access control per
fungsi, integer overflow/underflow dan pembulatan pembagian, front-running dan
MEV, manipulasi `block.timestamp` pada batas ember cap (§4.3.3), replay tanda
tangan lintas chain dan lintas kontrak, penanganan return value ERC-20,
kegagalan diam, batas gas, dan pemeriksaan silang antara komentar kontrak
dengan perilaku kode yang sebenarnya.

## 6. Analisis Invarian Ekonomi

⬜ **Menunggu Fase 3.**

Direncanakan mencakup, minimal: kecukupan kolam 150 juta IDM terhadap 50
miliar IDMX pada rate 50:1, dampak ratchet rate satu arah terhadap kapasitas
kolam, prosedur `setLifetimeCap` (`SwapInitiator.sol:158-166`) beserta
kebenaran rumusnya, interaksi cap harian reward × cap mingguan swap ×
`globalThreshold`, ekonomi fee 1 IDM flat pada nilai swap minimum, dan
konsistensi angka ekonomi antara dokumentasi dan parameter on-chain.

## 7. Kesiapan Operasional

⬜ **Menunggu Fase 4.**

Direncanakan mencakup, minimal: verifikasi apakah kelima peran istimewa
(§3.2) dipegang alamat yang berbeda, status multisig/timelock, penyimpanan
kunci penandatangan, prosedur rotasi kunci, cakupan pemantauan on-chain
(khususnya ketiadaan circuit breaker di sisi BSC), runbook insiden dan
prosedur pause, status verifikasi source di explorer (§1), dan kelengkapan
uji.

---

## 8. Daftar Temuan Lengkap

**Status semua temuan: Terbuka.** Belum ada perbaikan kode.

Kolom **Rekomendasi** sengaja ditulis singkat pada fase ini. Fase 1 adalah
fase pemetaan; rancangan perbaikan yang lengkap disusun setelah Fase 2 dan
Fase 4 selesai, agar perbaikan tidak dirancang sebelum sistemnya dipahami
utuh.

---

### F-01 — `owner` `SwapClaim` dapat menguras seluruh kolam penukaran dalam satu transaksi

| | |
|---|---|
| **ID** | F-01 |
| **Severity** | **Critical** |
| **Kontrak:baris** | `SwapClaim.sol:190-193` (`sweep`) |
| **Sumber** | Fase 1 — peta hak istimewa (§3.2 Peran 1) |
| **Status** | Terbuka |
| **Commit perbaikan** | — |

**Deskripsi.**
`sweep(address to, uint256 amount)` memindahkan IDM dari kontrak ke alamat mana
pun, dalam jumlah berapa pun, dan hanya memerlukan `onlyOwner`
(`SwapClaim.sol:190`). Satu-satunya validasi adalah `to != address(0)`
(`:191`). Tidak ada timelock, tidak ada batas per-transaksi, tidak ada batas
harian, tidak ada daftar tujuan yang diizinkan, tidak ada persyaratan multisig
di level kontrak.

Kontrak ini memegang kolam penukaran sebesar 150.000.000 IDM
(`scripts/fund-swap-pool.mjs:51`) — kolam yang menjadi satu-satunya sumber
pembayaran bagi setiap IDMX yang sudah dibakar di opBNB.

Fungsi ini tidak salah secara implementasi; ia bekerja persis seperti yang
ditulis. Yang menjadikannya temuan adalah kewenangannya, dan kriteria yang
dipakai bursa saat menilai listing: apakah ada satu kunci yang dapat mengambil
nilai yang menjadi hak pengguna.

**Skenario eksploitasi.**
1. User membakar IDMX melalui `SwapInitiator.swap` di opBNB. Burn bersifat
   permanen dan tidak dapat dibatalkan (`SwapInitiator.sol:250` →
   `IDMX.sol:135-144`).
2. Relayer menandatangani `SwapVoucher` untuk burn tersebut. Voucher berlaku
   sampai `deadline`.
3. Sebelum user menukarkan voucher, pemegang kunci `owner` `SwapClaim` —
   entah tim sendiri, entah penyerang yang berhasil mengambil kunci lewat
   phishing atau malware — memanggil
   `sweep(alamat_penyerang, 150_000_000e18)`.
4. Seluruh kolam berpindah dalam satu transaksi. Tidak ada jeda waktu untuk
   bereaksi.
5. Setiap `claim` berikutnya gagal di `SwapClaim.sol:258` karena saldo tidak
   cukup. IDMX user sudah musnah, IDM-nya tidak pernah diterima. Tidak ada
   jalur pemulihan on-chain: `SwapInitiator` tidak punya fungsi untuk
   mengembalikan IDMX yang sudah dibakar, dan `IDMX` tidak punya `mint`.

Skenario yang sama berlaku untuk seluruh IDMX yang sudah dibakar tetapi
voucher-nya belum ditukar pada saat `sweep` dieksekusi.

**Nuansa yang harus dinilai auditor.**
Kolam ini bukan deposit kustodian: user tidak pernah menyetorkan IDM ke
kontrak ini. Kolam adalah aset penerbit yang dialokasikan untuk menjamin
penukaran. Argumen bahwa ini bukan "dana user" dapat diajukan. Argumen
tandingannya — dan alasan temuan ini diberi severity Critical — adalah bahwa
begitu user membakar IDMX secara permanen, klaim user atas kolam menjadi tidak
dapat dibatalkan, dan `sweep` menghapus klaim itu secara sepihak. Penyusun
dokumen ini memilih severity yang lebih tinggi secara sadar; auditor pihak
ketiga dipersilakan menyesuaikan.

**Rekomendasi (ringkas, dirinci setelah Fase 4).**
Pertimbangkan: timelock pada `sweep`, batas jumlah per periode, tujuan yang
dibatasi ke alamat treasury tetap, atau kepemilikan multisig. Alternatif yang
menghilangkan temuan sepenuhnya: hapus `sweep` dan tangani migrasi dengan
kontrak `SwapClaim` yang dapat menerima kolam dari pendahulunya lewat
mekanisme yang tidak bisa mengarahkan dana ke luar sistem.

---

### F-02 — Kebocoran `swapSigner` memungkinkan penerbitan voucher fiktif tanpa batas agregat

| | |
|---|---|
| **ID** | F-02 |
| **Severity** | **High** |
| **Kontrak:baris** | `SwapClaim.sol:81` (`swapSigner`), `:101` (`nonceUsed`), `:226-235` (`claim`) |
| **Sumber** | Fase 1 — peta hak istimewa (§3.2 Peran 4), asumsi A-2 |
| **Status** | Terbuka |
| **Commit perbaikan** | — |

**Deskripsi.**
`SwapClaim` membayar voucher berdasarkan **satu-satunya** syarat: tanda tangan
yang cocok dengan `swapSigner` (`SwapClaim.sol:230`). Kontrak tidak memiliki
cara apa pun untuk memverifikasi bahwa burn yang diklaim benar-benar terjadi di
opBNB — tidak ada bukti Merkle, tidak ada pembacaan state lintas chain, tidak
ada oracle. `nonceUsed` (`:101`, dicek di `:229`) hanya menolak nonce yang
**sudah** dipakai; ia tidak dapat menolak nonce yang **tidak pernah ada**.
Ruang nonce adalah `uint256` penuh.

Pembatas yang ada hanya `maxIdmxPerVoucher` (`:235`), yang membatasi **per
voucher**, bukan agregat. `SwapClaim` **tidak memiliki**: batas jumlah klaim
per hari, batas total yang dibayarkan, batas per alamat penerima, maupun
circuit breaker otomatis. Ini kontras dengan `SwapInitiator` di sisi opBNB
yang memiliki ketiganya (`SwapInitiator.sol:220`, `:225`, `:243`).

**Skenario eksploitasi.**
1. Penyerang memperoleh kunci privat `swapSigner`. Kunci ini hidup di server
   aplikasi (`lib/swap/relayer-server.ts`) — permukaan serangan yang jauh
   lebih luas daripada kunci dingin: kompromi server, kebocoran variabel
   lingkungan, akses orang dalam, kerentanan rantai pasok dependensi.
2. Penyerang membuat `SwapVoucher{user: alamat_sendiri, idmxBurned: 2000e18,
   nonce: N, deadline: jauh_di_depan}` dan menandatanganinya. Nilai `N` cukup
   dipilih dari rentang yang belum dipakai — misalnya nonce yang sangat besar,
   yang tidak akan pernah dicapai `nonceCounter` asli.
3. Panggil `claim`. Semua gerbang lolos: tidak di-pause, belum kedaluwarsa,
   nonce belum dipakai, tanda tangan cocok, `2000e18 <= maxIdmxPerVoucher`.
   Dibayar 39 IDM (`2000/50 − 1`).
4. Ulangi dengan nonce berbeda. Tidak ada state on-chain yang bertambah untuk
   membatasi laju: `nonceUsed` hanya tumbuh, tidak ada akumulator yang dicek.

**Perhitungan jujur atas plafon dan friksinya.**
Pada `maxIdmxPerVoucher = 2.000` IDMX dan rate 50, satu voucher membayar
39 IDM neto. Menguras 150.000.000 IDM memerlukan ≈ **3.850.000 transaksi**
di BSC. Itu friksi nyata: biaya gas dan waktu blok yang tidak sepele, dan
jendela panjang bagi pemantauan untuk bereaksi dengan `setPaused(true)`
(`SwapClaim.sol:184-187`). Jadi ini **bukan** pencurian satu transaksi, dan
`maxIdmxPerVoucher` memang memberi perlindungan nyata — itu harus diakui.

Namun terhadap penyerang dengan waktu dan modal tak terbatas, plafon
kerugiannya tetap seluruh kolam, dan satu-satunya rem adalah **reaksi manusia**,
bukan aturan on-chain. Severity ditetapkan High dan bukan Critical karena
eksploitasi memerlukan kompromi kunci (prasyarat yang diasumsikan tidak
terjadi) dan karena friksinya nyata.

**Catatan tambahan.** Komentar kontrak `SwapClaim.sol:49-51` menyatakan "Even
a fully compromised relayer cannot pay the same burn twice." Pernyataan itu
akurat — replay memang dicegah. Tetapi pembacaan sepintas dapat menyimpulkan
lebih dari yang dijamin: relayer yang dikompromikan tetap dapat membayar burn
yang **tidak pernah terjadi**. Auditor akan menguji perbedaan ini.

**Rekomendasi (ringkas).**
Pertimbangkan batas agregat on-chain di sisi BSC yang mencerminkan
`globalThreshold` di sisi opBNB — misalnya plafon IDM terbayar per periode
dengan auto-pause, sejajar dengan `SwapInitiator.sol:243`. Ini akan mengubah
plafon kerugian dari "seluruh kolam" menjadi "satu periode".

---

### F-03 — Kebocoran `voucherSigner` tidak dibatasi cap, karena cap dikunci per alamat

| | |
|---|---|
| **ID** | F-03 |
| **Severity** | **High** |
| **Kontrak:baris** | `MissionRewards.sol:83` (`voucherSigner`), `:92` (`claimedOnDay`), `:244-246` (penegakan cap) |
| **Sumber** | Fase 1 — peta hak istimewa (§3.2 Peran 4), asumsi A-4 dan A-5 |
| **Status** | Terbuka |
| **Commit perbaikan** | — |

**Deskripsi.**
Akumulator cap `claimedOnDay` dikunci `[user][bucket][day]`
(`MissionRewards.sol:92`), dan penegakannya (`:246`) membandingkan pemakaian
**alamat tersebut** terhadap `caps[bucket]`. Cap karena itu membatasi
**per alamat**, bukan secara agregat.

Penyerang yang memegang `voucherSigner` tidak dibatasi oleh cap sama sekali:
ia cukup menerbitkan voucher untuk alamat baru setiap kali. Membuat alamat EVM
tidak memerlukan biaya dan tidak memerlukan transaksi. Plafon kerugian adalah
seluruh saldo IDMX yang dipegang kontrak (100.000.000 IDMX pada konfigurasi
testnet, `scripts/deploy-rewards.mjs:50`).

Komentar kontrak `MissionRewards.sol:46-49` menyatakan: *"Payout caps are
enforced on-chain. Per-day accumulation is tracked here, so a bug or a
compromise in the backend cannot exceed it."* Pernyataan itu benar untuk
**satu alamat**, dan tidak benar untuk **total pembayaran**. Perbedaan ini
perlu ditegaskan karena komentar tersebut adalah salah satu klaim keamanan
utama kontrak, dan auditor pihak ketiga hampir pasti akan mengujinya.

**Skenario eksploitasi.**
1. Penyerang memperoleh kunci `voucherSigner` (hidup di server aplikasi,
   `lib/missions/relayer.ts`).
2. Menghasilkan 10.000 keypair secara lokal — gratis, offline, tanpa jejak
   on-chain.
3. Untuk setiap alamat, menandatangani voucher `amount = caps[0]` (250 IDMX)
   dengan `missionId` sembarang — kontrak tidak memvalidasi `missionId` dan
   komentar `:61` menyatakannya eksplisit sebagai "opaque to this contract".
4. Menukarkan seluruhnya. Setiap klaim lolos `:246` karena setiap alamat
   memakai kuotanya sendiri yang masih penuh.
5. Hasil: 2.500.000 IDMX dalam satu hari dari 10.000 alamat. Skala ini hanya
   dibatasi biaya gas opBNB, yang sangat rendah.

**Rem yang tetap bekerja (dan layak dicatat).**
IDMX curian tidak langsung menjadi IDM. Untuk mencairkannya penyerang harus
melewati `SwapInitiator`, yang membatasi 2.000 IDMX per dompet per minggu
UTC+7 (`SwapInitiator.sol:220`) dan mem-pause dirinya sendiri saat volume
mingguan agregat menembus `globalThreshold` (`:243`). Pertahanan berlapis ini
benar-benar bekerja dan secara substansial menurunkan dampak finansial akhir.
Severity High, bukan Critical, sebagian karena rem ini.

**Rekomendasi (ringkas).**
Pertimbangkan akumulator agregat harian di `MissionRewards` — plafon total
IDMX yang dapat dibayarkan kontrak per hari UTC+7, terlepas dari alamat
penerima. Selain itu, pertimbangkan meluruskan komentar `:46-49` agar
menyatakan batasannya secara tepat (per-alamat, bukan agregat); komentar
yang menjanjikan lebih dari yang ditegakkan kode adalah hal yang selalu
ditandai auditor.

---

### F-04 — `owner` `MissionRewards` dapat menarik seluruh float reward dalam satu transaksi

| | |
|---|---|
| **ID** | F-04 |
| **Severity** | **High** |
| **Kontrak:baris** | `MissionRewards.sol:177-180` (`sweep`) |
| **Sumber** | Fase 1 — peta hak istimewa (§3.2 Peran 2) |
| **Status** | Terbuka |
| **Commit perbaikan** | — |

**Deskripsi.**
Pola yang identik dengan F-01: `sweep(to, amount)` memindahkan IDMX ke alamat
mana pun dalam jumlah bebas, hanya dengan `onlyOwner`
(`MissionRewards.sol:177`), tanpa timelock dan tanpa batas.

Severity lebih rendah daripada F-01 karena sifat aset yang berbeda. IDMX di
`MissionRewards` adalah float yang belum menjadi milik siapa pun: user belum
membakar apa pun untuk memperolehnya, dan tidak ada tindakan user yang tidak
dapat dibatalkan yang bergantung padanya. Ini kontras dengan kolam IDM di
F-01, yang menjamin burn yang sudah permanen.

Yang tetap membuatnya temuan: **voucher yang sudah ditandatangani dan belum
ditukar**. Voucher tersebut merepresentasikan reward yang sudah diperoleh user
menurut aturan aplikasi. Setelah `sweep`, `claim` gagal di
`MissionRewards.sol:258` karena saldo kosong — dan `nonce` voucher tidak
terbakar (transaksi revert seluruhnya, sesuai desain di `:254-258`), sehingga
voucher masih dapat ditukar bila kontrak diisi ulang. Kerugiannya karena itu
bersifat sementara dan dapat dipulihkan, tidak permanen seperti F-01.

**Skenario eksploitasi.**
1. Backend menandatangani voucher reward untuk sejumlah user; sebagian belum
   ditukar.
2. Pemegang kunci `owner` memanggil `sweep(alamat_penyerang, saldo_penuh)`.
3. Seluruh float IDMX berpindah dalam satu transaksi.
4. Semua `claim` yang tertunda gagal. Reward yang sudah diperoleh user tidak
   dapat dibayar sampai kontrak diisi ulang oleh pihak yang sama yang baru
   saja mengosongkannya.

**Rekomendasi (ringkas).**
Sama dengan F-01: timelock, batas per periode, atau tujuan yang dibatasi ke
alamat treasury tetap. Karena `MissionRewards` memang dirancang untuk diisi
ulang secara rutin, membatasi tujuan `sweep` ke satu alamat treasury tetap
kemungkinan tidak mengganggu operasi sama sekali.

---

### F-05 — Ember cap "bulanan" (`caps[1]`) diakumulasi per HARI, bukan per bulan

| | |
|---|---|
| **ID** | F-05 |
| **Severity** | **Medium** |
| **Kontrak:baris** | `MissionRewards.sol:92` (kunci mapping), `:244-246` (penegakan), `:53` dan `:65` (komentar & dokumentasi field) |
| **Sumber** | Fase 1 — inventaris fungsi pengubah state (§3.1) |
| **Status** | Terbuka |
| **Commit perbaikan** | — |

**Deskripsi.**
Dokumentasi kontrak menyatakan ada dua ember cap yang berbeda periodenya:
komentar `MissionRewards.sol:53` menyebut *"bucket 0 is the daily allowance,
bucket 1 is the monthly one"*, dan definisi field `:65` mengulangnya:
*"0 = daily allowance, 1 = monthly allowance"*.

Kodenya tidak membedakan periode keduanya. Akumulator tunggal
`claimedOnDay[user][bucket][day]` (`:92`) dikunci oleh **hari** untuk kedua
ember, dan penegakan di `:244-246` menghitung `day = dayUtc7(block.timestamp)`
tanpa percabangan berdasarkan `bucket`:

```solidity
uint256 day = dayUtc7(block.timestamp);              // :244
uint256 used = claimedOnDay[v.user][v.bucket][day];  // :245
if (used + v.amount > caps[v.bucket]) revert CapExceeded();  // :246
```

Akibatnya `caps[1]` — 450 IDMX pada konfigurasi testnet
(`scripts/deploy-rewards.mjs:54`) — di-reset setiap hari UTC+7, bukan setiap
bulan. Ember "bulanan" secara efektif adalah ember harian kedua.
Fungsi view `remainingAllowance` (`:222-226`) konsisten dengan kode, bukan
dengan komentar: ia juga memakai hari untuk kedua ember.

Konsekuensi pada plafon on-chain: total yang dapat diklaim satu alamat per hari
adalah `caps[0] + caps[1]` = 250 + 450 = **700 IDMX per hari**, bukan 250 IDMX
per hari sebagaimana disebut dalam ringkasan ekonomi proyek. Dalam sebulan,
plafon on-chain untuk ember 1 adalah ±30 × 450 = 13.500 IDMX, bukan 450.

**Skenario eksploitasi.**
Pada operasi normal, dampaknya kemungkinan besar nol: backend-lah yang
memutuskan kapan menandatangani voucher ember 1, dan jika backend benar hanya
menandatanganinya sekali sebulan, plafon on-chain yang longgar tidak pernah
tersentuh.

Dampaknya muncul persis pada skenario yang menjadi alasan cap ini ada, yaitu
saat backend tidak lagi dapat dipercaya (bandingkan komentar `:44-49`, yang
menyatakan cap ada supaya *"a bug or a compromise in the backend cannot exceed
it"*):

1. Backend mengalami bug, atau kunci `voucherSigner` bocor (lihat F-03).
2. Penyerang menerbitkan voucher ember 1 sebesar 450 IDMX untuk sebuah alamat.
3. Hari berikutnya (UTC+7), akumulator alamat itu untuk ember 1 kembali nol.
   Voucher 450 IDMX berikutnya lolos.
4. Diulang setiap hari: 13.500 IDMX per alamat per bulan dari ember yang
   dimaksudkan memberi 450.

Dikombinasikan dengan F-03 (cap per-alamat, bukan agregat), pengganda ini
berlaku untuk setiap alamat yang dibuat penyerang.

**Ketidakpastian yang dinyatakan terbuka — TIDAK YAKIN.**
Dokumen ini **tidak dapat memastikan mana yang benar: komentarnya atau
kodenya.** Ada dua kemungkinan yang sama masuk akal:
(a) niatnya memang ember bulanan dan implementasinya kurang — ini bug;
(b) niatnya sejak awal adalah dua ember harian terpisah agar reward
bernilai tinggi tidak memakan jatah reward harian, dan komentarnya yang usang
— ini masalah dokumentasi.

Argumen untuk (b): komentar `MissionRewards.sol:52-53` (*"a low-frequency,
higher-value reward does not consume the allowance meant for everyday
rewards"*) menggambarkan tujuan **pemisahan** ember, dan tujuan itu tetap
tercapai pada kedua tafsiran.

Argumen untuk (a), yang tampaknya lebih kuat: komentar di skrip deployment
(`scripts/deploy-rewards.mjs:52-53`) menjelaskan asal angka 450 sebagai
*"segel bulanan (150) + runtun 30 hari (300) kini berbagi ember yang sama, dan
keduanya bisa diklaim di bulan yang sama"*. Kedua komponen itu — segel bulanan
dan runtun 30 hari — adalah peristiwa **bulanan** menurut namanya sendiri, dan
angka 450 disusun sebagai jatah untuk satu bulan, bukan untuk satu hari. Bila
pembacaan ini benar, `caps[1]` memang dimaksudkan bulanan dan
kode `:244-246` tidak mengimplementasikannya.

Karena itu penyusun **condong** ke tafsiran (a), tetapi tidak menyatakannya
sebagai kepastian: bukti di atas berasal dari komentar skrip deployment, bukan
dari spesifikasi desain, dan komentar dapat usang sebagaimana halnya komentar
kontrak. Severity Medium mencerminkan sisa ketidakpastian ini. **Konfirmasi
niat desain diperlukan dari tim sebelum temuan ini difinalkan**, dan analisis
kuantitatifnya masuk Fase 3.

Terlepas dari tafsiran mana yang benar, satu hal pasti bermasalah: komentar
`:53` dan `:65` saat ini **tidak menggambarkan perilaku kode**. Ketidaksesuaian
antara komentar dan kode pada jalur penegakan cap adalah hal yang selalu
ditandai auditor.

**Rekomendasi (ringkas).**
Tentukan niat desainnya lebih dulu. Jika bulanan yang dimaksud: tambahkan
indeks periode per-ember (misalnya `monthUtc7`) alih-alih memakai `dayUtc7`
untuk kedua ember. Jika dua ember harian yang dimaksud: perbaiki komentar
`:53` dan `:65` serta ringkasan ekonomi proyek agar sesuai.

---

### F-06 — Burn IDMX tidak memiliki jalur pemulihan on-chain bila relayer tidak menandatangani

| | |
|---|---|
| **ID** | F-06 |
| **Severity** | **Medium** |
| **Kontrak:baris** | `SwapInitiator.sol:250-251` (burn + event), `SwapClaim.sol:226-232` (satu-satunya jalur pembayaran) |
| **Sumber** | Fase 1 — asumsi kepercayaan A-1 (§3.3), trust boundary (§3.4) |
| **Status** | Terbuka |
| **Commit perbaikan** | — |

**Deskripsi.**
`SwapInitiator.swap` memusnahkan IDMX user secara permanen di
`SwapInitiator.sol:250` dan mengemit `SwapRequested` di `:251`. Sejak titik
itu, satu-satunya cara user memperoleh IDM adalah voucher yang ditandatangani
`swapSigner` dan ditukarkan di `SwapClaim.claim`
(`SwapClaim.sol:226-232`).

**Tidak ada mekanisme on-chain yang memaksa relayer menandatangani.** Tidak ada
timeout, tidak ada jalur klaim tanpa izin berdasarkan bukti, tidak ada fungsi
refund, tidak ada escrow. Kontrak `SwapInitiator` tidak menyimpan catatan burn
per user yang bisa dijadikan dasar klaim belakangan — hanya akumulator agregat
(`usedThisWeek`, `weeklyTotal`, `totalBurned`, `:230-232`) dan event. Dan
`IDMX` tidak memiliki fungsi `mint` (`IDMX.sol:43-145`), sehingga IDMX yang
sudah dibakar tidak dapat dikembalikan oleh siapa pun, termasuk penerbit.

Komentar `SwapInitiator.sol:37-42` menyatakan invarian sistem: *"A BURN CAN
NEVER BE REFUSED REDEMPTION."* Invarian itu ditegakkan dengan benar untuk
setiap alasan penolakan yang berada **di dalam kontrak** — semua gerbang
(`:215`, `:216`, `:220`, `:225`) memang berada sebelum burn di `:250`, dan
verifikasi baris demi baris mengonfirmasi tidak ada jalur yang melewatinya.
Yang tidak dijangkau invarian itu adalah penolakan yang terjadi **di luar
kontrak**: relayer yang mati, terkompromikan, di-pause secara internal, atau
sekadar tidak menandatangani.

Severity Medium, bukan lebih tinggi, karena skenarionya memerlukan kegagalan
operasional pihak penerbit dan bukan tindakan penyerang eksternal; dan karena
pemulihan manual (menerbitkan voucher belakangan, atau kompensasi off-chain)
tetap mungkin selama penerbit masih beroperasi dan kooperatif. Yang hilang
adalah **jaminan** — dan bagi bursa, "user bisa kehilangan token secara
permanen kalau server penerbit mati" adalah pertanyaan yang akan diajukan.

**Skenario eksploitasi.**
Ini lebih tepat disebut skenario kegagalan daripada eksploitasi, karena
pemicunya tidak harus jahat:

1. User memanggil `swap(2000e18)`. IDMX-nya musnah di `:250`.
2. Sebelum relayer memproses event `SwapRequested`, salah satu terjadi:
   server relayer mati permanen; kursor blok relayer melewati event tersebut
   dan tidak pernah kembali; kunci `swapSigner` dicabut karena insiden
   keamanan; atau perusahaan berhenti beroperasi.
3. Voucher tidak pernah diterbitkan.
4. User tidak memiliki IDMX (musnah) dan tidak memiliki IDM (tidak pernah
   dibayar). Tidak ada fungsi on-chain yang dapat dipanggil siapa pun —
   termasuk owner — untuk memulihkan keadaan.

Varian yang lebih tajam: relayer yang dikompromikan dapat **memilih** untuk
tidak menandatangani voucher milik alamat tertentu, yaitu penyensoran
per-user, tanpa jejak on-chain yang membedakannya dari kegagalan teknis biasa.

**Rekomendasi (ringkas).**
Tidak ada perbaikan sederhana tanpa mengubah model jembatan, dan rancangannya
sebaiknya menunggu Fase 3/Fase 4. Arah yang dapat dipertimbangkan: pencatatan
burn per-user di `SwapInitiator` sehingga ada dasar klaim yang persisten;
mekanisme klaim cadangan dengan timeout; atau — yang paling murah — menyatakan
ketergantungan ini secara eksplisit dalam dokumentasi user dan dalam berkas
yang diserahkan ke bursa, alih-alih membiarkan komentar `:37-42` terbaca
sebagai jaminan menyeluruh.

---

### F-07 — `SwapClaim` tidak memiliki circuit breaker, tidak seperti `SwapInitiator`

| | |
|---|---|
| **ID** | F-07 |
| **Severity** | **Informational** |
| **Kontrak:baris** | `SwapClaim.sol:226-260` (tidak ada akumulator laju), bandingkan `SwapInitiator.sol:243-248` |
| **Sumber** | Fase 1 — pertanyaan penyerang (§3.5) |
| **Status** | Terbuka |
| **Commit perbaikan** | — |

**Deskripsi.**
Kedua sisi jembatan memiliki profil pertahanan yang asimetris.

Sisi opBNB (`SwapInitiator`) memiliki tiga lapis pembatas laju yang bekerja
otomatis: cap mingguan per dompet (`:220`), plafon seumur hidup (`:225`), dan
circuit breaker yang mem-pause kontrak sendiri saat volume mingguan agregat
menembus ambang (`:243-248`), dengan event peringatan dini di 70% (`:246`).

Sisi BSC (`SwapClaim`) tidak memiliki satu pun dari itu. Kontrak tidak
menyimpan akumulator apa pun yang mencatat berapa banyak IDM telah dibayarkan
— tidak per hari, tidak per periode, tidak total. `nonceUsed` (`:101`) hanya
mencatat nonce mana yang terpakai, bukan volume. Satu-satunya kendali adalah
`setPaused` (`:184-187`) yang harus dipicu manusia.

Ini bukan bug: setiap fungsi bekerja seperti yang ditulis, dan asimetrinya
mungkin disengaja dengan alasan bahwa laju sudah dibatasi di sisi burn. Alasan
itu valid **selama** setiap voucher benar-benar berasal dari burn yang lolos
`SwapInitiator`. Justru pada skenario di mana asumsi tersebut runtuh — F-02,
kompromi `swapSigner` — sisi BSC menjadi satu-satunya lapis yang tersisa, dan
di sana tidak ada lapis otomatis sama sekali.

Dicatat sebagai Informational karena tidak dapat dieksploitasi sendiri; ia
adalah pengali dampak bagi F-02, bukan kerentanan tersendiri. Auditor mungkin
menilainya sebagai bagian dari F-02 alih-alih temuan terpisah.

**Skenario eksploitasi.**
Tidak ada, secara mandiri. Lihat F-02 langkah 4: ketiadaan akumulator laju di
sisi BSC adalah alasan mengapa penyerang yang memegang `swapSigner` hanya
dihentikan oleh reaksi manusia, bukan oleh aturan on-chain.

**Rekomendasi (ringkas).**
Dipertimbangkan bersama F-02.

---

### F-08 — Enam dari tujuh peran istimewa dipegang satu kunci yang sama, termasuk kunci panas server

| | |
|---|---|
| **ID** | F-08 |
| **Severity** | **High** (menjadi **Critical** bila konfigurasi ini terbawa ke mainnet) |
| **Kontrak:baris** | Konfigurasi deployment, bukan cacat kode. Fungsi terdampak: `SwapClaim.sol:190-193`, `MissionRewards.sol:158-180`, `SwapInitiator.sol:148-176`, `ReportAttestation.sol:106-115`, `:146-153` |
| **Sumber** | Pemeriksaan konfigurasi on-chain (§1.3) |
| **Status** | Terbuka |
| **Commit perbaikan** | — |

**Deskripsi.**
Pembacaan `eth_call` terhadap deployment testnet menunjukkan satu alamat,
`0x1842498b06c146b5360d4b8d863a04a7c33fb2f3`, memegang enam dari tujuh peran
istimewa dalam sistem:

- `owner` `SwapClaim` — termasuk `sweep` atas kolam 150.000.000 IDM
- `owner` `MissionRewards` — termasuk `sweep` atas float IDMX
- `owner` `SwapInitiator` — termasuk `setPaused` atas satu-satunya pintu keluar IDMX
- `owner` `ReportAttestation`
- `voucherSigner` `MissionRewards` — penandatangan voucher reward
- `relayer` `ReportAttestation` — penyegel atas nama user

Hanya `swapSigner` (`0xbc2bfb1a…3c97`) yang terpisah. `pendingOwner` keempat
kontrak bernilai `address(0)`: tidak ada perpindahan kepemilikan ke multisig
yang sedang berjalan.

Ini bukan cacat kode. Setiap kontrak menulis perannya sebagai variabel yang
terpisah dan **memang dirancang** untuk diisi alamat yang berbeda — kodenya
sudah benar. Yang bermasalah adalah konfigurasi deployment-nya.

Yang membuat temuan ini lebih serius daripada sekadar "kurang pemisahan
tugas" adalah **sifat salah satu peran yang digabungkan**. `voucherSigner`
bukan kunci dingin: ia harus tersedia bagi server aplikasi setiap kali sebuah
voucher reward ditandatangani, sehingga ia hidup di lingkungan dengan
permukaan serangan yang jauh lebih luas — variabel lingkungan, dependensi
npm, akses operasional, kompromi host. Menggabungkan kunci panas itu dengan
kepemilikan `SwapClaim` berarti kompromi server aplikasi tidak lagi berhenti
pada "penyerang dapat menerbitkan voucher misi palsu" (F-03), melainkan
langsung menjadi "penyerang memanggil `sweep` dan mengambil kolam 150 juta IDM
dalam satu transaksi" (F-01).

Efek utama temuan ini terhadap F-01 sampai F-04 adalah pada **likelihood**,
bukan pada impact. Keempat temuan itu ditulis dengan asumsi implisit bahwa
kunci `owner` adalah kunci dingin yang jarang dipakai dan terpisah dari kunci
penandatangan. Konfigurasi on-chain membatalkan asumsi tersebut.

Temuan ini juga membatalkan sebagian mitigasi berlapis yang dicatat sebagai
kekuatan sistem di §3.5: rem `SwapInitiator` (weekly cap, circuit breaker)
memang menahan penyerang yang hanya memegang `voucherSigner` — tetapi pemegang
kunci yang sama juga adalah `owner` `SwapInitiator`, sehingga ia dapat
menaikkan `weeklyCap` dan `globalThreshold` lebih dulu, atau melewati jalur
swap sepenuhnya lewat `SwapClaim.sweep`.

**Skenario eksploitasi.**
1. Penyerang mengompromikan server aplikasi — jalur yang sama yang menjadi
   prasyarat F-03, dan permukaan serangan terluas dalam sistem ini.
2. Alih-alih menerbitkan voucher misi (lambat, dibatasi rem berlapis di
   `SwapInitiator`), penyerang memakai kunci yang sama untuk memanggil
   `SwapClaim.sweep(alamat_penyerang, saldo_penuh)` di BSC.
3. Kolam 150.000.000 IDM berpindah dalam satu transaksi.
4. Opsional, dalam blok yang sama: `MissionRewards.sweep` mengambil float
   IDMX, dan `SwapInitiator.setPaused(true)` mengunci pintu keluar sehingga
   pemulihan menjadi lebih sulit.

Tidak ada satu pun langkah di atas yang memerlukan kunci kedua, persetujuan
kedua, atau jeda waktu.

**Penilaian severity.**
Ditetapkan **High** dan bukan Critical karena deployment yang diperiksa adalah
**testnet**, sehingga aset yang benar-benar berisiko saat ini adalah aset uji.
Yang membuatnya tetap High dan bukan Informational: skrip deploy yang sama
(`scripts/deploy-rewards.mjs`, `deploy-swap-bsc.mjs`, `deploy-swap-opbnb.mjs`)
meneruskan `owner = msg.sender` (`MissionRewards.sol:133`,
`SwapInitiator.sol:131`, `SwapClaim.sol:135`, `ReportAttestation.sol:99`) dan,
ketika `MISSION_VOUCHER_ADDRESS` kosong, memakai alamat deployer sebagai
penandatangan (`scripts/deploy-rewards.mjs:139`) — yaitu penggabungan ini
adalah **perilaku default dari prosedur deployment**, bukan kekhilafan sekali
jalan. Tanpa
perubahan prosedur, konfigurasi yang sama akan terbentuk lagi di mainnet, dan
di sana severity-nya **Critical**.

`scripts/deploy-rewards.mjs:127-131` memang memuat peringatan agar owner
dipindahkan ke multisig sebelum mainnet, dan `deploy-swap-opbnb.mjs:56-63`
menolak berjalan di mainnet tanpa parameter yang dihitung eksplisit. Keduanya
menunjukkan kesadaran atas risiko ini. Yang belum ada adalah penegakannya.

**Rekomendasi (ringkas, dirinci di Fase 4).**
Pisahkan minimal tiga peran ke tiga kunci berbeda: (a) `owner` — multisig
dengan timelock, tidak pernah menyentuh server; (b) `voucherSigner` dan
`swapSigner` — kunci panas terpisah satu sama lain, tanpa kewenangan `owner`
apa pun; (c) `relayer` — kunci operasional terpisah. Isi
`MISSION_VOUCHER_ADDRESS` agar penandatangan tidak jatuh ke alamat deployer.
Verifikasi pemisahan ini sebagai gerbang rilis mainnet, bukan sebagai
langkah pasca-deploy.

---

## 9. Lampiran

### 9.1 Keluaran mentah Slither

Disimpan lengkap, tanpa penyuntingan, di:

- [`docs/audit/slither-raw.txt`](slither-raw.txt) — keluaran teks apa adanya,
  termasuk baris perintah kompilasi
- [`docs/audit/slither-raw.json`](slither-raw.json) — keluaran terstruktur
  (`--json`), berisi `impact` dan `confidence` per temuan

Header berkas `.txt` mencantumkan tanggal, commit, versi Slither, versi solc,
dan perintah persis yang dijalankan, agar hasilnya dapat direproduksi.

Reproduksi:

```bash
# solc 0.8.26 (biner statis resmi) diperlukan — pragma dikunci ketat
curl -sSL -o solc-0.8.26 \
  https://github.com/ethereum/solidity/releases/download/v0.8.26/solc-static-linux
chmod +x solc-0.8.26

slither contracts/ --solc ./solc-0.8.26
```

### 9.2 Daftar asumsi kepercayaan

Daftar lengkap A-1 sampai A-10 ada di **§3.3**. Ringkasannya: sistem ini
bergantung pada empat hal yang tidak ditegakkan kode —

1. **Relayer swap jujur dan hidup** (A-1, A-2, A-3). Ini asumsi terbesar.
   Jembatan ini adalah jembatan bertanda tangan, bukan jembatan kriptografis;
   tidak ada bukti on-chain yang menghubungkan burn di opBNB dengan pembayaran
   di BSC.
2. **Backend jujur menerbitkan voucher misi** (A-4). `missionId` opaque bagi
   kontrak (`MissionRewards.sol:61`).
3. **Anti-Sybil ditangani di luar kontrak** (A-5). Semua cap on-chain dikunci
   per alamat.
4. **Disiplin operator saat mengubah parameter lintas chain** (A-7). Urutan
   operasi yang benar hanya ada di komentar, tidak di kode — dan memang tidak
   bisa ditegakkan on-chain karena kedua kontrak ada di chain berbeda.

Ditambah asumsi infrastruktur: manajemen kunci (A-8), keandalan chain (A-9),
akurasi timestamp (A-10), dan kebenaran alamat token saat deploy (A-6).

### 9.3 Riwayat perubahan dokumen

| Tanggal | Fase | Yang ditambahkan | Commit |
|---|---|---|---|
| 2026-08-31 | Verifikasi on-chain (pelengkap Fase 1) | §1.2 pembuktian kesetaraan bytecode on-chain ↔ kode sumber untuk keenam kontrak (termasuk masking `immutableReferences`, ekstraksi nilai immutable, dan verifikasi ulang `domainSeparator`). §1.3 konfigurasi on-chain terverifikasi. Menutup asumsi A-6 dan menjawab pertanyaan tabrakan alamat di §1. Temuan baru **F-08**. Ditambahkan `scripts/verify-contracts.mjs`. | `31857946` (kode yang dianalisis) |
| 2026-08-31 | Bagian A — Slither | §4 lengkap (konfigurasi, tabel triase 11 temuan, penjelasan 4 kelas positif palsu, batas analisis otomatis). Lampiran §9.1 + berkas `slither-raw.txt` dan `slither-raw.json`. | `31857946` (kode yang dianalisis) |
| 2026-08-31 | Fase 1 — Rekonstruksi & threat model | Kerangka dokumen §0–§9. §1 informasi kontrak + parameter deployment. §2 arsitektur, diagram alur nilai lintas chain, empat pintu keluar nilai. §3 inventaris 38 fungsi pengubah state, peta 5 hak istimewa, 10 asumsi kepercayaan, trust boundary, pertanyaan penyerang per kontrak. §8 temuan F-01 s.d. F-07. | `31857946` (kode yang dianalisis) |
| — | Fase 2 — Sapuan kelas kerentanan | ⬜ Menunggu | — |
| — | Fase 3 — Invarian ekonomi | ⬜ Menunggu | — |
| — | Fase 4 — Kesiapan operasional | ⬜ Menunggu | — |

**Kode kontrak tidak diubah sama sekali** selama Fase 1 dan Bagian A. Commit
`31857946a18d997b61960ce9422484e82064a8a6` adalah versi yang dianalisis, dan
tetap menjadi versi kontrak saat dokumen ini ditulis — commit dokumen ini
hanya menambahkan berkas di `docs/audit/`.
