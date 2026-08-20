# PERINTAH EKSEKUSI — Sisi Token AIDM (FINAL)

> Untuk agen di VSCode. Sumber kebenaran tunggal; menggantikan §16 dan bagian
> "Ekonomi reward IDMX" di PROGRESS.md. Disusun 2026-08-20 oleh PO (MC Basyar)
> + Claude setelah diskusi penuh. Semua angka di sini FINAL — jangan tebak,
> jangan "perbaiki".
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

Berlaku untuk kontrak yang **belum ter-deploy**. `ReportAttestation.sol` sudah
live di testnet — jangan disentuh; penyelarasan bahasanya ikut siklus mainnet
bersama banner.

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
plafon di opBNB → `plafonBaru = totalDibakarKumulatif + (sisaKolamIDM × rateBaru)`.
Kencangkan dulu, baru longgarkan kurs. Skrip `scripts/ratchet-check.mjs` menghitung
dan memverifikasi kedua nilai sebelum eksekusi.

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
  hanya jika cap mingguan dinaikkan).

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
- `test:api` diperluas untuk jalur penolakan endpoint voucher-swap (pola sama
  dengan misi: jalur sukses on-chain manual, penolakan otomatis).

## 12. DI LUAR SCOPE — jangan dibangun di batch ini

Distribusi alokasi + vesting; klaim migrasi IDM v1 (tunggu snapshot);
leaderboard Teladan + payout bulanan; Pelindung Runtun; seluruh fitur B2B
(lender-pays, sponsor misi, staking, premium-in-IDM — gate legal). Jika ada
keputusan yang tampak kurang, TANYA PO — jangan memutuskan sendiri.