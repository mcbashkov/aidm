# Kontrak IDM — Alamat & Catatan Deployment

Berkas rujukan tunggal untuk keenam kontrak ekosistem IDM. Semua nilai di sini
**dibaca langsung dari chain**, bukan disalin dari dokumentasi atau skrip —
lihat §9 untuk cara memverifikasi ulang sendiri.

| | |
|---|---|
| **Terakhir diperbarui** | 31 Agustus 2026 |
| **Commit kode kontrak** | `31857946a18d997b61960ce9422484e82064a8a6` |
| **Status jaringan** | ⚠️ **TESTNET SAJA** — belum ada deployment mainnet |
| **Analisis keamanan** | [`docs/audit/LAPORAN-PRA-AUDIT.md`](../docs/audit/LAPORAN-PRA-AUDIT.md) |

> ⚠️ **Semua alamat di berkas ini adalah testnet.** Jangan pernah menyalinnya
> ke konfigurasi mainnet. Saat mainnet, seluruh tabel di bawah harus disusun
> ulang dari nol — termasuk §4, karena pemisahan kunci wajib berubah.

---

## 1. Alamat kontrak

### opBNB Testnet — chainId **5611**

| Kontrak | Alamat | Peran |
|---|---|---|
| `IDMX` | `0xccf9551396cb559e5c2caa1006485d051b7cf09a` | Token reward in-app, 50 miliar, tanpa mint |
| `MissionRewards` | `0xbc6f412024cee7e8117bd1ee35759d027fce11e5` | Membayar reward misi atas voucher EIP-712 |
| `SwapInitiator` | `0xa4f00039540dfdd040635a17090bf4e797168b63` | Satu-satunya pintu keluar IDMX (burn) |
| `ReportAttestation` | `0xa83c201c3759fa1a92bd17dbebb46b85029a84c4` | Segel hash laporan; tidak memegang token |

### BSC Testnet — chainId **97**

| Kontrak | Alamat | Peran |
|---|---|---|
| `IDMReborn` | `0x78c7e68142e7e1b564c0fd342954aa515a3d2f5b` | Token IDM, 1 miliar, tanpa owner |
| `SwapClaim` | `0xccf9551396cb559e5c2caa1006485d051b7cf09a` | Memegang kolam 150 juta IDM, membayar voucher swap |

> **Bukan salah ketik:** `IDMX` (opBNB) dan `SwapClaim` (BSC) memang berbagi
> alamat `0xccf955…f09a`. Deployer dan nonce yang sama menghasilkan alamat
> `CREATE` yang sama di dua chain berbeda. Sudah dikonfirmasi lewat
> `eth_getCode`: di alamat itu ada kode yang **berbeda** pada masing-masing
> chain (1.629 byte vs 3.659 byte). Selalu sertakan chainId saat merujuk
> alamat ini.

---

## 2. Detail deployment

| Kontrak | Blok | Waktu (UTC) | Deployer |
|---|---|---|---|
| `ReportAttestation` | 191.748.408 | 2026-08-14 22:27:08 | `0x1842498b…b2f3` |
| `IDMReborn` | 126.285.441 | 2026-08-21 01:14:29 | `0x1f835d82…2d5d` |
| `SwapClaim` | 126.287.629 | 2026-08-21 01:30:53 | `0x1842498b…b2f3` |
| `IDMX` | 193.861.259 | 2026-08-21 01:10:41 | `0x1842498b…b2f3` |
| `MissionRewards` | 193.861.267 | 2026-08-21 01:10:43 | `0x1842498b…b2f3` |
| `SwapInitiator` | 193.867.692 | 2026-08-21 01:37:29 | `0x1842498b…b2f3` |

**Transaksi pembuatan:**

```
IDMX               0x8d964daeeb074d2dc9866d94f6dbcfeecaba61ae89404fdcb3047702a08cbd7e
MissionRewards     0x9ae99e1aa1d8983736789b3fc513ff790f7346d5f60931b7994382e309fda8e5
SwapInitiator      0x41fdb29c2f1832d936fd4383f2e21e434c977838b07a0d99e6526b19df34c868
ReportAttestation  0xe27dfe9f0b19a06b71a0032f4834084735651a1e0ec543aeda836df0b74fa162
IDMReborn          0x4b96c6a34cb3dcefeb475d9d3ec1946494b0c3b7174a3a8874cc4ae399b551d4
SwapClaim          0x6a6c58c19ee0fe9518b2fb8e585ee00b987ccc376a62cdb9aaa54bf085b3de66
```

`IDMReborn` sengaja di-deploy dari dompet terpisah (`0x1f835d82…2d5d`) supaya
Contract Creator di BscScan bukan alamat operasional. Kontrak ini tidak punya
owner, jadi dompet itu tidak memegang kewenangan apa pun setelahnya.

`SWAP_RELAYER_CURSOR_BLOCK` = **193867692** — blok opBNB saat `SwapInitiator`
ter-deploy, dipakai sebagai titik awal kursor relayer.

---

## 3. Argumen konstruktor

Diambil dengan memotong bytecode creation dari input transaksi pembuatan —
jadi ini nilai yang **benar-benar dipakai saat deploy**, bukan rekonstruksi.
Diperlukan bila kontrak harus diverifikasi ulang di explorer.

### `IDMX` — `constructor(address treasury, uint256 supply)`
```
treasury 0x1842498b06c146b5360d4b8d863a04a7c33fb2f3
supply   50000000000000000000000000000        (50 miliar × 1e18)

0x0000000000000000000000001842498b06c146b5360d4b8d863a04a7c33fb2f3
  0000000000000000000000000000000000000000a18f07d736b90be550000000
```

### `MissionRewards` — `constructor(address token_, address voucherSigner_, uint256 dailyCap, uint256 monthlyCap)`
```
token_         0xccf9551396cb559e5c2caa1006485d051b7cf09a   (IDMX)
voucherSigner_ 0x1842498b06c146b5360d4b8d863a04a7c33fb2f3
dailyCap       250e18
monthlyCap     450e18

0x000000000000000000000000ccf9551396cb559e5c2caa1006485d051b7cf09a
  0000000000000000000000001842498b06c146b5360d4b8d863a04a7c33fb2f3
  00000000000000000000000000000000000000000000000d8d726b7177a80000
  000000000000000000000000000000000000000000000018650127cc3dc80000
```

### `SwapInitiator` — `constructor(address idmx_, uint256 weeklyCap_, uint256 globalThreshold_, uint256 lifetimeCap_)`
```
idmx_           0xccf9551396cb559e5c2caa1006485d051b7cf09a   (IDMX)
weeklyCap_      2000e18
globalThreshold_ 100000e18
lifetimeCap_    200000e18

0x000000000000000000000000ccf9551396cb559e5c2caa1006485d051b7cf09a
  00000000000000000000000000000000000000000000006c6b935b8bbd400000
  00000000000000000000000000000000000000000000152d02c7e14af6800000
  000000000000000000000000000000000000000000002a5a058fc295ed000000
```

### `ReportAttestation` — `constructor(address relayer_)`
```
relayer_ 0x1842498b06c146b5360d4b8d863a04a7c33fb2f3

0x0000000000000000000000001842498b06c146b5360d4b8d863a04a7c33fb2f3
```

### `IDMReborn` — `constructor(address treasury)`
```
treasury 0xf573081596d39d45e20e570e9a23e17a709b70a6

0x000000000000000000000000f573081596d39d45e20e570e9a23e17a709b70a6
```
Pasokan 1 miliar di-hardcode sebagai `INITIAL_SUPPLY`, jadi konstruktornya
tidak menerima angka pasokan.

### `SwapClaim` — `constructor(address idm_, address swapSigner_, uint256 maxIdmxPerVoucher_)`
```
idm_              0x78c7e68142e7e1b564c0fd342954aa515a3d2f5b   (IDMReborn)
swapSigner_       0xbc2bfb1a2765700b846abad68328b15093763c97
maxIdmxPerVoucher_ 2000e18

0x00000000000000000000000078c7e68142e7e1b564c0fd342954aa515a3d2f5b
  000000000000000000000000bc2bfb1a2765700b846abad68328b15093763c97
  00000000000000000000000000000000000000000000006c6b935b8bbd400000
```
`rateIdmxPerIdm` tidak ada di konstruktor — di-hardcode 50 dan hanya bisa
turun.

---

## 4. Peran istimewa

Alamat publik saja. **Kunci privat tidak pernah dicatat di berkas ini** dan
tidak boleh masuk ke repo mana pun.

| Peran | Alamat | Kewenangan |
|---|---|---|
| `owner` × 4 kontrak | `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3` | `sweep`, ganti signer, ubah cap, pause |
| `voucherSigner` (`MissionRewards`) | `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3` | Menandatangani voucher reward |
| `relayer` (`ReportAttestation`) | `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3` | Menyegel atas nama user |
| `swapSigner` (`SwapClaim`) | `0xbc2bfb1a2765700b846abad68328b15093763c97` | Menandatangani voucher swap |
| Treasury IDMX (opBNB) | `0x1842498b06c146b5360d4b8d863a04a7c33fb2f3` | Memegang sisa ±49,9 miliar IDMX |
| Treasury IDM (BSC) | `0xf573081596d39d45e20e570e9a23e17a709b70a6` | Memegang sisa ±850 juta IDM |
| `owner` `IDMX` / `IDMReborn` | — | **Tidak ada.** Kedua token tanpa owner. |

`pendingOwner` keempat kontrak = `address(0)` — tidak ada perpindahan
kepemilikan yang sedang berjalan.

> 🔴 **Enam dari tujuh peran dipegang satu alamat yang sama**
> (`0x1842498b…b2f3`), termasuk `voucherSigner` yang merupakan kunci panas di
> server aplikasi — dan kunci itu juga memegang `SwapClaim.sweep` atas kolam
> 150 juta IDM. Ini **temuan F-08 (High)** di laporan pra-audit; wajib
> dipisahkan sebelum mainnet. Lihat
> [§8 F-08](../docs/audit/LAPORAN-PRA-AUDIT.md).

---

## 5. Parameter ekonomi terpasang

Dibaca on-chain; semuanya masih sama dengan nilai deploy (tidak ada drift).

| Parameter | Kontrak | Nilai |
|---|---|---|
| `caps[0]` — ember harian | `MissionRewards` | 250 IDMX |
| `caps[1]` — ember "bulanan" | `MissionRewards` | 450 IDMX |
| `MIN_SWAP` | `SwapInitiator` | 500 IDMX (konstanta) |
| `weeklyCap` | `SwapInitiator` | 2.000 IDMX / dompet / minggu WIB |
| `globalThreshold` | `SwapInitiator` | 100.000 IDMX (breaker auto-pause) |
| `lifetimeCap` | `SwapInitiator` | 200.000 IDMX |
| `rateIdmxPerIdm` | `SwapClaim` | 50 (hanya bisa turun) |
| `FEE_IDM` | `SwapClaim` | 1 IDM per klaim, 100% dibakar (konstanta) |
| `maxIdmxPerVoucher` | `SwapClaim` | 2.000 IDMX |

> ⚠️ `caps[1]` diberi nama "bulanan" di komentar kontrak, tetapi akumulatornya
> dikunci per **hari** (`claimedOnDay[user][bucket][day]`). Efektifnya ember
> harian kedua. Temuan **F-05 (Medium)** — perlu konfirmasi niat desain.

---

## 6. Kondisi terkini (31 Agu 2026)

| Item | Nilai |
|---|---|
| `IDMX.totalSupply` | 50.000.000.000 IDMX (utuh, belum ada burn) |
| `IDMReborn.totalSupply` | 1.000.000.000 IDM (utuh) |
| Kolam IDM di `SwapClaim` | 150.000.000 IDM |
| Float IDMX di `MissionRewards` | ±99.999.340 IDMX (±660 sudah diklaim) |
| `SwapInitiator.totalBurned` | 0 IDMX |
| `SwapInitiator.nonceCounter` | 0 |
| `paused` (keempat kontrak) | Semua aktif |

**Belum ada satu pun swap lintas chain yang dieksekusi.** Jalur dengan risiko
tertinggi dalam sistem ini belum pernah dilalui transaksi nyata.

---

## 7. Setelan kompilasi

Wajib cocok persis untuk verifikasi ulang. Seragam untuk keenam kontrak.

| Item | Nilai |
|---|---|
| Compiler | `v0.8.26+commit.8a97fa7a` |
| Pragma | `pragma solidity 0.8.26;` — dikunci ketat, tanpa `^` |
| Optimizer | Enabled, **200** runs |
| EVM version | `default` (= `cancun` untuk 0.8.26) — **jangan diisi manual** |
| viaIR | Tidak dipakai |
| Metadata hash | `ipfs` (bawaan) |
| Lisensi | MIT |
| Dependensi | **Tidak ada.** Tanpa OpenZeppelin, tanpa `import`. |

> ⚠️ `package.json` menyematkan `solc` sebagai `^0.8.26`, dan `solc@0.8.36`
> sudah ikut terpasang di `node_modules`. Kompilasi ulang di kemudian hari
> tidak dijamin menghasilkan bytecode yang sama. Patok ke `0.8.26` persis bila
> reproduksibilitas penting.

---

## 8. Status verifikasi source

| Kontrak | Chain | Badge di explorer | Sourcify |
|---|---|---|---|
| `IDMReborn` | 97 | ✅ Verified di testnet.bscscan.com | — |
| `SwapClaim` | 97 | ✅ Verified di testnet.bscscan.com | — |
| `IDMX` | 5611 | ❌ **belum** | ✅ `exact_match` |
| `MissionRewards` | 5611 | ❌ **belum** | ✅ `exact_match` |
| `SwapInitiator` | 5611 | ❌ **belum** | ✅ `exact_match` |
| `ReportAttestation` | 5611 | ❌ **belum** | 🟡 `match` (partial) |

> ⚠️ **Keempat kontrak opBNB masih tampil "not verified" di
> opbnb-testnet.bscscan.com.** Sourcify adalah layanan verifikasi yang
> terpisah; explorer tidak mengambil datanya dari sana. Verifikasi Sourcify
> tetap sah dan dapat diperiksa siapa pun di
> `https://repo.sourcify.dev/5611/<alamat>`, tetapi badge di explorer harus
> diurus sendiri — lihat langkah manual di bawah.

**Kenapa API gagal.** Etherscan menolak setiap pengiriman chain 5611 dengan
`General exception occured when attempting to insert record`. Diuji terhadap
dokumentasi resmi endpoint `verifysourcecode`, dan seluruh dugaan dari sisi
kita tersingkir:

| Dugaan | Hasil uji |
|---|---|
| API key / dukungan chain | ❌ bukan — `getsourcecode` dan `txlist` di 5611 normal |
| Kuota habis | ❌ bukan — 99.997 dari 100.000 kredit harian tersisa |
| Chain berbayar | ❌ bukan — modul `account` di 5611 jalan dengan key gratis |
| Format payload | ❌ bukan — `standard-json-input` **dan** `single-file` ditolak sama |
| Ejaan `constructorArguments` vs `constructorArguements` | ❌ bukan — kedua ejaan, dan tanpa argumen sama sekali, ditolak sama |
| `licenseType` | ❌ bukan — dengan maupun tanpa, ditolak sama |
| Klien | ❌ bukan — `forge verify-contract` 1.7.1 error identik |
| Bahan (bytecode) | ❌ bukan — build Foundry dicocokkan dengan on-chain, cocok |
| Endpoint V1 lama | ❌ sudah dimatikan, dipaksa ke V2 |
| **Kontrak kita** | ❌ **bukan** — kontrak pihak lain juga gagal, lihat di bawah |

**Uji yang menentukan.** Sumber IDMX dikirim ke predeploy sistem
`0x4200000000000000000000000000000000000015` — kontrak yang sama sekali bukan
milik kita — di empat chain sekaligus:

| Chain | Hasil |
|---|---|
| opBNB Testnet (5611) | ❌ `General exception ... insert record` |
| **opBNB Mainnet (204)** | ✅ **diterima, GUID keluar, pipeline tuntas** |
| BSC Testnet (97) | ✅ `Contract source code already verified` |
| BSC Mainnet (56) | ✅ `Contract source code already verified` |

Jadi jalur tulis `verifysourcecode` gagal di tahap **insert** untuk **setiap**
kontrak di opBNB Testnet, bukan hanya kontrak kita. Ini murni gangguan di sisi
Etherscan dan tidak ada yang bisa diperbaiki dari sini.

Catatan: mengirim ke alamat **tanpa kode** menghasilkan jawaban sehat
(`Unable to locate ContractCode`) bahkan di 5611 — pemeriksaan itu terjadi
sebelum tahap insert, jadi jangan dipakai sebagai bukti endpoint-nya sehat.

**Uji lanjutan: pipeline mainnet berjalan penuh.** Predeploy pada uji di atas
ternyata sudah terverifikasi, sehingga prosesnya berhenti di "Already
Verified" tanpa benar-benar mengompilasi. Uji diulang pada kontrak opBNB
Mainnet yang **belum** terverifikasi (`0x01f9eb28…be0c`, milik pihak lain),
dengan sumber `IDMX` yang jelas tidak akan cocok:

```
kirim   → status 1, GUID 8mqyz7uram6kinsxynw2rswihfdg27bkdlkldmvuqb6xidyidf
status  → Pending in queue
status  → Fail - Unable to verify. Compiled contract deployment bytecode
          does NOT match the transaction deployment bytecode.
```

Ini membuktikan seluruh rantai pada chain 204 berfungsi: insert diterima,
job masuk antrean, sumber **benar-benar dikompilasi** dengan
`v0.8.26+commit.8a97fa7a`, lalu bytecode dibandingkan. Satu-satunya yang gagal
adalah pencocokannya — persis hasil yang benar ketika sumber yang dikirim
memang bukan milik kontrak itu.

Digabung dengan fakta bahwa kode sumber dan setelan kompilasi kita **sudah
pernah lolos verifikasi Etherscan** pada BSC Testnet (`IDMReborn`,
`SwapClaim`), tidak ada lagi komponen yang belum teruji untuk mainnet.

> ✅ **opBNB Mainnet (204) terbukti bekerja penuh.** Kendala ini khusus testnet
> dan tidak akan terbawa ke mainnet — diuji sampai tahap kompilasi, bukan
> asumsi.

### Langkah manual untuk badge explorer opBNB

Form web-nya berfungsi normal di browser (403 hanya muncul untuk `curl`,
karena proteksi anti-bot). Untuk tiap kontrak:

1. Buka `https://opbnb-testnet.bscscan.com/verifyContract?a=<alamat>`
2. **Compiler Type:** Solidity (Single file) — keenam berkas tanpa `import`
3. **Compiler Version:** `v0.8.26+commit.8a97fa7a`
4. **License:** MIT
5. Tempel isi berkas `.sol` yang bersangkutan apa adanya
6. **Optimization:** Yes · **Runs:** 200
7. **EVM Version:** `cancun`
8. **Constructor Arguments ABI-encoded:** salin dari §3 — **buang awalan `0x`**
   dan sambung jadi satu baris tanpa spasi
9. `ReportAttestation` tidak punya argumen selain satu alamat; `IDMX`,
   `MissionRewards`, `SwapInitiator` wajib diisi

Form web memakai jalur backend yang berbeda dari API, jadi kemungkinan besar
berhasil meski API-nya gagal. Kalau form juga menolak, tidak ada lagi yang
bisa dilakukan dari sisi kita selain menunggu Etherscan memperbaiki 5611 —
dan karena mainnet (204) sudah terbukti normal, ini tidak menghambat rilis.

`ReportAttestation` hanya partial match karena di-deploy dari teks sumber yang
tidak pernah di-commit — badan kodenya identik, hanya hash metadata yang beda.

> ⚠️ **Sebelum deploy mainnet:** uji dulu apakah verifikasi Etherscan bekerja
> untuk **opBNB Mainnet (chainId 204)**. Kalau ternyata menolak juga, Anda akan
> mengetahuinya di saat terburuk — kontrak sudah live dan bursa menunggu badge
> "Verified".

**Menjalankan ulang verifikasi:**
```bash
# butuh ETHERSCAN_API_KEY di .env.local
node scripts/verify-contracts.mjs              # keenam kontrak
node scripts/verify-contracts.mjs SwapClaim    # satu saja
```

---

## 9. Jaringan & cara verifikasi ulang

| Chain | chainId | RPC | Explorer |
|---|---|---|---|
| opBNB Testnet | 5611 | `https://opbnb-testnet-rpc.bnbchain.org` | `opbnb-testnet.bscscan.com` |
| BSC Testnet | 97 | `https://data-seed-prebsc-1-s1.bnbchain.org:8545` | `testnet.bscscan.com` |
| opBNB Mainnet | 204 | `https://opbnb-mainnet-rpc.bnbchain.org` | `opbnb.bscscan.com` |
| BSC Mainnet | 56 | `https://bsc-dataseed.bnbchain.org` | `bscscan.com` |

RPC seed BSC Testnet **tidak melayani state historis** (`missing trie node`).
Untuk query blok lama pakai `https://bsc-testnet-rpc.publicnode.com`.

Etherscan V2 memakai satu API key untuk semua chain
(`https://api.etherscan.io/v2/api?chainid=<id>`), tetapi modul `contract` dan
`account` pada **BSC Testnet butuh paket berbayar** — `getcontractcreation`
dan `txlist` menolak pada paket gratis.

**Memeriksa ulang alamat & parameter:**
```bash
cast call 0xccf9551396cb559e5c2caa1006485d051b7cf09a "totalSupply()(uint256)" \
  --rpc-url https://opbnb-testnet-rpc.bnbchain.org

cast call 0xccf9551396cb559e5c2caa1006485d051b7cf09a "idm()(address)" \
  --rpc-url https://data-seed-prebsc-1-s1.bnbchain.org:8545
```

---

## 10. Aturan operasional yang TIDAK ditegakkan kode

Ditulis di komentar kontrak, tapi tidak ada mekanisme on-chain yang
memaksakannya — kedua kontrak ada di chain berbeda sehingga saling-kunci
memang tidak mungkin. Salah urutan menciptakan **burn yang tidak bisa
ditebus**, yaitu satu-satunya hal yang sistem ini tidak boleh hasilkan.

**Menaikkan cap swap:**
1. Naikkan `maxIdmxPerVoucher` di `SwapClaim` (BSC) **lebih dulu**
2. Baru naikkan `weeklyCap` di `SwapInitiator` (opBNB)

Urutan terbalik membuka jendela di mana burn diterima di opBNB tetapi
voucher-nya ditolak di BSC.

**Memperbaiki rate (ratchet turun):**
1. Perketat `lifetimeCap` di `SwapInitiator` **lebih dulu**, dengan rumus:
   `newCap = totalBurned + sisaKolamIdm × rateBaru − idmxSudahDibakarBelumDiklaim`
2. Baru panggil `setRate` di `SwapClaim`

Pengurangan di akhir rumus penting: voucher dibayar pada rate saat **klaim**,
jadi burn yang masih menggantung akan menarik lebih banyak dari kolam
dibanding saat diterima.

**Setelah circuit breaker trip:** `SwapInitiator` mem-pause dirinya sendiri;
un-pause hanya lewat `setPaused(false)` oleh owner. Selidiki penyebabnya
sebelum membuka kembali.

---

## 11. Yang harus berubah sebelum mainnet

- [ ] **Pisahkan kunci** — `owner` ke multisig bertimelock; `voucherSigner`,
      `swapSigner`, dan `relayer` masing-masing kunci terpisah tanpa
      kewenangan owner. Isi `MISSION_VOUCHER_ADDRESS` agar penandatangan tidak
      jatuh ke alamat deployer. *(F-08)*
- [x] ~~Uji verifikasi chainId 204~~ — ✅ **sudah diuji, bekerja normal.**
      Kendala verifikasi khusus opBNB Testnet dan tidak terbawa ke mainnet. *(§8)*
- [ ] **Hitung `globalThreshold` dan `lifetimeCap`** lewat runbook ratchet —
      skrip deploy menolak berjalan di mainnet tanpa keduanya di env.
- [ ] **Tentukan niat `caps[1]`** — bulanan atau ember harian kedua. *(F-05)*
- [ ] **Patok `solc` ke `0.8.26` persis** di `package.json`. *(§7)*
- [ ] **Selesaikan audit pihak ketiga.** Pra-audit internal bukan
      penggantinya.
- [ ] Susun ulang seluruh berkas ini dengan alamat mainnet.

---

## 12. Rujukan

| Dokumen | Isi |
|---|---|
| [`docs/audit/LAPORAN-PRA-AUDIT.md`](../docs/audit/LAPORAN-PRA-AUDIT.md) | Laporan pra-audit: arsitektur, model ancaman, temuan F-01…F-08 |
| [`docs/audit/slither-raw.txt`](../docs/audit/slither-raw.txt) | Keluaran mentah Slither |
| [`scripts/verify-contracts.mjs`](../scripts/verify-contracts.mjs) | Verifikasi source ke explorer |
| [`contracts/artifacts/`](artifacts/) | ABI + bytecode per kontrak |
| `.env.local.example` | Seluruh variabel lingkungan beserta keterangannya |

**Temuan terbuka** (rincian di laporan pra-audit):

| ID | Severity | Ringkas |
|---|---|---|
| F-01 | Critical | `SwapClaim.sweep` menguras kolam 150 juta IDM dalam satu tx |
| F-02 | High | Kebocoran `swapSigner` → voucher fiktif, tanpa batas agregat |
| F-03 | High | Kebocoran `voucherSigner` → cap per-alamat tidak membatasi total |
| F-04 | High | `MissionRewards.sweep` menarik seluruh float |
| F-08 | High | Enam dari tujuh peran dipegang satu kunci |
| F-05 | Medium | Ember "bulanan" diakumulasi per hari |
| F-06 | Medium | Burn IDMX tanpa jalur pemulihan on-chain |
| F-07 | Info | `SwapClaim` tanpa circuit breaker |
