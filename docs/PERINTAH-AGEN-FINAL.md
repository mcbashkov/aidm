# PERINTAH EKSEKUSI — Sisi Token AIDM (FINAL)

> Untuk agen di VSCode. Sumber kebenaran tunggal; menggantikan §16 dan bagian
> "Ekonomi reward IDMX" di PROGRESS.md. Disusun 2026-08-20 oleh PO (MC Basyar)
> + Claude setelah diskusi penuh. Semua angka di sini FINAL — jangan tebak,
> jangan "perbaiki".
>
> **Ekonomi token: §0.1 versi 2, dikunci PO 9 September 2026.** Versi
> 28 Agustus 2026 MATI. Tabel §0 di bawah memuat parameter operasional kontrak
> (cap, minimum, fee) yang TIDAK berubah; alokasi, vesting, harga, dan treasury
> seluruhnya ada di §0.1.
>
> **Target deploy batch ini: TESTNET saja** — opBNB Testnet (5611) + BSC
> Testnet (97). Mainnet (204/56) menyusul setelah verifikasi manual PO.

---

## 0. Keputusan final (tabel referensi)

| Parameter | Nilai |
|---|---|
| Suplai IDMX | **50.000.000.000 × 1e18**, dicetak penuh ke treasury saat deploy |
| Burn IDMX | **Burn sejati** — totalSupply berkurang, terlihat di scanner |
| Nama token BSC | **"IDM Reborn"**, simbol **"IDM"**, 18 desimal |
| Suplai IDM Reborn | **1.000.000.000 × 1e18**, tanpa mint, burn tersedia |
| Tax beli/jual | **TIDAK ADA** — ERC-20 standar murni (kompatibilitas listing) |
| Kurs swap | **50 IDMX = 1 IDM**, disimpan on-chain di SwapClaim |
| Ratchet kurs | **On-chain**: rate hanya bisa TURUN (50→lebih kecil = makin murah hati) |
| Fee swap | **Flat 1 IDM per klaim, 100% DIBAKAR** |
| Minimum tukar | **500 IDMX** (ditolak di opBNB, sebelum burn) |
| Cap tukar | **2.000 IDMX / minggu WIB / dompet** (ditolak di opBNB) |
| Circuit breaker | Global mingguan; **alert-event di 70%, auto-pause di 100%**; ambang owner-settable, awal = 3× proyeksi permintaan normal |
| Kolam swap | **150.000.000 IDM** ditransfer ke SwapClaim, dibuka penuh |
| Cap misi | `setCap(0, 250e18)` harian · `setCap(1, 450e18)` bulanan |
| Gas | opBNB disponsori (dust top-up); klaim BSC dibayar user |


### 0.1 Tokenomics IDM Reborn — FINAL v2 (dikunci PO 2026-09-09)

> **Ini blok kanonik.** PRD, README, PROGRESS, BRIEF-EKONOMI-TOKEN, laporan
> pra-audit, landing page, dan whitepaper merujuk ke sini — **tidak menyalin
> angkanya**. Salinan yang tersebar adalah tempat-tempat untuk menyimpang.
> Bila penyalinan tidak terhindarkan, wajib menyertakan baris
> *"snapshot §0.1 per 9 Sep 2026"*.
>
> **Versi 28 Agustus 2026 DINYATAKAN MATI** — bukan alternatif, bukan varian.
> Alokasi lamanya (30/20/15/15/12/5/3, tanpa pos migrasi) tidak boleh dipakai
> lagi di berkas mana pun.
>
> Perubahan pokok v1 → v2: **pos Migrasi Holder v1 (16%) lahir**, dan seluruh
> pos lain menyusut untuk memberi ruang. Private sale turun harga
> ($0,00333 → $0,003571 — diskon 28,6%, bukan 33%). Treasury turun 15% → 10%.
> Skema penandatangan treasury dicabut seluruhnya 9 Sep 2026 — dompet tunggal.

**Parameter dasar** *(tidak berubah dari v1, terverifikasi on-chain)*

| Parameter | Nilai |
|---|---|
| Suplai IDM Reborn | **1.000.000.000** tetap, tanpa mint |
| Jaringan | BNB Chain |
| Fee transfer | 1 IDM flat, 100% burn |
| Tax beli/jual | **Tidak ada** — ERC-20 standar murni (kompatibilitas listing) |
| Suplai IDMX | **50.000.000.000** di opBNB |
| Kurs IDMX → IDM | **50 : 1**, one-way ratchet, **sudah terpasang on-chain** |
| Harga launch | **$0,005** · FDV **$5.000.000** |
| Private sale | **$500.000 @ $0,003571** (diskon **28,6%**) |

#### Alokasi suplai

| Pos | % | Token | Rincian |
|---|---:|---:|---|
| Ecosystem & Rewards | 26% | 260.000.000 | 150.000.000 kolam swap (SwapClaim, BSC) + 110.000.000 cadangan reward |
| Liquidity | 18% | 180.000.000 | 80.000.000 DEX LP + 100.000.000 CEX reserve |
| **Migrasi Holder v1** | **16%** | **160.000.000** | Terbagi TIGA — lihat rincian di bawah |
| Private Sale | 14% | 140.000.000 | $500.000 @ $0,003571 |
| Treasury | 10% | 100.000.000 | Dompet tunggal perusahaan · `0x97Fbc7f…78D9` |
| Team & Founders | 10% | 100.000.000 | Cliff 12 bulan + vesting 24 bulan |
| Marketing | 4% | 40.000.000 | |
| Advisors | 2% | 20.000.000 | Cliff 6 bulan + vesting 18 bulan |

Diperiksa: persen berjumlah **100%**, token berjumlah **1.000.000.000**.

**Pos "Migrasi Holder v1" adalah pos BARU.** Versi lama tidak memilikinya sama
sekali — jangan mencoba mencocokkannya dengan struktur lama.

#### Jadwal pelepasan

| Pos | TGE | Cliff | Linear |
|---|---|---|---|
| DEX LP (80 jt) | penuh, LP token di-lock | — | — |
| CEX Reserve (100 jt) | 0% | — | hanya dengan perjanjian listing resmi |
| Kolam swap (150 jt) | terkunci di kontrak, dilepas per klaim | — | — |
| Cadangan reward (110 jt) | 5% | — | 48 bulan |
| **Migrasi — saldo < 250.000 IDM** | **100%** | — | — |
| **Migrasi — saldo ≥ 250.000 IDM** | **20%** | — | **6 bulan, dihitung dari TGE** |
| Private Sale | 5% | 3 bulan | 12 bulan |
| Treasury | 10% | — | 36 bulan |
| Team | 0% | 12 bulan | 24 bulan |
| Marketing | 15% | — | 12 bulan |
| Advisors | 0% | 6 bulan | 18 bulan |

> **Vesting migrasi dihitung dari TGE, BUKAN dari tanggal klaim.** Ini bukan
> detail implementasi — ia menentukan siapa yang dirugikan. Bila dihitung dari
> tanggal klaim, pemegang yang mengklaim terlambat justru selesai vesting
> paling akhir; keterlambatan membaca pengumuman berubah menjadi hukuman.

**Angka turunan dari daftar migrasi aktual — `data/migration-allocations.csv`,
490 alamat, snapshot 9 September 2026.**

| | Alamat | Token | Di TGE | Linear |
|---|---:|---:|---:|---:|
| Saldo < 250.000 | 360 (73,5%) | 25.175.685,35 | 25.175.685,35 | — |
| Saldo ≥ 250.000 | 130 | 120.907.014,06 | 24.181.402,81 | 96.725.611,25 |
| **Total** | **490** | **146.082.699,41** | **49.357.088,17** | **96.725.611,25** |

Emisi bulanan migrasi: **16.120.935 token/bulan selama 6 bulan**.

**Pos migrasi 160.000.000 terbagi TIGA — ketiganya berdiri sendiri.**

| Bagian | Token | Keadaan |
|---|---:|---|
| Kewajiban terverifikasi | **146.082.699,41** | 490 alamat, sudah masuk root merkle |
| **Disisihkan menunggu verifikasi** | **586.060,85** | Alamat penerima belum diketahui. **BUKAN dihapus, BUKAN dilebur ke kolam keterlambatan** |
| Kolam keterlambatan | **13.331.239,74** | Mekanisme pro-rata **belum ditentukan** |
| **Jumlah** | **160.000.000,00** | Tepat, diperiksa `verify-tokenomics` |

> Alokasi 586.060,85 **disisihkan**, bukan hilang. Melebur­kannya ke kolam
> keterlambatan akan menghapus jejak bahwa ia milik seseorang yang identitasnya
> belum terverifikasi — dan sekali jejak itu hilang, tidak ada yang akan
> mencarinya lagi. Ia berdiri sebagai barisnya sendiri sampai alamatnya
> diketahui, lalu masuk ke root merkle berikutnya.

> Seluruh baris di atas **dihitung ulang dari CSV**, bukan disalin. Reproduksi:
> `pnpm merkle:verify`. Angka kohort versi sebelumnya (487 alamat, 357/130,
> 25.076.287) berasal dari snapshot lama dan **tidak berlaku lagi** — yang
> berubah kelompok di bawah ambang; total kelompok di atas ambang justru
> identik sampai desimal.

> ✅ **SELISIH 685.459 TERJAWAB oleh `data/migration-allocations.csv`
> (9 Sep 2026).** Daftar sungguhan memuat **490 alamat** senilai
> **146.082.699,41 IDM**; ditambah satu alokasi **586.060,85 IDM yang belum
> punya alamat**, jumlahnya **146.668.760,26** — cocok dengan kewajiban
> terverifikasi di tabel alokasi, selisih 0,26 IDM pembulatan. Angka kohort
> lama (487 alamat, 357/130, 25.076.287) berasal dari snapshot sebelumnya;
> yang berlaku sekarang **490 alamat — 360 di bawah ambang · 130 di atas**.
>
> Yang MASIH terbuka: alamat penerima alokasi 586.060,85 IDM. Selama belum
> ada, root merkle hanya sah untuk testnet.
>
> <details><summary>Catatan asli (selisih 685.459) — disimpan sebagai riwayat</summary>
>
> ⚠️ **PERLU KONFIRMASI PO — selisih 685.459 token.**
> Jumlah kedua kohort di atas adalah **145.983.301**
> (25.076.287 + 120.907.014), sedangkan baris alokasi menyebut kewajiban
> terverifikasi **146.668.760**. Keduanya sama-sama dinyatakan berasal dari
> data migrasi aktual, jadi salah satunya perlu diperbaiki di sumbernya.
>
> Konsekuensinya nyata, bukan kosmetik: kolam keterlambatan adalah sisa
> setelah kewajiban, sehingga ia **13.331.240** bila memakai 146.668.760 dan
> **14.016.699** bila memakai jumlah kohort. Angka kohort juga yang menopang
> seluruh jadwal vesting DAN merkle root `MigrationVesting.sol`, sementara
> 146.668.760 hanya muncul sekali di tabel alokasi.
>
> Sampai diputuskan, **daftar alamat terverifikasi adalah rujukan yang
> mengikat** — kontrak dibangun dari daftar itu, bukan dari angka ringkasan
> mana pun. Jangan menyamakan keduanya secara diam-diam.
>
> </details>

#### Sirkulasi TGE

| Sumber | Token |
|---|---:|
| DEX LP | 80.000.000 |
| Migrasi (saldo kecil + 20% saldo besar) | 49.357.088 |
| Treasury 10% | 10.000.000 |
| Private Sale 5% | 7.000.000 |
| Marketing 15% | 6.000.000 |
| Cadangan reward 5% | 5.500.000 |
| **Total** | **157.857.088 (15,79%)** |
| **Market cap awal** | **$789.285** |

*(Angka penuhnya 49.357.088,17 · 157.857.088,17 · $789.285,44 — dibulatkan ke
bawah di tabel. Persentase 15,7857% dibulatkan ke 15,79%.)*

> **Dinyatakan terbuka, bukan disembunyikan:** kolam swap 150 juta dan sisa
> kolam migrasi **tidak** dihitung sebagai sirkulasi (belum diklaim siapa pun)
> tetapi **tetap masuk FDV**. Mengeluarkannya dari FDV akan membuat angkanya
> lebih cantik dan lebih bohong.

#### Treasury

100.000.000 token pada **dompet tunggal milik perusahaan** di BNB Chain:
**`0x97Fbc7fF7A8B9198F9966B7650FAbfb2A59f78D9`**

| Peruntukan | % | Token |
|---|---:|---:|
| Operasional | 45% | 45.000.000 |
| Kemitraan & grant | 20% | 20.000.000 |
| Cadangan darurat | 20% | 20.000.000 |
| Buyback | 15% | 15.000.000 |

> **Perubahan 9 Sep 2026 (keputusan PO): treasury adalah dompet TUNGGAL, bukan
> multisig.** Rencana Safe 2-dari-3 — dan sebelumnya 3-dari-5 — tidak berlaku.
> Alamatnya dipublikasikan, dan **tidak ada label skema penandatangan** yang
> boleh dicantumkan di dokumen mana pun.
>
> Konsekuensinya harus disebut apa adanya, bukan disamarkan: satu kunci
> mengendalikan 100 juta IDM. Ini memperkuat, bukan melemahkan, larangan yang
> sudah berlaku — **jangan pernah mengklaim desentralisasi atau tata kelola
> aman** di whitepaper, landing page, maupun materi apa pun. Temuan audit F-08
> (pemusatan peran istimewa) menjadi makin relevan, bukan berkurang.

#### Koreksi yang berlaku, bukan untuk diperdebatkan

1. **Kolam MissionRewards 100.000.000 adalah IDMX, BUKAN IDM Reborn.** Ia
   diambil dari suplai 50 miliar IDMX di opBNB dan tidak menyentuh suplai
   1 miliar sama sekali. **Tidak ada selisih 10 juta yang perlu dijelaskan.**
   Dokumen yang menyandingkan keduanya seolah satu suplai adalah dokumen yang
   salah.
2. **Suplai IDMX = 50.000.000.000.** Angka 10 triliun sudah dihapus dari
   `BRIEF-EKONOMI-TOKEN.md` dan `PROGRESS.md` — bukan sekadar ditandai usang.
3. **Kurs swap 50 IDMX : 1 IDM sudah terpasang on-chain.** Bukan parameter
   terbuka.

#### Aturan bahasa yang mengikat seluruh repo

Jangan menulis kalimat yang menyebut vesting, buyback, atau mekanisme apa pun
sebagai cara **menjaga atau menaikkan harga**. Rumusan yang dipakai:
**ketertiban distribusi** dan **kedalaman pasar**. Alasannya bukan gaya
bahasa — kalimat yang menyebut harga menempatkan penerbit sebagai pengelola
harga, dan itu posisi yang tidak bisa dipertahankan di hadapan regulator mana
pun.

Larangan lain yang tetap berlaku di seluruh repo:

- "Laporan siap diajukan ke bank" atau klaim kelayakan kredit apa pun
- "Kontrak sudah live" tanpa kata **testnet**
- "Sudah diaudit" — yang ada pra-audit **internal**
- Klaim desentralisasi atau tata kelola aman selama peran istimewa terpusat
- Nilai rupiah dari reward — token belum diperdagangkan

**Parameter yang masih perlu ditinjau sebelum mainnet:**
`maxIdmxPerVoucher` kini **2.000 IDMX** (= 40 IDM per klaim) — setelan
konservatif testnet, kemungkinan terlalu ketat bagi pengguna yang menabung
setahun.

---

## 1. Banner wajib (permintaan langsung PO)

Setiap kontrak yang **dibuat baru, direvisi, atau belum ter-deploy** WAJIB
diawali blok berikut, verbatim (SPDX hanya sekali, di baris pertama):

```solidity
// SPDX-License-Identifier: MIT
/**
 *  ██╗██████╗ ███╗   ███╗    ██████╗ ███████╗██████╗  ██████╗ ██████╗ ███╗   ██╗
 *  ██║██╔══██╗████╗ ████║    ██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔══██╗████╗  ██║
 *  ██║██║  ██║██╔████╔██║    ██████╔╝█████╗  ██████╔╝██║   ██║██████╔╝██╔██╗ ██║
 *  ██║██║  ██║██║╚██╔╝██║    ██╔══██╗██╔══╝  ██╔══██╗██║   ██║██╔══██╗██║╚██╗██║
 *  ██║██████╔╝██║ ╚═╝ ██║    ██║  ██║███████╗██████╔╝╚██████╔╝██║  ██║██║ ╚████║
 *  ╚═╝╚═════╝ ╚═╝     ╚═╝    ╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝
 *
 *                                                                  by MC Basyar
 *
 *  ─────────────────────────────────────────────────────────────────────────────
 *  IDM Reborn — Official Channels
 *  ─────────────────────────────────────────────────────────────────────────────
 *  Website   : https://idmtoken.com/
 *  Telegram  : https://t.me/IDM_Token
 *
 *  Creator — MC Basyar
 *  Website   : https://mcbasyar.org
 *  Twitter/X : https://x.com/MCBasyar_IDM
 *  Instagram : https://www.instagram.com/mc_basyar
 *  ─────────────────────────────────────────────────────────────────────────────
 */
pragma solidity 0.8.26;
```

Berlaku untuk: **IDMX.sol (revisi), MissionRewards.sol (belum deploy),
IDMReborn.sol, SwapInitiator.sol, SwapClaim.sol.**
Pengecualian: **ReportAttestation.sol JANGAN disentuh** (sudah live di testnet);
banner ditambahkan nanti saat siklus deploy mainnet.

## 2. Konvensi umum semua kontrak

Ikuti gaya yang sudah terbukti di repo: Solidity **0.8.26**, **tanpa dependensi
eksternal** (tidak ada OpenZeppelin — seluruh kode auditable dalam satu berkas),
custom errors (bukan string revert), event untuk setiap perubahan state penting,
ownable **dua langkah** (transferOwnership → acceptOwnership), pausable per
kontrak, checks-effects-interactions.

**Bahasa komentar: INGGRIS** *(diubah PO 2026-08-20 — menggantikan instruksi
"komentar berbahasa Indonesia" di versi sebelumnya).* Kontrak adalah artefak
publik yang akan dibaca auditor pihak ketiga (mis. CertiK) dan siapa pun di
block explorer. Komentar tetap menjelaskan **KENAPA**, bukan sekadar apa —
hanya bahasanya yang berganti.

**Dilarang merujuk dokumen internal di dalam kontrak** — tidak ada `PRD §8.1`,
`AC §7.6`, dan sejenisnya. Pembaca di luar tim tidak punya akses ke dokumen itu,
sehingga rujukan semacam itu menjadi jalan buntu. Tuliskan alasannya secara utuh
dan berdiri sendiri di dalam komentar.

**Identifier juga Inggris** — nama error, fungsi publik, state, dan parameter
ikut masuk ABI dan terbaca auditor saat men-decode revert. Konvensi terpakai:

| Indonesia | Inggris |
|---|---|
| `SaldoKurang` / `IzinKurang` / `AlamatNol` | `InsufficientBalance` / `InsufficientAllowance` / `ZeroAddress` |
| `NonceTerpakai` / `VoucherKedaluwarsa` / `TandaTanganTidakSah` | `NonceAlreadyUsed` / `VoucherExpired` / `InvalidSignature` |
| `EmberTidakDikenal` / `MelebihiCap` / `JumlahNol` | `UnknownBucket` / `CapExceeded` / `ZeroAmount` |
| `nonceTerpakai` / `terklaim` / `hariWib` / `sisaJatah` | `nonceUsed` / `claimedOnDay` / `dayUtc7` / `remainingAllowance` |
| `OFFSET_WIB` | `UTC7_OFFSET` |

**Untuk kontrak yang belum ditulis**, §5–§6 di bawah masih memakai nama
Indonesia — terjemahkan mengikuti pola yang sama saat mengimplementasikan:
`capMingguan`→`weeklyCap`, `ambangGlobal`→`globalThreshold`,
`plafonKumulatif`→`lifetimeCap`, `totalDibakarKumulatif`→`totalBurned`,
`nonceBerjalan`→`nonceCounter`, `dipakaiMingguan`→`usedThisWeek`,
`totalMingguan`→`weeklyTotal`, `mingguWib`→`weekUtc7`,
`sisaJatahMinggu`→`remainingWeeklyAllowance`, `DiBawahMinimum`→`BelowMinimum`,
`MelebihiCapMingguan`→`WeeklyCapExceeded`,
`MelebihiPlafonKumulatif`→`LifetimeCapExceeded`,
`RatchetDilanggar`→`RatchetViolation`, `VoucherJanggal`→`VoucherOutOfRange`,
`JumlahTerlaluKecil`→`AmountTooSmall`. **Semantiknya tidak berubah sedikit pun.**

**Nilai balik ERC-20 WAJIB diperiksa** *(ditambahkan 2026-08-20, hasil review
eksternal)*: setiap `transfer`/`transferFrom` dibungkus
`if (!token.transfer(...)) revert TransferFailed();`. IDMX/IDM kita memang
revert sendiri saat gagal, tapi guard ini menutup jalur kehilangan dana bila
transfer mengembalikan `false` setelah state (nonce, akumulator) sudah ditulis —
di **SwapClaim** ini pengaman invariant §6 (IDMX sudah terbakar di opBNB sebelum
voucher terbit; transfer gagal senyap = burn tanpa penebusan). Cukup cek
boolean — **jangan** pakai SafeERC20: kedua token milik kita dan patuh standar,
SafeERC20 hanya menambah kompleksitas untuk token nyeleneh yang tidak kita
pakai. Sudah diterapkan di MissionRewards (`claim` + `sweep`).

`ReportAttestation.sol` **ikut diselaraskan 2026-08-20** (banner + komentar
Inggris). Identifier-nya memang sudah Inggris sejak awal, jadi **ABI-nya
IDENTIK** dan kontrak yang sudah live tetap kompatibel — tidak perlu redeploy.

---

## 3. IDMX.sol — REVISI (belum ter-deploy, aman diubah)

1. **Banner** (§1) menggantikan header lama.
2. **Perbarui komentar** yang menyebut "10 triliun" → jelaskan suplai di-set
   saat deploy (50 miliar) dan tak bisa bertambah, hanya bisa berkurang via burn.
3. `totalSupply`: dari `immutable` → **storage biasa** (tetap tanpa fungsi mint).
4. Tambah:

```solidity
event Burned(address indexed from, uint256 value);

function burn(uint256 value) external {
    _burn(msg.sender, value);
}

/// Untuk SwapInitiator: bakar atas izin (allowance) user.
function burnFrom(address from, uint256 value) external {
    uint256 izin = allowance[from][msg.sender];
    if (izin != type(uint256).max) {
        if (izin < value) revert IzinKurang();
        unchecked { allowance[from][msg.sender] = izin - value; }
    }
    _burn(from, value);
}

function _burn(address from, uint256 value) internal {
    uint256 saldo = balanceOf[from];
    if (saldo < value) revert SaldoKurang();
    unchecked {
        balanceOf[from] = saldo - value;
        totalSupply -= value;
    }
    emit Transfer(from, address(0), value);
    emit Burned(from, value);
}
```

`emit Transfer(from, address(0), value)` adalah yang membuat scanner
(opBNBScan) menampilkan burn dan menurunkan Total Supply — persis efek publik
yang diminta PO. Tidak ada perubahan lain pada transfer/approve.

## 4. IDMReborn.sol — BANGUN BARU (BSC)

ERC-20 minimal satu-berkas, meniru IDMX.sol pasca-revisi, dengan tambahan:

- `name = "IDM Reborn"`, `symbol = "IDM"`, `decimals = 18`.
- Konstruktor: `constructor(address treasury)` — cetak `1_000_000_000e18`
  seluruhnya ke treasury. **Tidak ada parameter pasokan** (hard-code; tidak ada
  alasan sah untuk nilai lain) dan **tidak ada fungsi mint**.

### Pemisahan peran deploy (WAJIB — permintaan langsung PO)

Tiga peran, tiga kunci berbeda, jangan dicampur:

- **Deployer IDMReborn = wallet lama IDM Token** (`IDM_LEGACY_DEPLOYER_PRIVATE_KEY`).
  Alasan: alamat ini pernah menyentuh ATH IDM lama; provenance-nya tampil di
  kolom "Creator/Contract Creator" BscScan dan menjadi nilai due-diligence. Wallet
  ini **HANYA** menandatangani 1 tx: deploy IDMReborn. Bukan owner, bukan treasury,
  tidak pernah memegang token.
- **Treasury = wallet baru** (`IDM_TREASURY_ADDRESS`). Konstruktor mencetak 1 miliar
  ke sini. **Alamat ini harus SUDAH ADA sebelum deploy** — salah alamat = suplai
  nyangkut permanen (token tanpa fungsi owner, tak bisa ditarik). Testnet: EOA baru
  biasa. **Mainnet: WAJIB multisig.**
- **Deployer kontrak lain** (IDMX, MissionRewards, SwapInitiator, SwapClaim) =
  `DEPLOYER_PRIVATE_KEY` yang sudah ada. Tidak perlu wallet lama — tidak ada yang
  memeriksa deployer kontrak infrastruktur, dan kontrak saling merujuk via alamat.

Karena IDMReborn **tanpa fungsi owner sama sekali** (tanpa mint/pause/blacklist),
tidak ada yang perlu di-`renounce` — kuasa itu tidak pernah ada. Cerita publik ini
lebih kuat dari renounce dan bisa diverifikasi dari source. Deployer sekali-pakai:
isi tBNB secukupnya → deploy → tidak dipakai lagi.

**Gladi resik:** deploy testnet BSC (97) memakai wallet lama ini sekaligus
membuktikan kuncinya masih hidup dan alurnya benar — tanpa risiko mainnet.
- `burn(uint256)` + `burnFrom(address,uint256)` + event `Burned` — pola sama §3.
  (`burn` dipakai SwapClaim untuk membakar fee.)
- **TANPA pajak transfer, tanpa hook, tanpa blacklist** — transfer standar murni.
  Ini keputusan sadar untuk kompatibilitas CEX/DEX.
- Ownable dua langkah + pausable TIDAK diperlukan di token ini (token = alat
  ukur murni; pause hidup di kontrak swap, bukan di token). Jangan tambah
  kompleksitas di sini.
- Distribusi alokasi (tim/presale/migrasi/vesting) BUKAN urusan kontrak ini —
  treasury mentransfer manual nanti. Batch ini hanya butuh 150 juta → SwapClaim.

## 5. SwapInitiator.sol — BANGUN BARU (opBNB)

Satu-satunya pintu keluar IDMX. **Semua penolakan terjadi DI SINI, sebelum
burn** — karena burn tak bisa dibatalkan, voucher BSC harus selalu bisa ditebus.

### Storage & konstanta

```solidity
IIDMX  public immutable idmx;          // interface: burnFrom
address public owner; address public pendingOwner;
bool    public paused;

uint256 public constant MIN_SWAP   = 500e18;
uint256 public capMingguan;            // awal 2_000e18, owner-settable
uint256 public ambangGlobal;           // awal = 3× proyeksi normal (lihat deploy)
uint256 public plafonKumulatif;        // B3: batas seumur-hidup total burn (IDMX),
                                       // = sisa kolam BSC × rate. Owner-settable, ber-event.
uint256 public totalDibakarKumulatif;  // akumulasi seluruh burn sejak deploy
uint256 public nonceBerjalan;          // penomoran SwapRequested

uint256 private constant OFFSET_WIB = 7 hours;

mapping(address => mapping(uint256 => uint256)) public dipakaiMingguan; // user => minggu => jumlah
mapping(uint256 => uint256) public totalMingguan;                       // minggu => agregat
```

`mingguWib(ts) = (ts + OFFSET_WIB) / 7 days` — konsisten dengan `hariWib` di
MissionRewards.

### Fungsi inti

```solidity
event SwapRequested(address indexed user, uint256 idmxAmount, uint256 indexed nonce, uint256 timestamp);
event BreakerAlert(uint256 minggu, uint256 totalSetelah, uint256 ambang);   // ≥70%
event BreakerTripped(uint256 minggu, uint256 totalSetelah, uint256 ambang); // ≥100% → paused

function swap(uint256 idmxAmount) external {
    if (paused) revert ContractPaused();
    if (idmxAmount < MIN_SWAP) revert DiBawahMinimum();

    uint256 minggu = mingguWib(block.timestamp);
    uint256 dipakai = dipakaiMingguan[msg.sender][minggu];
    if (dipakai + idmxAmount > capMingguan) revert MelebihiCapMingguan();

    // B3: pengaman kolam kering — batas kumulatif seumur hidup terhadap
    // kapasitas kolam BSC (dalam satuan IDMX). Ini PENOLAKAN (sebelum burn),
    // jadi tidak melanggar invariant.
    uint256 kumulatifBaru = totalDibakarKumulatif + idmxAmount;
    if (kumulatifBaru > plafonKumulatif) revert MelebihiPlafonKumulatif();

    uint256 totalBaru = totalMingguan[minggu] + idmxAmount;

    // Efek sebelum interaksi
    dipakaiMingguan[msg.sender][minggu] = dipakai + idmxAmount;
    totalMingguan[minggu] = totalBaru;
    totalDibakarKumulatif = kumulatifBaru;
    uint256 nonce = ++nonceBerjalan;

    // B1 (perbaikan): tx PEMICU DILOLOSKAN — state `paused` tersimpan dan
    // event tercatat karena tx ini sukses; tx BERIKUTNYA tertutup oleh cek
    // `paused` di atas. `revert` di sini justru membatalkan pause-nya sendiri.
    // Overshoot terikat maksimal satu capMingguan (2.000 IDMX = 40 IDM) — bisa
    // diterima. Catatan tepi: bila burnFrom di bawah revert (allowance kurang),
    // trip ikut batal — jinak, tx over-ambang berikutnya akan memicu lagi.
    if (totalBaru >= ambangGlobal) {
        paused = true;
        emit BreakerTripped(minggu, totalBaru, ambangGlobal);
    } else if (totalBaru * 10 >= ambangGlobal * 7) {
        emit BreakerAlert(minggu, totalBaru, ambangGlobal); // monitoring menangkap ini
    }

    idmx.burnFrom(msg.sender, idmxAmount);   // butuh approve dari user (UI urus)
    emit SwapRequested(msg.sender, idmxAmount, nonce, block.timestamp);
}
```

Admin tambahan: `setPlafonKumulatif(uint256)` onlyOwner + event. **Runbook ratchet
(WAJIB, urutannya tidak boleh dibalik):** sebelum `setRate` di BSC, KETATKAN dulu
plafon di opBNB →
`plafonBaru = totalDibakarKumulatif + (sisaKolamIDM × rateBaru) − burnBelumDiklaim`.
*(Dikoreksi 2026-08-21, temuan audit: suku pengurang `burnBelumDiklaim` — IDMX yang
sudah dibakar tapi nonce-nya belum terpakai di SwapClaim, relayer tahu persis —
WAJIB ada. Voucher dibayar pada rate saat KLAIM, jadi burn yang menggantung saat
ratchet akan menarik kolam LEBIH banyak daripada saat diterima; tanpa pengurang
ini plafon kelebihan jatah persis sebesar burn menggantung itu dan klaim ekor
gagal — burn tanpa penebusan.)* Kencangkan dulu, baru longgarkan kurs. Skrip
`scripts/ratchet-check.mjs` menghitung dan memverifikasi kedua nilai sebelum
eksekusi.

Admin: `setCapMingguan`, `setAmbangGlobal`, `setPaused` (unpause manual setelah
breaker), ownable dua langkah, + view `sisaJatahMinggu(address)` untuk UI.

**Catatan penting:** tx `swap()` DIKIRIM WALLET USER (UAW sah untuk DappBay);
relayer hanya menjaga dust BNB user via top-up — bukan mengirim atas nama user.

## 6. SwapClaim.sol — BANGUN BARU (BSC)

Pemegang kolam 150 juta IDM. Pola voucher **identik MissionRewards** (EIP-712,
nonce anti-replay, malleability guard `s` rendah, deadline) — salin pola
`hashVoucher`/`_pulihkan` apa adanya, ganti domain:
`keccak256("AIDM SwapClaim")`, versi "1", chainid BSC.

### Perbedaan dari MissionRewards

```solidity
struct SwapVoucher {
    address user;
    uint256 idmxBurned;   // jumlah IDMX yang dibakar di opBNB
    uint256 nonce;        // = nonce SwapRequested; satu burn = satu klaim
    uint64  deadline;
}

IIDM    public immutable idm;       // interface: transfer, burn
uint256 public rateIdmxPerIdm;      // awal 50; RATCHET: hanya bisa turun
uint256 public constant FEE_IDM = 1e18;   // flat, 100% dibakar
// B2 (perbaikan): backstop voucher janggal dinyatakan dalam IDMX, BUKAN IDM —
// satu voucher mustahil melebihi cap mingguan satu dompet, dan satuan IDMX
// tidak berubah saat rate di-ratchet. Cap dalam IDM pecah begitu rate turun
// (2.000 IDMX @25 = 80 IDM > 50) dan melanggar invariant §6.
uint256 public maxIdmxPerVoucher;         // awal 2_000e18, owner-settable
```

```solidity
function setRate(uint256 rateBaru) external onlyOwner {
    // Ratchet satu arah DI KONTRAK: kurs hanya boleh MEMBAIK bagi user
    // (lebih sedikit IDMX per IDM). Menaikkan kembali = mustahil secara kode.
    if (rateBaru == 0 || rateBaru >= rateIdmxPerIdm) revert RatchetDilanggar();
    rateIdmxPerIdm = rateBaru;
    emit RateChanged(rateBaru);
}

function claim(SwapVoucher calldata v, bytes calldata sig) external {
    if (paused) revert ContractPaused();
    if (block.timestamp > v.deadline) revert VoucherKedaluwarsa();
    if (nonceTerpakai[v.nonce]) revert NonceTerpakai();          // global, bukan per-user
    if (_pulihkan(hashVoucher(v), sig) != swapSigner) revert TandaTanganTidakSah();

    if (v.idmxBurned > maxIdmxPerVoucher) revert VoucherJanggal(); // cek di satuan IDMX (B2)
    uint256 gross = v.idmxBurned / rateIdmxPerIdm;               // rate saat klaim (ratchet pro-user)
    if (gross <= FEE_IDM) revert JumlahTerlaluKecil();           // tak tercapai: min 500/50=10 IDM
    uint256 net = gross - FEE_IDM;

    nonceTerpakai[v.nonce] = true;                                // efek dulu

    idm.burn(FEE_IDM);                                            // fee 100% dibakar
    idm.transfer(v.user, net);
    emit SwapClaimed(v.user, v.idmxBurned, net, v.nonce);
}
```

- **Pengirim tx = user → user bayar gas BSC.** Ini garis monetisasi PO; jangan
  buat jalur relayer-submit di kontrak ini.
- Admin: `setSwapSigner`, `setPaused`, `setMaxIdmxPerVoucher`, `sweep(to,amount)`
  onlyOwner (penyelamatan/migrasi kolam), ownable dua langkah.
- `maxIdmxPerVoucher` awal: `2_000e18` (cermin cap mingguan SwapInitiator; naikkan
  hanya jika cap mingguan dinaikkan — dan **URUTANNYA: naikkan `maxIdmxPerVoucher`
  di BSC DULU, baru `weeklyCap` di opBNB**. *(Dikoreksi 2026-08-21, temuan audit:
  urutan sebaliknya membuka jendela burn yang diterima di opBNB tapi voucher-nya
  ditolak `VoucherOutOfRange` di BSC = burn tanpa penebusan.)*)

## 7. Relayer swap (off-chain, service baru)

- **Bentuk (B4): BUKAN proses websocket 24/7** — app hidup di Vercel (serverless).
  Relayer = route handler `app/api/relayer/tick` (dilindungi `CRON_SECRET`) yang
  di-polling terjadwal **tiap 1 menit**: `getLogs(SwapRequested)` via viem dari
  cursor terakhir → proses → majukan cursor. Pemicu: Vercel Cron bila plan
  mendukung interval 1 menit; bila tidak, penjadwal eksternal apa pun (GitHub
  Actions schedule / cron-job.org) memanggil endpoint yang sama — kode identik,
  hanya pemicunya beda. Latensi ~1 menit dapat diterima: UI memang menampilkan
  status "Diproses → Siap diklaim".
- **Cursor blok di DB** (tabel `relayer_state`), bukan env — env
  `SWAP_RELAYER_CURSOR_BLOCK` hanya nilai bootstrap saat baris DB belum ada (A6).
- Per event: bangun `SwapVoucher{user, idmxBurned, nonce, deadline = now+30 hari}`,
  tandatangani EIP-712 dengan kunci `swapSigner`, simpan voucher di DB, ekspos ke
  frontend via API (auth: user hanya bisa ambil voucher miliknya).
- **Idempoten**: satu nonce → satu voucher, selamanya. Reorg-safe: tunggu N
  konfirmasi (opBNB: 15 blok) sebelum menandatangani.
- Deadline lewat tanpa klaim → relayer boleh menerbitkan ulang voucher baru
  dengan nonce SAMA (nonce di kontrak yang mencegah double-claim, bukan deadline).
- Dust top-up opBNB: cron yang menjaga saldo tBNB wallet user aktif di atas
  ambang untuk `approve` + `swap`. TIDAK menyentuh BSC.
- Kunci `swapSigner` dan `voucherSigner` (misi): **terpisah**, keduanya via
  env/KMS; di mainnet wajib HSM/multisig — catat di README service.

## 8. MissionRewards — konfigurasi + server (TANPA ubah logika kontrak)

1. Tambahkan **banner §1** (kontrak belum deploy; hanya header, nol logika).
2. Deploy via `pnpm deploy:rewards` yang diperbarui: IDMX 50 miliar, lalu
   `setCap(0, 250e18)` dan `setCap(1, 450e18)`.
3. **4 misi baru di server** (definisi misi memang server-side; kontrak hanya
   menebus voucher):

| Kode misi | Hadiah | Bucket | Syarat validasi server |
|---|---|---|---|
| `dua_sisi_harian` | 20e18 | 0 | ≥1 pemasukan DAN ≥1 pengeluaran valid hari WIB itu |
| `suara_harian` | 15e18 | 0 | ≥1 transaksi TERSIMPAN & valid yang berasal dari input suara — bukan sekadar mic terbuka |
| `baca_laporan_mingguan` | 30e18 | 0 | event buka tab Laporan, sekali per minggu WIB |
| `runtun_30` | 300e18 | 1 | 30 hari beruntun; hormati Pelindung Runtun saat fitur itu hadir (fase lanjut — jangan bangun sekarang) |

   Anti-cheat yang ada tetap berlaku (dedup 60 detik, hapus transaksi menurunkan
   progres, 200 entri/hari).
4. **Peringatan saldo kontrak menipis** (utang teknis PROGRESS §3): API cek
   `token.balanceOf(missionRewards)` sebelum menandatangani voucher; jika di
   bawah ambang (misal < 7 hari proyeksi klaim), kembalikan pesan yang jujur ke
   UI + alert ke tim. Berlaku juga untuk saldo IDM di SwapClaim.

## 9. UI (rujuk mockup: docs/mockups/aidm-wallet-card.html, docs/mockups/aidm-swap-sheet.html)

> Dua berkas di `docs/mockups/` adalah **rujukan visual**, bukan kode produksi.
> Bangun ulang sebagai komponen di stack yang ada (Next.js PWA + look krem-emas
> Fraunces/Plus Jakarta Sans) — jangan salin HTML mentah, jangan import berkas ini.

**Kartu wallet (Akun):**
- Saldo **IDMX saja** (baca on-chain — sekaligus menutup utang "hardcode 0").
  Tidak ada kotak IDM Reborn (Opsi B: IDM tidak pernah ada di opBNB).
- Hapus tombol "Hubungkan Wallet" → indikator "Dompet bawaan · aktif" + titik
  hijau. Salin-alamat tetap. "Ekspor wallet/kirim" tetap di menu lanjutan.
- Dua zona di desktop (saldo kiri / aksi kanan), stack di mobile — ikuti mockup.

**Swap sheet (in-app, BUKAN redirect ke platform luar):**
- Input IDMX + chip `500` / `Maks`; live preview "kamu terima X IDM Reborn"
  pada rate dari kontrak; rincian: kurs, gross, fee −1 IDM "(dibakar)", tujuan
  alamat user + badge BSC.
- Tombol nonaktif + alasan bila: < 500, > saldo, > sisa cap mingguan
  (`sisaJatahMinggu`), atau breaker pause.
- **State "belum punya BNB"**: cek saldo BNB (BSC) sebelum tahap klaim; jika 0,
  ganti CTA dengan panduan isi BNB (standar industri: info gas muncul di layar
  konfirmasi, bukan di muka kartu).
- Alur dua langkah yang jujur di UI: (1) "Tukar" → approve+swap di opBNB
  (disponsori, instan), (2) "Klaim di BSC" → muncul setelah voucher siap, user
  bayar gas. Tampilkan status: Diproses → Siap diklaim → Selesai (+ riwayat).
- **Tanpa taksiran rupiah di mana pun** (harga IDM belum terbentuk — terkunci).

## 10. Deploy testnet & env

- Jaringan: **opBNB Testnet 5611** (IDMX, MissionRewards, SwapInitiator) ·
  **BSC Testnet 97** (IDMReborn, SwapClaim).

### Urutan deploy (perhatikan siapa menandatangani apa)

1. **opBNB (deployer biasa `DEPLOYER_PRIVATE_KEY`):** `deploy-rewards.mjs` diperbarui
   → IDMX suplai 50 miliar → `setCap(0,250e18)`, `setCap(1,450e18)` → danai MissionRewards.
2. **BSC — Langkah A (wallet lama `IDM_LEGACY_DEPLOYER_PRIVATE_KEY`):**
   `deploy-idm-bsc.mjs` deploy `IDMReborn(treasury = IDM_TREASURY_ADDRESS)`. **Satu tx.**
   Treasury address WAJIB sudah terisi sebelum langkah ini.
3. **BSC — Langkah B (deployer biasa):** deploy `SwapClaim` → `setSwapSigner` →
   `setMaxIdmxPerVoucher(2_000e18)`.
4. **BSC — Langkah C (kunci treasury `IDM_TREASURY_PRIVATE_KEY`):** transfer
   **150 juta IDM** treasury → SwapClaim. (Mainnet: langkah ini dari UI multisig,
   kunci tidak ada di env.)
5. **opBNB (deployer biasa):** `deploy-swap-opbnb.mjs` → SwapInitiator dengan
   `capMingguan=2_000e18`, `ambangGlobal` kecil untuk testnet (misal `100_000e18`)
   agar breaker bisa diuji, dan `plafonKumulatif` testnet `200_000e18` (agar jalur
   plafon ikut teruji). Mainnet: `plafonKumulatif = 7_500_000_000e18`
   (150 juta IDM × rate 50) — dihitung ulang via runbook ratchet tiap rate berubah.
6. Jalankan relayer swap, set cursor blok awal.

Skrip mencetak semua alamat + env; salin ke `.env.local` dan Vercel. Verifikasi
source di opBNBScan/BscScan testnet (banner ikut tampil — bagian dari niat PO).

> **Dikoreksi 2026-08-31 setelah dijalankan.** Verifikasi Etherscan **tidak
> bisa** untuk opBNB Testnet (5611): setiap pengiriman ditolak
> `General exception occured when attempting to insert record`, termasuk untuk
> kontrak pihak ketiga — jalur tulisnya rusak di sisi Etherscan, bukan di sisi
> kita. Keempat kontrak opBNB akhirnya diverifikasi lewat **Sourcify**, yang
> tidak memberi badge explorer. BSC Testnet lolos normal lewat Etherscan.
> **opBNB Mainnet (204) sudah diuji sampai tahap kompilasi dan bekerja normal**,
> jadi ini kendala khusus testnet. Prosedur, bukti, dan langkah manual lewat
> form web: `contracts/ALAMAT-DAN-CATATAN.md` §8.

### Env tambahan (lengkapi `.env.local.example` yang ada)

**Ikuti pola deteksi "string tidak kosong" di file itu: biarkan field baru
BENAR-BENAR KOSONG sampai kontraknya nyata** — supaya fitur swap jujur menjawab
501 dan tombolnya nonaktif, seperti pola segel/misi.

```bash
# ── IDM Reborn + Swap (BSC + opBNB) — batch token side ──────────────────────
NEXT_PUBLIC_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545
NEXT_PUBLIC_BSC_RPC_URL=https://bsc-dataseed.bnbchain.org
AIDM_SWAP_CHAIN=                      # kosong = dipetakan dari AIDM_REWARD_CHAIN
                                      # (opbnb-testnet→bsc-testnet, opbnb→bsc) —
                                      # konsisten pola repo "kosong = ikut fase app" (A7)

# Deployer KHUSUS IDMReborn = wallet lama IDM (provenance ATH). 1 tx saja.
# Bukan owner, bukan treasury. RAHASIA.
IDM_LEGACY_DEPLOYER_PRIVATE_KEY=

# Treasury penerima 1 miliar IDM. Testnet: EOA baru biasa. Mainnet: WAJIB multisig.
IDM_TREASURY_ADDRESS=                 # ALAMAT publik; harus siap SEBELUM deploy
IDM_TREASURY_PRIVATE_KEY=             # RAHASIA; hanya untuk 1 tx transfer 150 juta (testnet)

# Alamat kontrak (diisi skrip deploy)
NEXT_PUBLIC_IDM_REBORN_ADDRESS=
NEXT_PUBLIC_SWAP_INITIATOR_ADDRESS=
NEXT_PUBLIC_SWAP_CLAIM_ADDRESS=

# Penandatangan voucher swap (relayer opBNB→BSC). RAHASIA.
# TERPISAH dari MISSION_VOUCHER_PRIVATE_KEY — jangan pakai kunci yang sama.
SWAP_SIGNER_PRIVATE_KEY=
SWAP_RELAYER_CURSOR_BLOCK=            # nilai BOOTSTRAP saja; cursor berjalan di DB (A6)
```

Catatan kunci: **tiga peran = tiga kunci berbeda** — `IDM_LEGACY_DEPLOYER`
(deploy token) ≠ `DEPLOYER_PRIVATE_KEY` (deploy infra) ≠ `IDM_TREASURY` (pegang
suplai). `SWAP_SIGNER` ≠ `MISSION_VOUCHER`. Wallet lama juga perlu diisi tBNB di
BSC testnet (97) — sekaligus gladi resik membuktikan kuncinya hidup.

## 11. Pengujian & kriteria terima

Unit (foundry/hardhat, ikuti pola repo):
- IDMX: burn/burnFrom menurunkan totalSupply; burnFrom tanpa allowance revert;
  transfer standar tak berubah.
- SwapInitiator: <500 revert; cap mingguan pas di batas lolos / lebih revert;
  minggu WIB berganti → jatah reset; breaker: 70% emit alert; **tx pemicu ambang
  LOLOS (burn + SwapRequested terjadi), `paused` tersimpan, tx BERIKUTNYA revert
  ContractPaused** (B1); setelah unpause manual bisa lanjut; plafon kumulatif:
  tepat di plafon lolos, melebihi revert `MelebihiPlafonKumulatif` (B3).
- SwapClaim: voucher sah dibayar benar (gross=idmx/rate, net=gross−1, fee
  terbakar → totalSupply IDM turun); nonce dipakai dua kali revert; tanda tangan
  salah revert; `setRate(49)` sukses, `setRate(51)` revert (ratchet);
  klaim setelah rate turun membayar LEBIH banyak (pro-user); voucher
  `idmxBurned > maxIdmxPerVoucher` revert; **voucher 2.000 IDMX tetap tertebus
  setelah `setRate(25)`** (regresi B2); akunting kolam berkurang GROSS
  (net + fee terbakar) sesuai A8.
- Integrasi testnet (manual, seperti kebiasaan repo untuk jalur sukses on-chain):
  alur penuh misi→klaim IDMX→approve→swap→voucher→claim BSC dengan akun uji;
  **verifikasi invariant: tidak ada `SwapRequested` tanpa voucher yang bisa
  ditebus.** Burn tanpa jalur klaim = bug blocker rilis.
- **Verifikasi peran deploy di BscScan testnet:** Contract Creator IDMReborn =
  alamat wallet lama; `balanceOf(treasury) == 1e27` tepat setelah deploy (sebelum
  transfer ke SwapClaim); IDMReborn tidak punya fungsi owner/mint/pause sama sekali.
  ✅ **Terkonfirmasi 2026-08-31:** Contract Creator IDMReborn =
  `0x1f835d8233abb432a295b2e9b414dee46afc2d5d` (berbeda dari deployer
  operasional `0x1842498b…b2f3`), treasury konstruktor =
  `0xf573081596d39d45e20e570e9a23e17a709b70a6`, `totalSupply` 1e27 utuh, dan
  pembacaan baris-per-baris memastikan tidak ada owner/mint/pause.
- `test:api` diperluas untuk jalur penolakan endpoint voucher-swap (pola sama
  dengan misi: jalur sukses on-chain manual, penolakan otomatis).

## 12. DI LUAR SCOPE — jangan dibangun di batch ini

Distribusi alokasi + vesting; klaim migrasi IDM v1 (tunggu snapshot);
leaderboard Teladan + payout bulanan; Pelindung Runtun; seluruh fitur B2B
(lender-pays, sponsor misi, staking, premium-in-IDM — gate legal). Jika ada
keputusan yang tampak kurang, TANYA PO — jangan memutuskan sendiri.