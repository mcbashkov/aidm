# Papan Kerja AIDM

Pelacak pekerjaan lintas sesi. **README** menjelaskan produk & cara menjalankan;
berkas ini menjawab satu pertanyaan saja: *apa yang sudah beres, apa berikutnya,
dan siapa yang mengerjakan.*

Diperbarui: **2026-08-28** · cabang `main`

> ⚠️ **Sisi token digantikan `docs/PERINTAH-AGEN-FINAL.md`.** Untuk apa pun yang
> menyangkut IDMX/IDM Reborn/swap/kurs/tokenomics, dokumen itu sumber kebenaran
> tunggal — bagian "Ekonomi reward IDMX" di bawah **sudah usang** (masih menyebut
> suplai & kurs versi lama). Bagian lain papan kerja ini tetap berlaku.
>
> **Batch sisi token — kemajuan:** ✅ **Langkah 1–5 SELESAI & TER-DEPLOY ke
> testnet 2026-08-21** (alamat lengkap di tabel On-chain di bawah). Enam kontrak
> hidup: IDMX 50 miliar + MissionRewards terdanai + SwapInitiator di opBNB;
> IDMReborn 1 miliar + SwapClaim berkolam 150 juta IDM di BSC. Uji anvil
> `pnpm test:swap` 36/36 (kriteria §11 kontrak) + audit multi-agen lolos.
> ✅ **Langkah 6 (relayer) SELESAI** — `POST /api/relayer/tick` memindai
> `SwapRequested`, menandatangani voucher EIP-712, memperpanjang yang mendekati
> kedaluwarsa, menandai yang tertebus. Idempoten (nonce = PK), tahan reorg (15
> konfirmasi), kursor di DB. Teruji terhadap testnet sungguhan. Operasinya:
> `docs/RELAYER-SWAP.md`. ✅ **Penjadwal terpasang 2026-08-22** — project
> dipindahkan ke tim Vercel **Pro** (jadwal 1 menit menggagalkan build di Hobby),
> `vercel.json` menjadwalkan `/api/relayer/tick` tiap menit — **terbukti berputar
> sendiri di produksi 2026-08-21 23:16 UTC**, kursor menyusul kepala rantai.
> ✅ **UI Tukar (§9) SELESAI 2026-08-22** — lembar burn opBNB + panel voucher klaim
> BSC, chain dirakit server (`/api/swap/config`) supaya klien tidak jatuh ke
> mainnet. ⬜ Sisa: `scripts/ratchet-check.mjs` (§5), dust top-up opBNB, dan
> **verifikasi source keenam kontrak di explorer** (§10 — banner PO baru tampil
> setelah terverifikasi; sekaligus gladi resik sebelum mainnet).

**Legenda pemilik:** 🧑 = butuh tangan Anda (kunci, dompet, keputusan bisnis,
perangkat fisik) · 🤖 = bisa saya kerjakan sendiri

---

## Keadaan sekarang

| Milestone | Status | Bukti |
|---|---|---|
| M0 fondasi | ✅ selesai | migrasi 0001–0026, rute & onboarding v3.0 |
| M1 parser & tab Catat | ✅ selesai | `test:parser` 200/200 |
| M2 suara & offline | ✅ selesai | uji lapangan Android 2026-08-14 (3 akun nyata) |
| M3 Laporan & PDF | ✅ selesai | `test:api` mem-baca ulang isi PDF, bukan cuma header |
| M4 segel + misi | ✅ **selesai** | klaim diuji PO di aplikasi 2026-08-26 (spinner → Diklaim + tautan opBNBScan); 11 klaim produksi semuanya `confirmed` |
| M5 premium & kredit | 🟡 berjalan | kredit atomik + purge PDP + hardening sesi beres; sisanya menunggu 4 keputusan PO |
| M6 mainnet & beta | ⬜ belum mulai | — |
| M7 Play & App Store | ⬜ belum mulai | — |

**Gerbang otomatis terkini (2026-08-27):** `test:parser` 200/200 ·
`test:canonical` 23/23 · typecheck bersih · lint bersih · build sukses.

⚠️ **`test:api` masih menunggu satu run penuh.** Penyebab kerapuhannya sudah
dicabut 2026-08-27 (keep-alive dimatikan di harness, §6), tapi belum ada satu
jalan lengkap sesudahnya. Angka 123/123 yang terakhir sah tercatat pada run
2026-08-22 pagi, sebelum batch UI. **Jangan tulis ulang angka itu sebagai "hijau
hari ini"** sampai ada run yang benar-benar selesai — perbaikan harness membuat
run itu MUNGKIN, bukan membuatnya SUDAH terjadi.

**Produksi:** **`ai.idmtoken.com`** — live sejak 2026-08-27, auto-deploy dari
`main` (tim Vercel **Pro** `idmtoken`; `aidm-idmtoken.vercel.app` tetap hidup).
`NEXT_PUBLIC_APP_URL` sudah menunjuk domain itu.

**Privy — keadaan yang sudah terverifikasi (dibaca dari API app 2026-08-27):**
`google_oauth: true` · `email_auth: true` · `sms_auth: false` (karena itu `sms`
dibuang dari `loginMethods`) · **`merge_accounts_by_email: true`** — satu orang =
satu DID = satu wallet, apa pun metode masuknya. Allowlist redirect OAuth yang
DIPAKAI kode hanya satu bentuk: `${origin}/masuk`.

**Kesehatan produksi (2026-08-27):** 9 user · **0 tanpa baris `wallets`** ·
11 klaim misi semuanya `confirmed` dengan `tx_hash` · **0 klaim menggantung** ·
82 transaksi.

**On-chain — SEMUA ter-deploy 2026-08-21 (belum diverifikasi source):**

| Kontrak | Jaringan | Alamat |
|---|---|---|
| ReportAttestation | opBNB testnet 5611 | `0xa83c201c3759fa1a92bd17dbebb46b85029a84c4` |
| IDMX | opBNB testnet 5611 | `0xccf9551396cb559e5c2caa1006485d051b7cf09a` |
| MissionRewards | opBNB testnet 5611 | `0xbc6f412024cee7e8117bd1ee35759d027fce11e5` |
| SwapInitiator | opBNB testnet 5611 | `0xa4f00039540dfdd040635a17090bf4e797168b63` |
| IDMReborn | BSC testnet 97 | `0x78c7e68142e7e1b564c0fd342954aa515a3d2f5b` |
| SwapClaim | BSC testnet 97 | `0xccf9551396cb559e5c2caa1006485d051b7cf09a` |

Alamat IDMX dan SwapClaim **memang identik** — deployer & nonce yang sama di dua
chain berbeda menghasilkan alamat yang sama. Bukan salah tempel; sudah
diverifikasi ke rantainya (`SwapClaim.idm()` menunjuk IDMReborn dengan benar).

Keadaan terverifikasi on-chain: IDMX 50 miliar · MissionRewards terdanai 100 juta
IDMX · IDMReborn 1 miliar (treasury 850 juta, SwapClaim 150 juta) · SwapClaim
rate 50, max voucher 2.000 IDMX, signer `0xBc2b…3c97` · SwapInitiator min 500,
cap 2.000/minggu, ambang 100.000, plafon 200.000 IDMX (angka testnet §10.5),
`nonceCounter` 0 (belum ada swap). **Dibaca ulang dari rantai 2026-08-22 — semua
angka masih persis sama.**

Kursor relayer di DB (`relayer_state`): **dikendalikan cron produksi sejak
2026-08-21 23:16 UTC**, maju tiap menit dan menempel di kepala rantai (menahan 15
konfirmasi). Env `SWAP_RELAYER_CURSOR_BLOCK` sudah tidak berlaku sejak baris itu
ada — karena itu ia sengaja TIDAK dipasang di Vercel.

---

## Titik lanjut — dibaca duluan

Ringkasan satu layar untuk sesi berikutnya. Rinciannya di bagian bernomor
di bawah; ini hanya menjawab *"mulai dari mana"*.

**Menunggu keputusan PO — memblokir saya:**

| # | Apa | Kenapa memblokir |
|---|---|---|
| 1 | **Model kredit gratis** (T-1, §8) | §8.2 berbunyi "reset 00:00 WIB, **tidak menumpuk**"; kode menambah +10 tiap hari tanpa pernah reset — seorang pengguna produksi sudah memegang **120 kredit**. Menumpuk = 3.650 kredit/tahun gratis ≈ 1.216 riset; tidak akan ada yang membeli, dan seluruh M5 dibangun di atas pagar yang bocor. **Harus diputuskan sebelum Midtrans**, karena reset setelah ada pembelian akan memakan kredit berbayar. |
| 2 | **Cakupan Konten & Wizard** (T-3/T-4, §8) | Keduanya nol mesin: `/premium/konten` kartu statis, `/premium/peluang` tidak ada rutenya. Dibangun di M5, atau dicoret dan dicabut dari `/premium`? |
| 3 | **Bentuk admin** (T-8, §8) | `admin_users` 0 baris, tidak ada `/api/admin`. §8.2 menjanjikan tarif "dapat diubah admin"; hari ini mengubahnya = SQL langsung ke produksi. Panel UI, atau runbook SQL untuk beta? |
| 4 | **Bundel `/masuk` 851 KB** | Bukan lagi opsional: kriteria selesai M5 memuat "Lighthouse §12 tercapai", dan §12 memuat bundel ≤ 200 KB gzip. Dikerjakan di dalam M5, atau M5 ditutup dengan §12 sengaja tidak terpenuhi? |
| 5 | **§16 #8 kurs & #11 tokenomics** | Fitur **Tukar terhalang keduanya**, bukan sekadar "menjelang mainnet". #5 tidak bisa diputuskan sebelum #8. Pemblokir terbesar yang tersisa di seluruh produk — tapi urusannya M6, bukan M5. |
| 6 | `POST /api/wallet/backfill` | Endpoint pemeliharaan permanen di produksi — dipertahankan sebagai alat operasi, atau dicabut sebelum rilis publik (§ P0-2 B3) |

Ikutan keputusan #1: sembilan pengguna sekarang memegang sampai 120 kredit yang
**terlihat di layar mereka**. Reset maupun isi-ulang MENGAMBILNYA. Diputihkan
(jadi saldo permanen) atau dipotong?

**Menunggu tangan PO:** uji batch 2026-08-27 (empat misi baru + halaman Akun) ·
prompt instal PWA di Android (§7) · verifikasi source enam kontrak di explorer.

**Bisa saya kerjakan tanpa menunggu siapa pun, urutan usul:**

1. ~~Cabut `misi_hitung_harian`~~ — ✅ **beres 2026-08-28** (migrasi 0026).
2. ~~Diagnosis `no-response` service worker di `/masuk`~~ — ✅ **ternyata sudah
   selesai sejak commit `44cb43b` + `324966b`.** `app/sw.ts` memuat penanganan
   lengkapnya (`JALUR_TANPA_SW`, `janganSimpanPengalihan`, cache `pages-v2`) dan
   `sw.js` di produksi mengandung seluruh penandanya. Entri papan kerja yang
   basi, bukan pekerjaan yang tertinggal.
3. **Sisa M5** (§8) — seluruhnya menunggu keputusan #1–#4 di atas. Yang tidak
   terhalang sudah selesai 2026-08-28 (lihat §8).

---

## Berikutnya — berurutan

### ~~1. Dua pemblokir sisa transfer ke Vercel Pro~~ — ✅ **BERES 2026-08-22**

Keduanya lahir dari pindah tim dan sudah ditutup pada hari yang sama:

- [x] **Redeploy.** Delapan env on-chain masuk 21:21–21:40 UTC, sedangkan
      deployment saat itu jadi 21:14:57 UTC — **enam menit lebih awal.** Vercel
      mengikat env ke deployment saat dibuat, jadi build lama tidak pernah
      melihatnya dan tick dijawab 404. Push `c8e6af0` memicu build baru yang
      membawa kedelapan env.
- [x] **Vercel Authentication dimatikan untuk Production.** Sebelumnya *setiap*
      path (`/`, `/masuk`, `/api/*`) menjawab 302 ke `vercel.com/sso-api` —
      aplikasi terkunci total dari publik, bawaan tim Pro. Sekarang `/masuk`
      menjawab 200. Preview tetap dilindungi.

**Relayer terbukti berputar sendiri** (diverifikasi 2026-08-21 23:16–23:20 UTC):
tick pertama menjawab `{"ok":true,"tertinggal":"204343"}`, lalu kursor maju
`194074875 → 194109875` dalam 30 detik **tanpa panggilan manual**, dan menyusul
kepala rantai (selisih ~4.700 blok) dalam tiga menit.

**Pelajaran yang menghemat waktu nanti:** ukuran paling jujur bahwa relayer hidup
bukan tampilan dashboard Vercel, melainkan `updated_at` di `relayer_state`. Kalau
ia bergerak tiap menit, cron bekerja — titik.

### 2. 🧑 Tuntaskan klaim misi (menutup M4 sepenuhnya)

Kontraknya **sudah ter-deploy & terdanai**, env produksi **sudah terisi**, dan
deployment-nya sudah membawa env itu. Yang tersisa murni satu ketukan jari Anda
di aplikasi — tidak ada lagi yang memblokirnya dari sisi kode.

Catatan yang menghemat kebingungan: dompet uji sekarang bersaldo **0 IDMX**
(dibaca dari rantai 2026-08-22), jadi tombol Tukar di kartu wallet memang tampil
nonaktif dengan keterangan "Belum ada IDMX untuk ditukar". Itu perilaku yang
benar, bukan fitur yang rusak — ia hidup begitu misi pertama diklaim.

- [x] `pnpm deploy:rewards` — IDMX + MissionRewards live, kolam 100 juta IDMX
- [x] Env on-chain masuk Vercel: `NEXT_PUBLIC_IDMX_ADDRESS`,
      `NEXT_PUBLIC_MISSION_REWARDS_ADDRESS`, `NEXT_PUBLIC_SWAP_INITIATOR_ADDRESS`,
      `NEXT_PUBLIC_SWAP_CLAIM_ADDRESS`, `NEXT_PUBLIC_IDM_REBORN_ADDRESS`,
      `CRON_SECRET`, `SWAP_SIGNER_PRIVATE_KEY`, `MISSION_VOUCHER_PRIVATE_KEY`
- [x] ~~Uji jalur sukses~~ — **dilakukan PO 2026-08-26**: spinner → ✓ Diklaim +
      tautan opBNBScan, jatah 0/250 → 20/250, tombol misi lain tetap hidup.
      Sesudah klaim jadi asinkron (0022) diuji lagi: "Diproses…" berubah sendiri
      jadi "Diklaim", dan statusnya bertahan setelah tab ditutup.
      **M4 tertutup penuh.**

`MISSION_RELAYER_PRIVATE_KEY` sengaja tidak dipasang: kodenya jatuh ke
`SEAL_RELAYER_PRIVATE_KEY` yang sudah ada, dan komentar di `klaim-server.ts`
menyatakan itu memang boleh — perannya identik, sama-sama membayar gas.
**Catatan penting sejak batch P0-2 A:** cadangan itu dulu memakai `??`, yang
hanya jatuh pada `undefined`. Di Vercel variabelnya memang TIDAK ADA sehingga
cadangan bekerja; tapi di `.env.local` ia ADA dan KOSONG — dan `""` bukan
nullish, jadi klaim menjawab 501 "belum dikonfigurasi" di setiap mesin lokal.
Sekarang dibaca lewat `envPertama()` (`lib/env.ts`): **nilai pertama yang tidak
kosong**, sesuai aturan yang tertulis di kepala `.env.local.example`.

#### P0-2 batch A — sebab 500 ditemukan & dicabut (2026-08-26)

**Sebabnya bukan balapan wallet, bukan kuota.** Log Vercel (5 kejadian, 4 user,
2026-08-22..25) menunjuk satu hal: `SQLSTATE 22003 — value "16213509590252896750"
is out of range for type bigint`. `nonceBaru()` menghasilkan bilangan acak
**unsigned 64-bit**, sedangkan `mission_claims.nonce` bertipe `bigint` yang
**signed** — maksimum 2^63-1. **Separuh dari semua nonce ditolak Postgres**,
jadi setiap ketukan Klaim adalah lemparan koin. Itulah kenapa gejalanya terlihat
seperti kondisi balapan: gagal, gagal, lalu tiba-tiba berhasil tanpa ada yang
berubah. Keempat nonce di log semuanya di paruh atas.

- [x] **0021** — `mission_claims.nonce` → `text` + CHECK bentuk kanonik, sejajar
      `swap_vouchers.nonce` (0019). Bukan mask 63-bit di aplikasi: nonce adalah
      `uint256` di kontrak, dan mengecilkan domain agar muat ke tipe penyimpanan
      yang salah adalah menyesuaikan kebenaran pada wadahnya. Diverifikasi di
      produksi: 2^64-1 masuk, `'007'` ditolak CHECK, 10 baris lama utuh.
- [x] **Taksonomi galat** `lib/missions/galat.ts` — `{ code, message }` dengan
      status 4xx/503 untuk setiap kondisi yang bisa diprediksi. 500 hanya untuk
      yang benar-benar tak terduga, dan SQLSTATE-nya WAJIB ikut ter-log.
      SQLSTATE dipetakan: 23505→ALREADY_CLAIMED, 23503→MISSION_UNKNOWN,
      22003/22P02/23514→CLAIM_STORAGE_REJECTED.
- [x] **Tombol Klaim** — penjaga ganti dari state ke `ref` (dua ketukan dalam
      satu frame sama-sama membaca state lama; ref berubah seketika). Setelah
      gagal, tombol hidup lagi HANYA untuk kode yang layak diulang; retryabilitas
      tinggal di tabel taksonomi, dipakai server dan layar dari satu sumber.

**Yang TIDAK dikerjakan di batch A, sesuai keputusan PO:** klaim asinkron
(batch B), dan poin "upsert kuota" yang dicabut — tidak ada baris kuota misi
yang dibaca, angkanya diturunkan dari `mission_claims`.

#### P0-2 batch B3 — lubang wallet di hulu, DITUTUP (2026-08-26)

Didahulukan atas B1/B2 atas keputusan PO: **B1 adalah kelas bug yang nyata tapi
belum pernah terjadi (0 baris berstatus tidak jelas), B3 adalah kerusakan yang
SUDAH terjadi pada 22% user.** Yang sudah rusak didahulukan.

Sebabnya: baris `wallets` HANYA ditulis sekali, oleh `POST /api/auth/session`,
dari alamat yang dibaca browser pada detik login — dan Privy membuat embedded
wallet secara asinkron. Yang dompetnya terlambat beberapa detik menjadi permanen
tanpa dompet sampai kebetulan login ulang. Gejalanya 400/409, tidak pernah 500,
jadi **tidak pernah muncul di pemantauan error**.

- [x] `alamatWalletUser()` (`lib/wallet/server.ts`) — baca `wallets`; bila
      kosong, tanya Privy `getUserById(did)` dari DID di cookie sesi, `upsert`
      `ON CONFLICT (user_id)`, kembalikan. Tidak pernah melempar: setiap
      kegagalan jadi status. Ada ingatan negatif 10 detik supaya `/api/wallet/
      saldo` (dipanggil tiap navigasi) tidak menembak Privy per permintaan,
      tapi cukup pendek untuk melayani detik-detik pertama sebuah akun.
- [x] Dipakai klaim, `/api/wallet/saldo`, dan segel — ketiganya berhenti
      menyuruh "masuk ulang" untuk sesuatu yang bukan kesalahan pengguna.
- [x] **"Belum ada" ≠ "tidak bisa ditanya".** Privy menjawab 404 → belum-siap →
      `WALLET_NOT_READY` 409. Privy gagal dijawab → `WALLET_LOOKUP_FAILED` 503 +
      log error. Menyamakan keduanya membuat gangguan Privy tampak seperti akun
      yang belum siap selamanya.
- [x] `POST /api/wallet/backfill` — pemulihan sekali jalan, memanggil helper
      yang SAMA (bukan jalur kedua), dijaga `CRON_SECRET` lewat `lib/api/cron.ts`
      yang diangkat dari `/api/relayer/tick`. Yang tidak pulih dilaporkan satu
      per satu berikut sebabnya; ringkasan yang hanya menyebut jumlah akan
      mengulangi kegagalan senyap yang justru sedang diperbaiki.
- [x] `startedRef` di `login-panel.tsx` **tidak** dilepas — penjaga itu ada
      karena POST sesi bertubi-tubi pernah membekukan tab. Masalahnya bukan
      penjaga itu, melainkan tidak adanya jalur susulan.

**Hasil pemulihan produksi (2026-08-26):** 2 diperiksa, **2 pulih**, 0 belum
siap, 0 galat. `users` tanpa `wallets` sekarang **0 dari 9**, tanpa alamat
ganda. Privy ternyata memang sudah memegang kedua dompet itu sejak awal — yang
hilang hanya jalannya ke database.

- [ ] **🧑 Tinjau `POST /api/wallet/backfill` sebelum rilis publik.** Endpoint
      pemeliharaan permanen di produksi perlu keputusan sadar, bukan warisan.
      Pilihannya: dipertahankan (dijaga `CRON_SECRET`, berguna bila kelas
      celah ini terulang), atau dicabut setelah tidak ada lagi user yang
      membutuhkannya. Keputusan PO, dicatat 2026-08-26.

#### P0-2 batch B1+B2 — klaim asinkron, penutup P0-2 (2026-08-26)

**Kelas bug yang dicabut:** handler mengirim transaksi on-chain LALU menulis
`tx_hash`. Di antara keduanya ada jendela tempat uang sudah berpindah tapi
catatannya belum ada; kegagalan tulis di situ membuat pengguna melihat 500,
mencoba lagi, dan dijawab 409 untuk reward yang memang sudah dibayarkan tapi
tidak pernah bisa ia lihat. Belum pernah terjadi (0 baris menggantung), tapi
yang menjaganya hanya keberuntungan.

- [x] **0022** — status `queued`/`sending`/`submitted`/`confirmed`/`failed`,
      indeks antrean parsial, dan tabel `relayer_locks`.
- [x] **HTTP hanya menulis NIAT.** `waitForTransactionReceipt` hilang dari
      jalur permintaan; `maxDuration` turun 60 → 15 detik karena tidak ada lagi
      rantai yang ditunggu. Jawabannya `{ status: "diproses" }` — bukan
      "berhasil", karena rewardnya memang belum berpindah.
- [x] **`nonce` lahir sebelum apa pun dikirim.** Inilah kunci strukturalnya:
      kebenaran on-chain selalu bisa ditanyakan ulang lewat `nonceUsed`, jadi
      baris database tidak pernah lagi jadi satu-satunya bukti reward dibayar.
      Nonce tetap juga membuat kirim ulang tidak mungkin membayar dua kali —
      kontrak yang menolaknya.
- [x] **Idempotensi tetap di DB**, lewat `uq_mission_claims_period` (0017).
      Diuji: dua permintaan yang tiba BERSAMAAN → satu baris, satu 200
      "diproses", satu 409 ALREADY_CLAIMED.
- [x] **Rekonsiliasi (B1-1)** di tick yang sama, dua cabang, keduanya diuji:
      baris menggantung yang nonce-nya SUDAH terpakai → status dinaikkan dan
      **hash dipulihkan dari event `Claimed`**; yang BELUM terpakai →
      dikembalikan ke antrean dengan nonce yang sama.
- [x] **Sewa pengirim** (`relayer_locks`, kunci = alamat EOA) — dua tick
      bersamaan diuji: satu bekerja, satu menjawab `dilewati: true`.
- [x] **UI jujur:** centang & kata "Diklaim" hanya untuk `confirmed`; selama
      diproses tampil spinner + "Reward sedang dikirim ke dompetmu". Polling
      15 detik hanya selama ada klaim berjalan, berhenti sendiri.
- [x] **Taksonomi dirapikan (B1-2):** `RELAYER_UNAVAILABLE` dan `CHAIN_TIMEOUT`
      DIHAPUS — keduanya lahir saat handler sendiri yang mengirim, dan kini
      tidak mungkin lagi terjadi di jalur HTTP.

**Uji end-to-end di testnet:** niat → `queued` → tick mengirim → `submitted`
dengan hash → tick berikutnya → `confirmed`, tautan opBNBScan muncul, cap
harian 0 → 20. Gas satu klaim ≈ 0,00000026 tBNB.

**Temuan ikutan:** viem menolak alamat yang checksum EIP-55-nya tidak cocok,
dan penolakan itu terjadi saat menandatangani — satu alamat yang tersimpan
dengan kapitalisasi salah akan gagal, kembali mengantre, dan gagal lagi setiap
menit selamanya. Alamat kini dinormalkan (huruf kecil → checksum dihitung
ulang) sebelum dipakai.

**Tiga kunci deploy JANGAN pernah masuk Vercel** — `DEPLOYER_PRIVATE_KEY`,
`IDM_LEGACY_DEPLOYER_PRIVATE_KEY`, `IDM_TREASURY_PRIVATE_KEY`. Tidak ada kode di
`app/` atau `lib/` yang membacanya (hanya `scripts/`, yang jalan di laptop), dan
yang treasury memegang 850 juta IDM.

### ~~3. Batch UI cangkang~~ — ✅ **SELESAI 2026-08-22**

Dikerjakan sebagai satu batch atas keputusan PO: layar yang **bentuknya adalah
barangnya** diselesaikan lebih dulu, supaya rangka aplikasi stabil sebelum
mesin-mesin dibangun di atasnya. Merombak nav/layout belakangan jauh lebih mahal
daripada menambah isi.

- [x] Saldo IDMX on-chain + kartu wallet sesuai mockup
- [x] **UI Tukar** — lembar burn opBNB + panel voucher klaim BSC
- [x] Empat baris Pengaturan hidup + halaman Kebijakan Privasi
- [x] Halaman 404 & error berbahasa Indonesia

**Yang sengaja TIDAK ikut batch ini**, karena UI-nya cuma kulit tipis di atas
mesin yang belum ada: Generator Konten, Wizard Peluang, pembelian kredit
Midtrans, panel admin. Membangun cangkangnya lebih dulu hanya menghasilkan
halaman yang tampak jadi tapi tidak melakukan apa-apa — dan besar kemungkinan
dibongkar lagi begitu ketahuan bentuk keluaran mesinnya.

### ~~4. P0-1 — kebenaran data di layar~~ — ✅ **SELESAI 2026-08-25**

Batch perbaikan korektness (bukan kosmetik), dipicu rekaman layar PO. Semua
sudah diuji PO di browser & PWA HP.

**Empat bug, satu kelas yang sama:** layar menggambar nilai yang belum pasti
seolah ia benar. Di aplikasi pembukuan itu bukan kekurangan tampilan — angka
uang yang salah selama satu detik tetap angka yang salah.

- [x] **Mock 12 Agustus.** Beranda memakai `lib/mock/finance.ts`
      (`MOCK_ANCHOR = 2026-08-12`, angka dari PRNG) sebagai *initial state*
      `useState`, jadi render pertama selalu menampilkan Rp614.000 milik
      dataset contoh sebelum data asli tiba ~1 detik kemudian. Mock kini HANYA
      dipakai saat server belum dikonfigurasi (401/501).
- [x] **`/api/*` tercache 24 jam di service worker.** `defaultCache` bawaan
      `@serwist/next` menampung setiap `GET /api/*` ke cache `apis`
      (NetworkFirst, 86400 dtk) — termasuk `/api/me`, `/api/transaksi`,
      `/api/laporan`. Risiko nyatanya bukan cuma angka basi: cache SW hidup
      per-origin, bukan per-sesi, jadi satu perangkat dua akun bisa saling
      melihat. Kini seluruh `/api/*` `NetworkOnly`.
- [x] **Offline merender Rp0 + "Belum ada transaksi"** pada akun yang punya
      Rp5,65 juta. Lebih berbahaya daripada mock: mock menampilkan angka orang
      lain, ini menampilkan nol milik dirinya sendiri sambil menuduh pengguna
      belum pernah mencatat. Disiplin tiga keadaan (`lib/api/keadaan.ts`)
      diterapkan ke Beranda & Riwayat.
- [x] **Pil kredit 10 → nilai asli.** Nilai cadangan hardcoded, kelas bug yang
      sama. Dicabut, diganti shimmer.

**Perbaikan turunan yang ikut ketemu:**

- [x] `/api/me` dipecah — identitas (Postgres, selalu cepat) vs saldo IDMX
      (`/api/wallet/saldo`, RPC opBNB yang bisa gagal). Sebelumnya nama usaha
      tersandera pembacaan rantai sampai 2,5 detik. **Prinsipnya berlaku
      umum: satu endpoint tidak boleh mencampur data yang selalu tersedia
      dengan data yang bisa gagal.** Pindaian seluruh `app/api`: hanya
      `/api/me` yang berpola begitu.
- [x] Header `private, no-store` + `force-dynamic` di 4 route data, lewat
      `lib/api/respons.ts` — berlaku juga di browser tanpa SW dan di perantara.
- [x] **Urutan "Transaksi terakhir".** `occurred_at` dipatok 12.00 WIB
      (benar, melindungi stabilitas tanggal lintas timezone), akibatnya semua
      transaksi sehari punya timestamp identik dan `ORDER BY occurred_at DESC`
      seri seluruhnya — Postgres mengembalikan urutan fisik, yaitu terlama di
      atas. Ditambahkan `created_at DESC` sebagai pemecah seri. Hanya ada satu
      tempat pengurutan transaksi di repo (`/api/transaksi`), dan ia melayani
      Beranda maupun Riwayat.

**Yang dibuktikan TIDAK perlu:** invalidasi setelah mencatat. Total Beranda
sudah berubah benar tanpa mekanisme apa pun (Beranda client component,
refetch tiap mount) — gejalanya murni urutan, bukan kesegaran. Tidak ada
mekanisme yang dipasang untuk sesuatu yang tidak mengerjakan apa-apa.

~~**Sisa terkait, dijadwalkan ke P1-3:** skeleton Beranda diulang dari nol tiap
kembali dari tab lain.~~ ✅ **LUNAS di P1-3** — satu `KueriProvider`, bukan
tambalan kedua.

### ~~P1-3 — Catat kosong saat kembali dari tab lain~~ ✅ **SELESAI 2026-08-26**

**Sebabnya bukan jalur simpan.** Thread Catat hidup di `useState<Bubble[]>([])`
dan tidak pernah dibaca dari server sama sekali — tujuh `useEffect` di berkas
itu semuanya soal tata letak, keyboard, dan antrean offline. Pindah tab
meng-unmount komponen, `bubbles` musnah, dan "Belum ada catatan hari ini"
tampil tanpa syarat. Kalimat itu bukan kesimpulan yang salah; ia **keadaan awal
yang dipajang sebagai fakta** — kelas bug P0-1 yang sama, di layar yang batch
itu belum sentuh.

- [x] **`KueriProvider`** (`components/providers/kueri-provider.tsx`) di
      `AppLayout`, di ATAS `children`, jadi ia bertahan melintasi tab.
      Ditulis sendiri, bukan SWR — SWR mempertahankan `data` lama sambil
      menyalakan `error` dan membiarkan konsumennya menampilkan keduanya tanpa
      berkata apa-apa. Di sini data lama hanya bisa keluar lewat satu pintu:
      `tersinkron: false`, yang WAJIB digambar sebagai "Belum tersinkron".
- [x] **revalidate-on-focus & on-reconnect**, keduanya diam-diam. Fokus
      menghormati ambang stale (30 dtk); online-lagi memaksa, karena yang
      paling mungkin berubah justru selama offline.
- [x] **Hidrasi thread** lewat `GET /api/transaksi?untuk=catat` — satu mode
      sempit yang **menjawab lebih awal**, sebelum satu baris pun jalur umum
      dieksekusi, supaya kelonggarannya tidak bisa merembes ke pembacaan uang.
- [x] **Empty state hanya setelah fetch selesai DAN kosong.** Render pertama
      kini skeleton; gagal memuat punya kalimatnya sendiri ("Catatanmu aman
      tersimpan"), tidak pernah dipetakan jadi "kamu belum mencatat apa pun".
- [x] **Batas hari WIB disatukan** ke `lib/wib.ts` dari 7 salinan di 8 berkas.
      Dedup MURNI — dibuktikan no-op atas 206.600 kasus (setiap batas hari
      selama 3 tahun ±2 ms, plus 200.000 timestamp acak) × 7 implementasi lama:
      **nol penyimpangan**. Tidak ada yang "sekalian dibetulkan".

**Keputusan PO di tengah jalan: batas hari thread dari `created_at`, bukan
`occurred_at`.** Thread Catat adalah percakapan — isinya apa yang pengguna
KATAKAN hari ini. Mengetik "kemarin jual 50rb" siang ini menaruh `occurred_at`
di kemarin, dan filter `occurred_at` akan membuat kalimat yang baru saja
diucapkan itu lenyap begitu pindah tab. Konsisten dengan progres misi harian,
yang sudah memakai `created_at` sejak 0017 dengan alasan yang sama persis.
Karena kolom filternya ikut berubah, parameternya `?untuk=catat` — satu mode
bernama — bukan `?include=draft`.

**Draft ikut ke thread, dan TIDAK ikut ke angka mana pun.** Jaminannya bukan
kehati-hatian endpoint: trigger `daily_rollups` (0012) menghitung hanya
`status='confirmed' and amount is not null`, dan RPC `misi_hitung_harian`
(0017) menyaring `status='confirmed'`. Diverifikasi dengan data nyata — satu
draft menggantung + satu transaksi lampau yang dicatat hari ini:

| | thread | Sisa hari ini | progres misi |
|---|---|---|---|
| 2 entri dari satu kalimat | ✓ satu gelembung, dua kartu | ✓ ikut | ✓ ikut |
| draft "tadi ada yang bayar" | ✓ "Menunggu nominal…" | ✗ tidak ikut | ✗ tidak ikut |
| dicatat hari ini untuk KEMARIN | ✓ muncul | ✗ (uang ikut `occurred_at`) | ✓ ikut |
| dicatat KEMARIN | ✗ tidak muncul | ✓ ikut | ✗ tidak ikut |

**Balasan agen tidak direka ulang.** Yang dipulihkan hanya kalimat pengguna
(`raw_input`) dan kartu entri. Draft tetap terbaca sebagai pertanyaan yang
menunggu karena `EntryCard` sendiri menampilkan "Menunggu nominal…" —
keterangannya datang dari keadaan barisnya, bukan dari kalimat yang kita
karang. `pendingDraftRef` ikut dipulihkan, jadi mengetik angka telanjang tetap
terbaca sebagai jawaban, bukan transaksi baru.

- [x] **Jam transaksi dihapus dari UI — keputusan PO 2026-08-25.** Usulan
      mengganti 12.00 dengan `created_at` DITOLAK, dan alasannya adalah aturan
      produk: **AIDM tidak pernah tahu jam kejadian, jadi jangan berpura-pura
      tahu.** `created_at` adalah jam MENCATAT — pelaku mikro lazim mencatat
      borongan malam hari, sehingga seluruh transaksi sehari akan tampil jam
      21.00: sama menyesatkannya dengan 12.00. Batas ini tidak bisa
      diselesaikan dengan label, karena pengguna membaca posisi itu sebagai jam
      kejadian apa pun tulisannya. Dan tidak ada keputusan usaha yang
      bergantung pada jam transaksi. `transaction-row.tsx` kini menampilkan
      tanggal saja; helper `formatJamID` dihapus dari `lib/transactions.ts` dan
      diganti komentar penjelas supaya tidak lahir kembali.

**Pindaian tempat lain yang menampilkan jam transaksi — tidak ada.** Ekspor CSV
(`riwayat-view.tsx`) sudah menulis `occurredAt.slice(0, 10)`, tanggal saja. PDF
laporan (`lib/laporan/pdf.tsx`) tidak memuat baris transaksi sama sekali, hanya
ringkasan periode bertanggal WIB. Sheet detail (`transaction-sheet.tsx`) hanya
punya `<input type="date">`; komponen jam ISO tetap dibawa apa adanya saat
menyimpan — tidak ditampilkan, tapi menyetelnya ke 00.00 bisa menggeser tanggal
WIB baris itu bila dibaca dari zona lain. Jadi seluruh permukaan sudah seragam
tanggal-saja; `created_at` tetap dipakai sebagai pemecah seri di query dan tidak
masuk `TX_COLUMNS` maupun tipe `Transaction` — Supabase bisa mengurutkannya
tanpa menyeleksinya, dan kolom yang tidak dirender tidak perlu ikut ke klien.

### ~~P1-4 bagian redirect — Google 401 "Redirect URL is not allowed"~~ ✅ **SELESAI 2026-08-27**

**Dashboard Privy tidak pernah salah.** Yang salah adalah URL yang dikirim kode
kita. Privy memakai `window.location.href` APA ADANYA sebagai `redirect_to`
(default SDK bila `customOAuthRedirectUrl` kosong) lalu mencocokkan URL UTUH itu
dengan allowlist. Middleware kita menulis `?next=%2Fberanda` ke URL itu, dan
**tidak ada entri allowlist yang bisa cocok dengan string berquery — termasuk
wildcard.** Itu sebabnya semua kombinasi allowlist yang dicoba PO gagal identik.

Dibuktikan lewat probe terisolasi ke `/oauth/init`, PKCE segar tiap permintaan,
urutan diacak, hanya `redirect_to` yang berbeda:

```
✅ 200  https://ai.idmtoken.com/masuk
✅ 200  https://ai.idmtoken.com/beranda
✅ 200  https://ai.idmtoken.com/
❌ 401  https://ai.idmtoken.com/masuk?next=%2Fberanda
❌ 401  https://ai.idmtoken.com/masuk?apa=saja
❌ 401  https://ai.idmtoken.com/masuk#fragmen
```

- [x] **`customOAuthRedirectUrl = `${origin}/masuk`** — dipatok, tidak lagi
      diturunkan dari halaman yang sedang dibuka. `origin` dari browser supaya
      tiap lingkungan mengirim origin-nya sendiri tanpa env yang harus diganti.
- [x] **`next` pindah ke sessionStorage**, URL dibersihkan `history.replaceState`.
      Membuang `?next=` dari middleware ditolak: itu menghapus kemampuan kembali
      ke halaman tujuan.
- [x] **Validasi open redirect** — wajib diawali `/`, tolak `//` dan `/\`, lalu
      dibandingkan ulang lewat `new URL()` terhadap origin sekarang. Diuji 19
      kasus termasuk `//evil.com`, `/\evil.com`, `javascript:`, dan
      `https://…`; semua ditolak. Sekali pakai, dihapus setelah dibaca, jatuh
      ke `/beranda` bila kosong/invalid.
- [x] **`sms` dibuang** dari `loginMethods` (`sms_auth: false` di dashboard).
      Bukan penyebab galat ini — dibuktikan tersingkir — tapi jangan meminta
      metode yang tidak ada.
- [x] **Fragmen ditutup** — URL yang dikirim dirakit sendiri, tidak mungkin
      berfragmen apa pun keadaan halaman.

**Jebakan yang nyaris terpasang, dan bagaimana ia ketahuan.** Versi pertama
pembersihan URL memakai `url.search = ""` — mengosongkan SELURUH query. Privy
mengembalikan pengguna dari Google ke URL itu membawa `privy_oauth_code`,
`privy_oauth_provider`, dan `privy_oauth_state` di query string, dan efek
komponen anak berjalan SEBELUM efek provider di atasnya. Pembersihan itu akan
menghapus ketiganya sebelum SDK sempat membacanya — memutus persis alur yang
sedang diperbaiki, dengan gejala baru yang jauh lebih sulit dilacak. Sekarang
HANYA `next` yang dibuang; diuji bahwa ketiga parameter callback selamat.

### ~~P1-4 bagian bahasa — layar OTP headless~~ ✅ **SELESAI 2026-08-27**

Modal Privy DIGANTI UI kita. Alasannya bukan kesempurnaan: SDK Privy v2.25
tidak punya opsi terjemahan sama sekali (satu-satunya `intl` adalah
`defaultCountry` untuk format nomor HP), jadi "Enter confirmation code" dan
"an email from privy.io" tidak bisa diubah dari config mana pun. Satu-satunya
jalan yang benar-benar memenuhi "tidak ada teks Inggris di alur masuk" adalah
melewati modalnya.

- [x] `useLoginWithOAuth().initOAuth({provider:"google"})` + `useLoginWithEmail()`
      (`sendCode` / `loginWithCode`), tiga langkah di dalam `/masuk` — bukan
      halaman terpisah, supaya tombol kembali browser tidak memotong alur.
- [x] Seluruh enam status `OtpFlowState` dipetakan; galat diterjemahkan dari
      `PrivyErrorCode` yang nyata (`lib/privy/galat-masuk.ts`), bukan dari
      pencocokan kata pada pesan Inggris yang bisa berubah diam-diam.
- [x] Sisa percobaan ditampilkan (batas keras Privy: 5 per kode).
- [x] TANPA fallback ke modal saat Google gagal — jatuh ke layar Inggris justru
      merusak yang sedang diperbaiki.
- [x] **Pintu belakang ditutup:** `header-stats.tsx` masih memanggil
      `useSafeLogin()` → modal Privy. Diarahkan ke `/masuk`. `use-safe-login.ts`
      dihapus (kode mati).
- [x] Bug `users.email` ditimpa null saat login Google — diperbaiki
      (`user.email?.address ?? user.google?.email`).
- [x] Istilah crypto dibuang dari layar masuk.

**Satu penyimpangan dari sketsa yang disetujui:** kotak kode **satu**, bukan
enam. `autocomplete="one-time-code"` hanya bekerja pada satu field — dan itulah
yang membuat ponsel menawarkan kodenya sendiri, sekali ketuk, tanpa mengetik.
Enam kotak terpisah lebih rapi di gambar tapi mematikan fitur yang paling
menolong di layar ini. Jarak antarhuruf menjaga tampilannya tetap terbaca per
angka.

**Yang TIDAK bisa dipastikan dari tipe:** Privy tidak membedakan "kode salah"
dari "kode kedaluwarsa" — keduanya `invalid_credentials`. Kalimatnya karena itu
tidak mengaku tahu yang mana, dan tawaran kode baru menutup kedua kemungkinan.

**Deteksi akun baru vs lama — diverifikasi, tidak terpengaruh headless.**
Ia tidak pernah bersandar pada event Privy: nol kemunculan `isNewUser`,
`wasAlreadyAuthenticated`, maupun `onComplete` di seluruh `app/` + `lib/` +
`components/`. Pemicunya `usePrivy().authenticated` — state provider yang sama
bagi modal maupun headless — dan keputusannya milik kita sendiri, `/api/me` +
`profilLengkap()`. Diuji dengan dua akun produksi nyata: profil lengkap →
diteruskan ke tujuan; profil kosong → tetap di `/onboarding/peran`.

### ~~P2-5 — `akun/page.tsx` menggambar keadaan memuat sebagai fakta~~ ✅ **SELESAI 2026-08-27**

Halaman terakhir yang masih membawa kelas bug P0-1. Pada render pertama SETIAP
kali dibuka, sebelum satu byte pun datang dari server, layar Akun menuliskan
dua pernyataan tentang akun penggunanya — **"Mode demo"** dan **"Dompet belum
siap."** — lalu meralat keduanya sedetik kemudian. Kartu dompet bahkan
menyatakan "Dompet bawaan · aktif" untuk dompet yang belum terbaca.

- [x] `memuat = me === null` dibedakan dari "tidak ada"; label peran jadi
      skeleton selama memuat, bukan "Mode demo".
- [x] `swapAlasan` → "Menyiapkan…" selama memuat, bukan "Dompet belum siap."
- [x] `WalletCard` menerima `memuat`; alamat DAN status ditahan bersama —
      "aktif" adalah klaim tentang dompet pengguna dan tidak boleh diucapkan
      sebelum alamatnya benar-benar terbaca.

**Dengan ini kelas bug P0-1 tertutup di seluruh aplikasi.**

### ~~5. Hidupkan tab Misi tiap hari~~ — ✅ **SELESAI 2026-08-27**

Masalahnya nyata: di hari biasa hanya **2 misi** yang bisa diklaim. Setelah
keduanya selesai, tab Misi jadi layar mati sampai besok. Empat misi berikut
dipilih bukan sekadar menambah hadiah, tapi karena **membayar perilaku yang
memang kita inginkan**:

- [x] Catat pemasukan **dan** pengeluaran hari ini — **20/hari** (`both_sides_today`)
      *(laporan hanya berguna kalau dua sisi tercatat; sekarang user bisa cuma
      mencatat pemasukan dan laporannya timpang)*
- [x] Catat pakai suara hari ini — **15/hari** (`voice_tx_today`)
      *(suara adalah pembeda utama vs BukuWarung, tapi tidak ada apa pun yang
      mendorong orang mencobanya)*
- [x] Buka Laporan mingguan — **30/minggu** (`open_report_weekly`)
      *(kebiasaan MEMBACA laporan — inti bankability, bukan sekadar menimbun data)*
- [x] Runtun 30 hari — **300/bulan** (`streak_30_days`)
      *(runtun 7 hari terlalu cepat selesai lalu tidak ada tangga berikutnya)*

Dampak: 4 misi/hari (dari 2) · 70 → **105 IDMX/hari** · 32.600 → **50.535
IDMX/tahun**. Cap harian 250 tidak perlu diubah (masih ada ruang 2,4×). Kolam
100 juta tetap cukup untuk beta 100 user selama ~20 tahun (dari 31).

**Migrasi 0023.** Tiga misi diturunkan dari data sumber lewat RPC baru
`misi_sinyal_harian` — satu pemindaian menjawab ketiganya (jumlah, ada-masuk,
ada-keluar, jumlah-suara), menggantikan tiga pemindaian atas tabel yang sama.
Definisi "unik-valid" tidak bergeser sedikit pun dari 0017, jadi progres misi
lama tidak berubah. `misi_hitung_harian` sengaja BELUM dihapus: deploy dan
migrasi tidak pernah serentak, dan versi lama yang masih berjalan beberapa
detik tidak boleh kehilangan progresnya. **Utang: cabut di migrasi berikutnya
setelah rilis ini mengendap.**

**Satu misi TIDAK bisa diturunkan.** Membaca laporan tidak meninggalkan jejak
di tabel mana pun — ia peristiwa, dan peristiwa harus dicatat saat terjadi atau
hilang selamanya. `POST /api/missions/lihat-laporan` menulis ke `mission_events`
dengan idempotensi per pekan yang ditegakkan indeks unik 0016 — tabel dan
indeks yang memang sudah ada untuk itu, dipakai ulang, bukan jalur kedua. Yang
dicatat hanya satu bit per pekan: "pengguna ini membuka Laporan". Tidak ada
periode yang dilihat, tidak ada durasi.

**Diuji dengan data nyata**, satu transaksi pada satu waktu:

| keadaan | both_sides | voice | open_report |
|---|---|---|---|
| 1 pemasukan via chat | **1/2** | 0/1 | 0/1 |
| + 1 pengeluaran via **suara** | **2/2 ✓** | **1/1 ✓** | 0/1 |
| + buka Laporan | 2/2 ✓ | 1/1 ✓ | **1/1 ✓** |
| POST kedua di pekan sama | — | — | `dicatat: false` (idempoten) |

Progres `1/2` untuk "kedua sisi" disengaja: bar setengah memberi petunjuk yang
benar — yang kurang bukan "catat lebih banyak", melainkan "catat sisi satunya".

### 5b. ~~Onboarding: splash + layar masuk gaya Fuse~~ — ✅ **SELESAI 2026-08-28**

Perubahan PRESENTASI atas permintaan PO, mengikuti
`docs/mockups/aidm-onboarding-fuse.html`. Mesin autentikasi tidak disentuh.

- [x] **Splash di rute `/`** — cream + glow radial (bukan hitam: layar hitam
      pembuka terbaca seperti layar mati di aplikasi pembukuan). Logo
      fade+scale 1,5 dtk, wordmark menyusul, pindah sendiri ke `/masuk` pada
      detik ke-2, seluruh layar bisa diketuk untuk melewati. **Hanya untuk yang
      belum punya sesi** — cookie dibaca di server, yang sudah masuk tetap
      langsung ke Beranda.
- [x] **Carousel verba** Catat→Lapor→Segel→Unduh dengan loop tiga-salinan:
      penunjuk yang mencapai salinan ketiga dikembalikan ke salinan kedua TANPA
      animasi. Karena keduanya kata sama di posisi sama, lompatannya tak
      terlihat — tidak pernah "mundur cepat".
- [x] **Desktop diperbaiki, bukan sekadar diciutkan.** Latar full-bleed sampai
      tepi viewport (inilah yang dulu membuat login mengambang sempit di tengah
      dengan sisa layar kosong), kolom 460px dipusatkan mendatar DAN tegak,
      carousel tinggi tetap 300px, tombol tidak dipepet ke dasar.
- [x] **Token mockup dilingkup di `.onboarding`, TIDAK dinaikkan ke `:root`** —
      emas & abunya beda tipis dari palet aplikasi (#EDB415 vs #F0B90B,
      #B9860C vs #D89E0A) dan menaikkannya akan menggeser warna seluruh
      aplikasi demi dua layar.
- [x] **Ikon transparan.** favicon.ico (16/32/48) dan apple-touch-icon 180 kini
      transparan; maskable Android hitam `#000000` — sama dengan yang diisi iOS
      sendiri di balik alpha, atas keputusan PO.
- [x] **Bug ditemukan & diperbaiki:** banner "Pasang AIDM"
      (`fixed bottom-16 z-50`) menutupi tombol login. Terbukti dengan klik
      mouse sungguhan — kunjungan pertama lolos, kedua dan seterusnya (saat
      banner memenuhi syarat tampil) ketukan mendarat di kartu Pasang. Desain
      lama tidak kena karena kontennya di tengah layar. Banner kini ditahan di
      rute auth; registrasi service worker tetap jalan.

**Verifikasi:** 91 pemeriksaan Chrome headless lulus 0 gagal, dijalankan DUA
kali — localhost dan `https://ai.idmtoken.com`. Nol luber mendatar di
1440/1024/768/390, konsol bersih di produksi (galat CSP Privy hanya artefak
localhost), carousel terbukti reset satu-langkah bukan animasi mundur,
reduced-motion diam di 'Catat'.

**Tersisa di tangan PO:** lambang sederhana untuk favicon 16px. Berkas
`logo-mark-simple.svg` yang dikirim ternyata BELUM disederhanakan — diukur,
bukan dikira: irisan mendatar menunjukkan 10 garis tebal 4,2–4,6% lebar, angka
identik dengan `logo-master` (selisih artwork 1,18/kanal = gambar yang sama).
Yang dibutuhkan: **≤ 3 garis, tebal ≥ 10% lebar, PNG 1024×1024 RGBA.** Tanpa
itu pun 32/48/180/192/512 sudah baik; hanya 16px yang tetap jadi bercak.

### 6. 🤖 Utang teknis kecil

- [x] ~~Peringatan saldo kontrak reward menipis~~ — dipasang 2026-08-27 di
      `lib/missions/relayer.ts`. Diperiksa hanya SETELAH ada klaim yang
      benar-benar terkirim (itulah satu-satunya yang menguras kolam); di bawah
      1 juta IDMX ia `console.error` sehingga masuk klaster galat Vercel, dan
      ikut dilaporkan di respons tick sebagai `misi.kolamMenipis`.
- [x] ~~Saldo IDMX hardcode `0`~~ — dibaca on-chain 2026-08-22
      (`lib/token/saldo.ts`, batas 2,5 dtk + cache 60 dtk; `null` ≠ 0)
- [x] ~~**Cabut `misi_hitung_harian`**~~ — dicabut 2026-08-28 (migrasi 0026).
      Utang yang dibuat sadar di 0023 dan dibayar tepat waktu: jendela "versi
      lama masih melayani beberapa detik" sudah tertutup sepekan lebih. Sebelum
      mencabut, dua hal diperiksa bukan diasumsikan — nol pemanggil di kode
      (`grep` hanya menemukan komentar) dan `pg_depend` melaporkan nol objek
      database yang bergantung padanya.
- [x] ~~**`no-response` service worker di `/masuk`**~~ — **ternyata sudah
      diperbaiki**, di commit `44cb43b` + `324966b`, sebelum entri ini ditulis.
      `app/sw.ts` memuat penanganan lengkapnya: `JALUR_TANPA_SW` menaruh
      `/masuk`, `/onboarding`, `/api/auth` di `NetworkOnly`; plugin
      `janganSimpanPengalihan` menolak menyimpan respons `opaqueredirect` (akar
      masalahnya — `cache.put()` menolaknya, `NetworkFirst` menghitung itu
      sebagai "jaringan gagal", lalu tidak menemukan apa pun di cache →
      `no-response`); dan cache diberi nama BARU `pages-v2` supaya perangkat
      yang sudah memasang PWA meninggalkan salinan lama alih-alih mewarisinya.
      Diverifikasi 2026-08-28 pada `sw.js` yang benar-benar disajikan produksi:
      seluruh penandanya ada. **Yang basi adalah entri ini, bukan kodenya** —
      pesan konsol yang dilihat PO datang dari service worker versi lama yang
      masih memegang tab tersebut, persis kemungkinan pertama yang ditulis di
      sini.
- [x] ~~**Hardening `POST /api/auth/session`**~~ — selesai 2026-08-28. Lihat §8.
      Menutup satu-satunya `TODO` di seluruh kode.
- [x] **Taksonomi galat login ternyata MATI** — ditemukan & diperbaiki
      2026-08-28, lewat peringatan `next build` yang selama ini terlewat:
      `Attempted import error: 'PrivyErrorCode' is not exported`.

      `PrivyErrorCode` adalah `declare enum` yang diekspor **type-only** oleh
      `@privy-io/react-auth` — lolos `tsc`, tapi `undefined` saat berjalan.
      Jadi setiap `case PrivyErrorCode.X` di `lib/privy/galat-masuk.ts`
      membandingkan dengan `undefined`, dan gagal dua arah:

      · **kode nyata tidak pernah cocok** → seluruh kalimat Indonesia yang
        ditulis untuk P1-4 tidak pernah tampil; semuanya jatuh ke cadangan.
        Membatalkan jendela Google pun disambut kotak galat — persis hal yang
        komentar di berkas itu bersumpah tidak boleh terjadi
        (`pembatalanPengguna("oauth_user_denied")` mengembalikan `false`).
      · **galat tanpa kode justru cocok dengan case PERTAMA** → kalimat
        spesifik yang salah, disampaikan dengan yakin. Orang yang jaringannya
        putus diberi tahu "alamat emailnya sepertinya keliru".

      Diperbaiki dengan peta konstanta lokal berisi nilai string yang nyata,
      dijaga `satisfies Record<string, ${'`'}${'$'}{PrivyErrorCode}${'`'}>` — bila Privy mengganti
      salah satu string di versi berikutnya, `tsc` yang gagal, bukan pengguna
      yang menerima kalimat keliru. Dibuktikan 16 kasus: kode nyata → kalimat
      spesifik, kode asing & `undefined` → cadangan, pembatalan dikenali.
      Peringatan build hilang; `next build` kini bersih sepenuhnya.

      **Pelajarannya bukan tentang Privy.** Peringatan build yang dibiarkan
      hidup adalah tempat bug bersembunyi paling lama — yang ini lolos sampai
      produksi dan lolos uji PO, karena jalur bahagia tidak pernah menyentuhnya.
- [ ] **Bundle `/masuk` 829 KB gzip vs target §12 ≤200 KB — 4,1× di atas
      batas.** Diukur ulang 2026-08-28 dari `app-build-manifest`, dan angka
      851 di keluaran `next build` ternyata **sudah gzip**, bukan mentah —
      koreksi terhadap catatan sebelumnya yang menganggapnya sekadar "di atas
      target". Penyebabnya persis DUA chunk (SDK Privy): 510,7 + 202,0 KB.
      Sisanya — aplikasi kita sendiri — hanya **116,5 KB, lolos dengan lapang**
      (`/beranda` 112,5 KB sebagai pembanding). `/akun` identik: 832,7 KB, dua
      chunk yang sama, dipakai hanya untuk ekspor dompet.

      Bentuk perbaikannya lebih murah dari dugaan lama. Kekhawatirannya dulu:
      `usePrivy().authenticated` harus dibaca saat mount untuk mengenali sesi
      hidup. Itu **tidak perlu SDK sama sekali** — cookie sesi sudah ada dan
      middleware sudah membacanya. Cukup pantulkan pengguna ber-sesi keluar
      dari `/masuk` di middleware sebelum satu baris JS jalan, sehingga
      `/masuk` hanya pernah dirender untuk yang belum masuk, dan SDK dimuat
      saat tombol ditekan.

      **Bagian dari kriteria selesai M5** ("Lighthouse §12 tercapai"), bukan
      pekerjaan opsional di luarnya. Catatan lama di bawah dipertahankan:
      dibaca saat mount untuk mengenali sesi yang masih hidup — itu refaktor
      pada jalur auth yang baru saja distabilkan dan diverifikasi di produksi.
      **Keputusan PO diperlukan** sebelum dikerjakan.
- [x] ~~4 tombol Pengaturan mati~~ — dihidupkan 2026-08-22. Gaya bahasa AI
      tersimpan (migrasi 0020) dan masuk prompt lewat peta nilai; kebijakan
      privasi jadi halaman; ekspor wallet lewat Privy. **Notifikasi sengaja
      tetap menyatakan "belum tersedia"** — push infrastructure memang belum
      ada, dan meminta izin notifikasi untuk sesuatu yang belum bisa dikirim
      lebih buruk daripada mengakuinya.
- [x] ~~**`test:api` rapuh di mesin lambat**~~ — diperbaiki 2026-08-27 di
      harness, sesuai diagnosis di bawah: seluruh `fetch` kini mengirim
      `connection: close`, jadi tidak ada koneksi menganggur untuk diputus
      `next start`. Ongkosnya satu handshake TCP per request ke localhost.
      Catatan aslinya disimpan karena menjelaskan kenapa perbaikannya di
      harness, bukan di aplikasi: — `next start` menutup koneksi
      menganggur setelah 5 detik, sedangkan harness memanggil `psql` di antara
      request; di mesin yang sedang penuh, spawn `psql` melewati batas itu dan
      fetch berikutnya mati `SocketError: other side closed` di titik yang
      berpindah-pindah. Server tidak pernah mati dan log-nya bersih; request
      yang "gagal" berhasil 200 saat dijalankan sendiri. Perbaikannya di
      harness (matikan keep-alive atau naikkan `keepAliveTimeout`), bukan di
      aplikasi.

### 7. 🧑 Verifikasi lapangan yang belum dilakukan

- [ ] Prompt instal PWA di Android (ikon maskable sudah lengkap sejak M0 — kalau
      gagal, penyebabnya bukan itu)
- ~~Serahkan 1 PDF ke petugas bank/koperasi~~ — **DICABUT** (PO, 2026-08-15;
  ditegaskan ulang 2026-08-22). Gerbang itu ada untuk memverifikasi janji
  "laporan siap diajukan ke bank", dan janji itu sendiri sudah dibatalkan —
  tanpa janjinya, gerbang ini kehilangan tujuan. PRD §14 dan
  BRIEF-EKONOMI-TOKEN.md #9 sudah mencatatnya; baris ini yang tertinggal.

  **Batas produk yang berlaku sekarang:** AIDM membantu sampai laporan jadi PDF
  dan tersegel on-chain. Titik. Mau dibawa ke bank atau tidak adalah urusan
  pengguna, dan penerimaan berkas adalah wewenang penilai — bukan sesuatu yang
  boleh dijanjikan pembuat alat. Nilai lanjutannya ada di **B2B**: basis data
  rekam usaha terverifikasi untuk koperasi/BPR/fintech (PRD P5, Fase 3), bukan
  pada klaim kelayakan kredit per pengguna.

### 8. 🤖 M5 — premium di balik kredit

Kriteria selesai (PRD §14): *"Semua AC §7 lulus staging; Lighthouse §12
tercapai"* — kalimat kedua itu menyeret bundel `/masuk` ke dalam cakupan M5,
bukan di luarnya.

**Selesai 2026-08-28** — yang tidak terhalang keputusan siapa pun:

- [x] **Kredit jadi operasi atomik** (0024). Pola `getBalance` → hitung di JS →
      `INSERT` adalah baca-lalu-tulis tanpa kunci: dua permintaan bersamaan
      lolos pagar 402 bersama lalu memotong penuh bersama. Seluruh mutasi
      saldo pindah ke fungsi Postgres ber-advisory-lock per-user
      (`kredit_harian` · `kredit_potong` · `kredit_saldo`), plus indeks unik
      parsial `uq_credit_daily_free (user_id, hari_wib)` yang menegakkan "satu
      hibah per hari WIB" di database. Hari WIB jadi kolom karena
      `(created_at at time zone 'Asia/Jakarta')::date` STABLE, tidak bisa
      diindeks — nilainya diisi dari `lib/wib.ts`, sumber WIB tunggal yang sama.
      Belum pernah gagal di produksi (39 baris, 1 pemakaian seumur hidup); itu
      bukti belum diuji beban, bukan bukti aman.
- [x] **Pagar riset menghitung yang sedang berjalan.** Celah over-spend ada di
      HULU — dua `POST /api/research` lolos berbarengan — bukan di potongannya.
      Kuota kini `tarif × (berjalan + 1)`, dengan jendela 10 menit supaya
      antrean yang ditinggalkan (tab ditutup) tidak mengunci kuotanya sendiri
      selamanya. Diuji langsung: permintaan ke-4 ditolak 402 `needed=12
      berjalan=3`, saldo tidak terpotong.
- [x] **`getBalance` melempar, tidak lagi mengembalikan 0 diam-diam.** Versi
      lama menelan galat baca → `/api/research` menjawab 402 "Kredit tidak
      cukup" untuk sesuatu yang sebenarnya hiccup database. Angka salah tentang
      uang pengguna, disampaikan sebagai fakta — kelas bug P0-1.
- [x] **Purge `raw_input` 90 hari** (0025 + `POST/GET
      /api/pemeliharaan/purge` + cron harian `15 18 * * *` UTC = 01.15 WIB).
      Halaman Kebijakan Privasi sudah menjanjikannya; kodenya belum
      melakukannya. Berbatas 5.000 baris/jalan dengan `for update skip locked`,
      dan melaporkan `sisa` supaya "cron jalan tapi tak pernah selesai" bisa
      dibedakan dari "memang sudah bersih". Umur dihitung dari `created_at`
      (kapan AIDM menerima), bukan `occurred_at` yang bisa dimundurkan.
      Produksi hari ini: 96 baris ber-`raw_input`, tertua 14 hari — baris
      pertama jatuh tempo ~12 November 2026, jadi ia dipasang justru selagi
      masih kosong.
- [x] **Trigger rollup melewati update tanpa dampak.** Tanpa ini satu batch
      purge = 10.000 UPSERT ke `daily_rollups` yang netonya nol. Penjaganya
      hanya menuliskan ulang identitas "x − x = 0" supaya tidak dikerjakan;
      begitu satu masukan rollup berubah, jalurnya persis seperti semula.
- [x] **`POST /api/auth/session` berhenti memercayai klien** — menutup
      satu-satunya `TODO` di seluruh kode (§14 M5). Alamat dompet, email, dan
      telepon dibaca ulang dari Privy lewat DID hasil verifikasi token. Token
      membuktikan pengirimnya memegang sesi sah; ia TIDAK membuktikan alamat
      dompet yang menumpang di JSON yang sama miliknya — dan `wallets.address`
      adalah tempat reward IDMX dibayarkan. `authProvider` masih boleh datang
      dari klien (sekadar mencatat tombol mana yang ditekan) tapi ditolak bila
      metodenya tidak benar-benar tertaut di Privy. Sekaligus menutup
      `users.email` tertimpa null saat orang berpindah metode masuk: kunci
      bernilai null tidak lagi ikut dikirim ke upsert.
- [x] **Teks 402 di Riset** tidak lagi menjanjikan "pembelian kredit hadir di
      M3" — M3 lewat berminggu-minggu lalu.
- [x] **`pnpm test:api` hijau penuh pertama kali: 123 lulus, 0 gagal.** Tiga
      kegagalan yang muncul di jalan pertama adalah harapan uji yang basi, bukan
      regresi: dua menuntut 400 untuk dompet-belum-siap (taksonomi P0-2 sudah
      mengubahnya jadi 409 `WALLET_NOT_READY`) dan satu mematok "5 misi"
      sebelum 0023 menambah empat. Yang ketiga kini diikat ke
      `count(*) from missions where aktif` supaya tidak basi lagi.

**Terhalang keputusan PO** (lihat "Titik lanjut"):

- [ ] **Model kredit gratis** — §8.2 bilang tidak menumpuk, kode menumpuk.
      0024 sengaja TIDAK menggesernya: reset/isi-ulang mengambil saldo yang
      sudah dilihat pengguna, dan memisahkan ember gratis vs berbayar adalah
      perubahan model ekonomi, bukan perbaikan balapan.
- [ ] Pembelian kredit Midtrans (QRIS/VA) — env sudah di-scaffold, `orders`
      0 baris, tidak ada rute maupun webhook. Bagian paling rawan: verifikasi
      signature webhook (§12) — webhook pembayaran yang tidak diverifikasi
      berarti siapa pun bisa menerbitkan kredit untuk dirinya sendiri.
- [ ] Generator Konten (nol mesin) & Wizard Peluang (nol rute) — bangun atau
      coret.
- [ ] Panel admin — atau runbook SQL.
- [ ] Bundel `/masuk` ≤ 200 KB (§12, bagian dari kriteria selesai M5).

**Catatan RLS (T-10).** §12 menuntut "RLS ketat per user". 0008 menyalakan RLS
di semua tabel tapi hanya menulis policy baca-publik; seluruh akses pengguna
berjalan lewat service-role yang mem-bypass RLS, dengan filter `user_id` di
lapisan API — strategi M0 yang disengaja dan terdokumentasi. Risiko nyatanya
rendah (tidak ada klien yang memegang kunci anon menyentuh tabel user), tapi
bunyi §12 lebih keras daripada yang dijalankan. Jembatan Privy→Supabase JWT
masuk M5 atau tidak: belum diputuskan.

### 9. 🧑 M6 — mainnet & beta tertutup 100 user

Prasyarat sebelum mulai: keputusan §16 #5, #8, #11 (lihat di bawah).

---

## Keputusan yang menunggu Anda (§16)

Delapan dari sebelas sudah terkunci. Tiga sisanya sengaja tidak saya putuskan
sepihak — masing-masing berkonsekuensi finansial, legal, atau keamanan.

| # | Keputusan | Kapan dibutuhkan |
|---|---|---|
| 8 | **Alokasi tokenomics 1 miliar IDM Reborn** — berapa % ke kolam swap | **memblokir #5** |
| 5 | Kurs IDMX → IDM Reborn (mekanisme sudah disepakati, **angka rasionya** belum) | sebelum fitur Tukar |
| 11 | **Lintas-chain BSC ↔ opBNB** (rekomendasi: kontrak mirror IDM di opBNB) | **memblokir fitur Tukar** |

### Kenapa #8 dan #11 lebih mendesak daripada yang tercatat sebelumnya

**#5 tidak bisa diputuskan sebelum #8.** Kurs bukan pilihan bebas, melainkan
hasil bagi:

```text
kurs = IDMX yang akan terbit selama periode ÷ IDM yang dialokasikan ke kolam swap
```

Pembilangnya sudah bisa dihitung (lihat bagian ekonomi). Penyebutnya = #8.
Selama #8 kosong, angka kurs apa pun hanyalah tebakan berbaju perhitungan.

Peta konsekuensi (asumsi 5 tahun · rata-rata 20.000 user aktif · misi versi usulan):

| Alokasi kolam swap | IDM tersedia | Kurs impas | User rajin dapat |
|---|---|---|---|
| 10% dari 1 miliar | 100 juta IDM | ~51 IDMX = 1 IDM | ~991 IDM/tahun |
| **20%** | 200 juta IDM | **~25 IDMX = 1 IDM** | ~2.021 IDM/tahun |
| 30% | 300 juta IDM | ~17 IDMX = 1 IDM | ~2.973 IDM/tahun |

**Saran arah:** mulai konservatif (angka IDMX per IDM lebih tinggi), lalu
longgarkan tiap kuartal sesuai mekanisme §16 #5 yang sudah disepakati.
Alasannya tidak bisa ditawar: menaikkan kemurahan hati selalu bisa, menurunkannya
menghancurkan kepercayaan secara permanen.

**Peringatan komunikasi:** harga IDM Reborn belum terbentuk (token belum
diperdagangkan). Jadi nilai rupiah reward **belum bisa dijanjikan ke user** —
UI harus menampilkan jumlah IDM, bukan taksiran rupiah.

**#11 ternyata memblokir fitur Tukar, bukan sekadar "menjelang mainnet".**
IDMX hidup di opBNB, IDM Reborn di BSC. Satu kontrak swap tidak bisa menyentuh
dua jaringan sekaligus. Selama #11 belum diputuskan, menu Tukar tidak bisa
dibangun sama sekali.

### Alur Tukar yang direncanakan (§7.7 — terhalang #8 & #11)

1. User kumpulkan IDMX dari misi (opBNB)
2. Buka menu Tukar
3. Kontrak `IDMXSwapPool`: **IDMX dibakar** (§16 #6 sudah diputuskan), IDM
   dilepas dari kolam pada kurs sistem
4. IDM masuk wallet user; menjembatani ke BSC menyusul sebagai fitur terpisah

Tabel `swaps` sudah ada sejak migrasi 0005 — skemanya siap, kontrak & kursnya
yang belum.

---

## Ekonomi reward IDMX — perhitungan

Angka pendanaan awal kontrak reward (**100 juta IDMX**) di
`scripts/deploy-rewards.mjs` adalah **float kerja untuk testnet & beta**, bukan
angka yang diturunkan dari tokenomics. Berikut dasarnya, supaya bisa ditinjau.

**Yang bisa diperoleh satu pengguna paling rajin dalam setahun:**

| Misi | Nilai | Frekuensi maksimal | Setahun |
|---|---|---|---|
| Catat transaksi pertama hari ini | 20 | harian | 7.300 |
| Catat 5 transaksi dalam sehari | 50 | harian | 18.250 |
| Catat 7 hari beruntun | 100 | mingguan | 5.200 |
| Segel laporan bulanan | 150 | bulanan | 1.800 |
| Lengkapi profil usaha | 50 | sekali | 50 |
| **Total** | | | **≈ 32.600 IDMX/tahun** |

Catatan: cap harian 250 IDMX **tidak pernah tersentuh** — misi harian yang
tersedia hanya berjumlah 70/hari. Cap itu jaring pengaman untuk misi baru di
masa depan dan untuk penyalahgunaan, bukan batas yang mengikat hari ini.

**Berapa lama 100 juta IDMX bertahan:**

| Skala | Perhitungan | Cukup untuk |
|---|---|---|
| Testnet (beberapa akun uji) | — | praktis tak terbatas |
| **Beta tertutup M6 (100 user)** | 100 × 32.600 = 3,26 jt/tahun | **~30 tahun** |
| Target §3 (50.000 user, ~35% aktif) | ≈ 600 jt/tahun | **~2 bulan** |

**Kesimpulan jujur:** 100 juta **memadai untuk testnet dan beta M6**, dan itu
memang cakupan yang sedang kita kerjakan. Angka itu **tidak** disiapkan untuk
skala 50.000 user — di sana kolam reward habis dalam hitungan bulan.

Perspektif pasokan: 100 juta dari 10 triliun = **0,001%**. Jadi ini bukan soal
kekurangan token, melainkan soal *berapa banyak yang sengaja dialokasikan untuk
reward* — dan itu justru keputusan §16 #8 yang masih terbuka.

**Yang perlu dilakukan sebelum launch publik:**

1. Tetapkan alokasi kolam reward di dokumen tokenomics (§16 #8) — 🧑
2. Danai ulang kontrak sesuai alokasi itu; mengisi ulang cukup `transfer` biasa
   dari treasury, tidak perlu deploy ulang — 🧑
3. **Pasang peringatan saldo menipis** — 🤖. Ini risiko operasional nyata: bila
   saldo kontrak habis, klaim akan *revert* dan pengguna melihat kegagalan yang
   membingungkan, bukan pesan yang menjelaskan. Sebaiknya API memeriksa saldo
   lebih dulu dan berkata apa adanya.

---

## Catatan yang menghemat waktu nanti

- **Source `ReportAttestation.sol` di repo ≠ byte-per-byte dengan yang live di
  testnet** (`0xa83c...84c4`). Penyelarasan 2026-08-20 (banner + komentar
  Inggris) hanya menggeser ekor metadata bytecode — logika dan ABI identik,
  tidak perlu redeploy. Relevan nanti saat verifikasi source di explorer:
  verifikasi harus memakai source persis saat deploy (commit sebelum f73a7fa),
  bukan versi repo sekarang.
- **Uji lapangan wajib untuk hal yang menyentuh perangkat.** Bug service worker
  yang membekukan login baru tidak muncul di localhost sama sekali — SW memang
  dimatikan saat `NODE_ENV=development`. Bug apa pun di SW secara struktural
  mustahil terlihat di dev.
- **Database uji = database produksi.** `SUPABASE_DB_URL` menunjuk instance yang
  sama dengan Vercel, dan kini berisi akun nyata. `pnpm test:api` aman (data uji
  ber-prefix `did:privy:__test__` dan dibersihkan), tapi query test wajib
  di-scope ketat ke user uji.
- **Jalur sukses on-chain tidak diuji rutin.** `test:api` sengaja hanya menguji
  penolakannya, karena menjalankan klaim/segel sungguhan akan membakar gas
  testnet tiap kali test dijalankan. Jalur sukses diverifikasi manual.
- **Env tanpa `NEXT_PUBLIC_` tidak boleh dibaca komponen klien.** Di browser
  nilainya `undefined` dan diam-diam jatuh ke nilai default yang salah. Pola
  benar: server merakit nilai jadinya, klien tinggal menampilkan.
