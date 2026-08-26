# Papan Kerja AIDM

Pelacak pekerjaan lintas sesi. **README** menjelaskan produk & cara menjalankan;
berkas ini menjawab satu pertanyaan saja: *apa yang sudah beres, apa berikutnya,
dan siapa yang mengerjakan.*

Diperbarui: **2026-08-25** · cabang `main`

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
| M0 fondasi | ✅ selesai | migrasi 0001–0020, rute & onboarding v3.0 |
| M1 parser & tab Catat | ✅ selesai | `test:parser` 200/200 |
| M2 suara & offline | ✅ selesai | uji lapangan Android 2026-08-14 (3 akun nyata) |
| M3 Laporan & PDF | ✅ selesai | `test:api` mem-baca ulang isi PDF, bukan cuma header |
| M4 segel + misi | ✅ kode selesai | segel & misi **live di opBNB testnet**; sisa: satu klaim manual |
| M5 premium & kredit | ⬜ belum mulai | — |
| M6 mainnet & beta | ⬜ belum mulai | — |
| M7 Play & App Store | ⬜ belum mulai | — |

**Gerbang otomatis terkini (2026-08-25):** `test:parser` 200/200 ·
`test:canonical` 23/23 · typecheck bersih · lint bersih · build sukses.

⚠️ **`test:api` belum bisa dituntaskan di mesin pengembangan sekarang** — bukan
karena gagal, tapi karena harness-nya putus di tengah (lihat §6 utang teknis).
Angka 123/123 yang terakhir sah tercatat pada run 2026-08-22 pagi, sebelum batch
UI. Jangan tulis ulang angka itu sebagai "hijau hari ini" sampai ada satu run
yang benar-benar selesai.

**Produksi:** `aidm-idmtoken.vercel.app` (tim Vercel **Pro** `idmtoken`) —
auto-deploy dari `main`. Domain `ai.idmtoken.com` **sengaja belum dipasang**;
menyusul saat siap live.

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
- [ ] Uji jalur sukses: buka tab Misi, klaim "Catat transaksi pertama hari ini"
      → IDMX masuk, tautan opBNBScan tampil *(jalur sukses on-chain memang tidak
      diuji otomatis — lihat catatan di bawah)*

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

**Sisa terkait, dijadwalkan ke P1-3:** skeleton Beranda diulang dari nol tiap
kembali dari tab lain. Korektness benar, terasa lambat, sebabnya tidak ada
cache klien — dikerjakan bersama P1-3 sebagai satu mekanisme, bukan tambalan.

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

### 5. 🤖 Hidupkan tab Misi tiap hari — **disepakati 2026-08-15, siap dikerjakan**

Masalahnya nyata: di hari biasa hanya **2 misi** yang bisa diklaim. Setelah
keduanya selesai, tab Misi jadi layar mati sampai besok. Empat misi berikut
dipilih bukan sekadar menambah hadiah, tapi karena **membayar perilaku yang
memang kita inginkan**:

- [ ] Catat pemasukan **dan** pengeluaran hari ini — **20/hari**
      *(laporan hanya berguna kalau dua sisi tercatat; sekarang user bisa cuma
      mencatat pemasukan dan laporannya timpang)*
- [ ] Catat pakai suara hari ini — **15/hari**
      *(suara adalah pembeda utama vs BukuWarung, tapi tidak ada apa pun yang
      mendorong orang mencobanya)*
- [ ] Buka Laporan mingguan — **30/minggu**
      *(kebiasaan MEMBACA laporan — inti bankability, bukan sekadar menimbun data)*
- [ ] Runtun 30 hari — **300/bulan**
      *(runtun 7 hari terlalu cepat selesai lalu tidak ada tangga berikutnya)*

Dampak: 4 misi/hari (dari 2) · 70 → **105 IDMX/hari** · 32.600 → **50.535
IDMX/tahun**. Cap harian 250 tidak perlu diubah (masih ada ruang 2,4×). Kolam
100 juta tetap cukup untuk beta 100 user selama ~20 tahun (dari 31).

### 6. 🤖 Utang teknis kecil

- [ ] Peringatan saldo kontrak reward menipis — kalau habis, klaim *revert* dan
      user melihat kegagalan membingungkan, bukan penjelasan
- [x] ~~Saldo IDMX hardcode `0`~~ — dibaca on-chain 2026-08-22
      (`lib/token/saldo.ts`, batas 2,5 dtk + cache 60 dtk; `null` ≠ 0)
- [ ] Bundle `/masuk` 848 KB vs target §12 ≤200 KB — SDK Privy, perlu lazy-load
- [x] ~~4 tombol Pengaturan mati~~ — dihidupkan 2026-08-22. Gaya bahasa AI
      tersimpan (migrasi 0020) dan masuk prompt lewat peta nilai; kebijakan
      privasi jadi halaman; ekspor wallet lewat Privy. **Notifikasi sengaja
      tetap menyatakan "belum tersedia"** — push infrastructure memang belum
      ada, dan meminta izin notifikasi untuk sesuatu yang belum bisa dikirim
      lebih buruk daripada mengakuinya.
- [ ] **`test:api` rapuh di mesin lambat** — `next start` menutup koneksi
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

- [ ] Fitur riset & konten dipagari Kredit AI (§7.8)
- [ ] Pembelian kredit Midtrans (QRIS/VA) — env sudah di-scaffold
- [ ] Hardening PDP: purge `raw_input` 90 hari (§16 #10, sudah diputuskan)

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
