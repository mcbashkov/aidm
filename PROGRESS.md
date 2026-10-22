# Papan Kerja AIDM

Pelacak pekerjaan lintas sesi. **README** menjelaskan produk & cara menjalankan;
berkas ini menjawab satu pertanyaan saja: *apa yang sudah beres, apa berikutnya,
dan siapa yang mengerjakan.*

Diperbarui: **2026-10-22** · cabang `main`

> ⚠️ **Sisi token digantikan `docs/PERINTAH-AGEN-FINAL.md`.** Untuk apa pun yang
> menyangkut IDMX/IDM Reborn/swap/kurs/tokenomics, dokumen itu sumber kebenaran
> tunggal, dan **§0.1 di dokumen itu memuat tokenomics final** (dikunci PO
> 2026-08-28, diverifikasi on-chain: nol perbedaan). Bagian "Ekonomi reward
> IDMX" di bawah **sudah usang** — jangan dipakai. Bagian lain papan kerja ini
> tetap berlaku.
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
> mainnet. ✅ **Verifikasi source keenam kontrak SELESAI 2026-08-31** (§10) — BSC
> Testnet lewat Etherscan, opBNB Testnet lewat Sourcify. Badge explorer opBNB
> **tidak bisa didapat**: jalur tulis Etherscan untuk chain 5611 rusak untuk
> setiap kontrak (dibuktikan dengan kontrak pihak ketiga), sementara opBNB
> **Mainnet (204) terbukti normal** — jadi tidak menghambat rilis. Rincian:
> `contracts/ALAMAT-DAN-CATATAN.md` §8. ⬜ Sisa: `scripts/ratchet-check.mjs`
> (§5) dan dust top-up opBNB.

**Legenda pemilik:** 🧑 = butuh tangan Anda (kunci, dompet, keputusan bisnis,
perangkat fisik) · 🤖 = bisa saya kerjakan sendiri

---

## Keadaan sekarang

| Milestone | Status | Bukti |
|---|---|---|
| M0 fondasi | ✅ selesai | migrasi 0001–0029, rute & onboarding v3.0 |
| M1 parser & tab Catat | ✅ selesai | `test:parser` 200/200 |
| M2 suara & offline | ✅ selesai | uji lapangan Android 2026-08-14 (3 akun nyata) |
| M3 Laporan & PDF | ✅ selesai | `test:api` mem-baca ulang isi PDF, bukan cuma header |
| M4 segel + misi | ✅ **selesai** | klaim diuji PO di aplikasi 2026-08-26 (spinner → Diklaim + tautan opBNBScan); 11 klaim produksi semuanya `confirmed` |
| M5 premium & langganan | 🟡 **hampir tuntas** | migrasi 0027+0028 live · alur langganan diuji ujung-ke-ujung di produksi **14/14** · halaman hukum publik · sisa: kunci Midtrans + bundel `/masuk` |
| M6 mainnet & beta | ⬜ belum mulai | tokenomics terbuka, tapi **audit pra-mainnet menemukan 1 Critical + 4 High** (semua Terbuka) — lihat Titik lanjut |
| M7 Play & App Store | ⬜ belum mulai | — |

**Gerbang otomatis terkini (2026-10-22, Batch 9):** `test:parser` 200/200 +
korpus kasbon 29/29 · `test:swap` 36/36 · `test:canonical` 27/27 ·
`test:kesiapan` 22/22 · `test:pajak` 17/17 · `test:misi` 30/30 · `test:api`
**282/282** (env produksi, 22 seksi) · typecheck bersih · lint bersih · build
Vercel READY (`cb9f391`). Uji browser produksi terakhir: 17/17 (P2-6 + guardrail,
2026-09-07) dan 11/11 (perbaikan "Menyiapkan…" + identitas ber-cache).

**Produksi 2026-09-07:** 16 pengguna · 128 transaksi · 13 klaim misi ·
**16/16 punya `wallets`, 0 alamat ganda** (sesudah perbaikan §7d) · 2 langganan
keduanya `tidak_aktif` (masa coba PO habis) · 0 klaim menggantung · 0 yatim.
**Dikonfirmasi PO 2026-08-31: aplikasi terasa cepat setelah perbaikan.**

⚠️ **Nol klaim misi baru sejak 2026-08-26** — akibat langsung §7d, bukan
kurangnya minat: tanpa dompet, klaim memang ditolak. Angka ini yang pertama
harus bergerak kalau perbaikannya benar.

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

**On-chain — SEMUA ter-deploy 2026-08-21, source terverifikasi 2026-08-31.**
Rujukan lengkap (tx pembuatan, argumen konstruktor, setelan kompilasi, peran
kunci, aturan operasional): **`contracts/ALAMAT-DAN-CATATAN.md`**

| Kontrak | Jaringan | Alamat | Verifikasi |
|---|---|---|---|
| ReportAttestation | opBNB testnet 5611 | `0xa83c201c3759fa1a92bd17dbebb46b85029a84c4` | Sourcify `match` |
| IDMX | opBNB testnet 5611 | `0xccf9551396cb559e5c2caa1006485d051b7cf09a` | Sourcify `exact_match` |
| MissionRewards | opBNB testnet 5611 | `0xbc6f412024cee7e8117bd1ee35759d027fce11e5` | Sourcify `exact_match` |
| SwapInitiator | opBNB testnet 5611 | `0xa4f00039540dfdd040635a17090bf4e797168b63` | Sourcify `exact_match` |
| IDMReborn | BSC testnet 97 | `0x78c7e68142e7e1b564c0fd342954aa515a3d2f5b` | ✅ BscScan |
| SwapClaim | BSC testnet 97 | `0xccf9551396cb559e5c2caa1006485d051b7cf09a` | ✅ BscScan |

Keempat kontrak opBNB **tidak berbadge di explorer** — Sourcify layanan
terpisah dan BscScan tidak menariknya. Bukan kesalahan konfigurasi kita; lihat
`contracts/ALAMAT-DAN-CATATAN.md` §8.

Alamat IDMX dan SwapClaim **memang identik** — deployer & nonce yang sama di dua
chain berbeda menghasilkan alamat yang sama. Bukan salah tempel: `eth_getCode`
mengonfirmasi kode yang **berbeda** di masing-masing chain (1.629 B vs 3.659 B).

**Kesetaraan bytecode ↔ kode sumber dibuktikan langsung** untuk keenamnya
(kompilasi ulang + `eth_getCode`, slot `immutable` di-mask). Nilai `immutable`
yang diekstrak membuktikan `MissionRewards.token` dan `SwapInitiator.idmx`
menunjuk IDMX, dan `SwapClaim.idm` menunjuk IDMReborn. `domainSeparator`
dihitung ulang dan cocok untuk chainId 5611 dan 97 — replay lintas chain
tertutup.

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

**Keadaan: M5 tuntas kecuali kunci Midtrans. M6 terbuka tapi punya syarat
keamanan baru.**

> 🔴 **Terakhir dikerjakan (2026-09-07): jalur pembuatan dompet ternyata MATI
> sejak 28 Agustus** — tujuh akun mendaftar tanpa dompet selama sepuluh hari,
> tanpa satu pun sinyal (gejalanya `200`, bukan `409`). Akar penyebabnya
> dicabut, tujuh akun dipulihkan, dan alarm invarian dipasang serta terbukti
> berbunyi. **Baca §7d dan §7e sebelum menyentuh apa pun di jalur masuk.**

### ⛔ Memblokir — butuh tangan PO

| # | Apa | Kenapa |
|---|---|---|
| 1 | **Kunci Midtrans di Vercel MASIH DITOLAK** (2026-08-31) | Kunci **sudah terpasang** — `/api/langganan/bayar` menjawab 502, bukan 501, jadi `isMidtransConfigured()` lolos. Tapi Midtrans membalas **401 "Access denied … check client or server key"**. Kunci di `.env.local` terbukti SEHAT: sandbox **201 + token**, produksi **401** (diuji ulang 2026-08-31). Dua kemungkinan, keduanya di dashboard Vercel: (a) `MIDTRANS_IS_PRODUCTION` terlanjur diisi `true` → kode menembak endpoint produksi dengan kunci sandbox; (b) kunci yang di-paste berbeda/ada spasi. **Cara membedakan:** bandingkan 14 karakter awal `MIDTRANS_SERVER_KEY` di Vercel dengan `Mid-server-gLR` (panjang 35), lalu pastikan `MIDTRANS_IS_PRODUCTION` **tidak ada sama sekali**. |
| 2 | **Payment Notification URL** Midtrans | → `https://ai.idmtoken.com/api/langganan/webhook` |
| 3 | **Temuan audit F-01 & F-08** (§ di bawah) | Keputusan tata kelola kunci, bukan kode. **Memblokir mainnet M6.** |

*(F-05 sudah keluar dari daftar ini — diputuskan PO 2026-09-07, lihat di bawah.)*

### 🔐 Audit pra-mainnet — `docs/audit/LAPORAN-PRA-AUDIT.md`

Dikerjakan di sesi terpisah. **8 temuan, semuanya masih Terbuka**, nol baris
kode diubah (sengaja: auditor pihak ketiga harus menerima kode dalam keadaan
yang sama).

| Severity | Jumlah | ID |
|---|---:|---|
| Critical | 1 | **F-01** — `owner` SwapClaim bisa menguras seluruh kolam (150 jt IDM) dalam satu transaksi lewat `sweep`, hanya bermodal `onlyOwner` |
| High | 4 | **F-02** kebocoran `swapSigner` · **F-03** kebocoran `voucherSigner` tanpa cap agregat · **F-04** `owner` MissionRewards bisa menarik seluruh float · **F-08** enam dari tujuh peran istimewa dipegang SATU alamat (`0x1842498b…fb2f3`), termasuk kunci panas server — **dinilai Critical bila konfigurasi ini terbawa ke mainnet** |
| Medium | 2 | **F-05** cap "bulanan" `caps[1]` diakumulasi per HARI · **F-06** burn IDMX tanpa jalur pemulihan on-chain |
| Info | 1 | F-07 SwapClaim tanpa circuit breaker |

Nol dari delapan berasal dari Slither — semuanya dari pemetaan hak istimewa.
Kodenya rapi; **risikonya operasional, bukan implementasi**. Fase 2–4 belum
dijalankan, jumlahnya akan bertambah.

Yang sudah dibuktikan positif: keenam kontrak **bytecode-nya identik** dengan
kode sumber (setelah slot immutable di-mask), `domainSeparator` cocok untuk
chainId 5611 & 97 (replay lintas-chain terlindungi), konfigurasi on-chain tidak
drift, kolam 150 juta IDM utuh.

### ✅ Bisa dikerjakan tanpa menunggu siapa pun

**Urutan yang ditetapkan PO 2026-09-07:** dompet (§7d) → alarm (§7e) → F-05 →
sisanya. Dua yang pertama SELESAI. **Jangan sentuh jalur Midtrans** — PO sedang
menunggu Business review dan melanjutkan di sandbox.

1. ~~**F-05** + plafon global~~ ✅ **SELESAI** (§7f) — sisa: balik env Vercel.
2. **F-07** (SwapClaim tanpa circuit breaker) — murni kode. **Berikutnya.**
   *(hapus akun §7g & "Mode demo" §7h sudah selesai 2026-09-08)*
3. ~~**Satu run penuh `test:api`**~~ ✅ **154/154 pada 2026-10-22** (§7k) —
   angka sah pertama sejak 123/123 tanggal 2026-08-22; dua cek harness yang
   basi disesuaikan ke kontrak yang berlaku, bukan dilonggarkan.
4. **Bundel `/masuk` 829 KB** — sisa terakhir M5 (§6 menjelaskan kenapa
   refaktornya ditunda dan apa penggantinya yang sudah jalan).
5. **M6 — mainnet & beta tertutup**, setelah F-01/F-08 diputuskan.

**F-05 TIDAK LAGI MEMBLOKIR — diputuskan PO 2026-09-07: niatnya memang
BULANAN, dan yang salah adalah kodenya.** Alasan PO, dicatat utuh karena
menentukan bentuk perbaikannya: ember bulanan ada untuk reward besar (segel
+150, profil +50), dan kalau reset harian orang bisa mengklaim reward "bulanan"
setiap hari — itu bukan cap. Akibatnya plafon darurat sesungguhnya **700/hari,
bukan 250** seperti tertulis; cap on-chain justru hanya berguna saat backend
gagal atau kunci bocor, dan di saat itulah selisih 450 itu nyata. F-08 (satu
alamat memegang `voucherSigner`) membuatnya makin genting. Perbaikannya BUKAN
`setCap` — kuncinya di dalam `claim()` (`claimedOnDay[user][bucket][day]`
memakai `day` yang sama untuk kedua ember), jadi butuh **redeploy**; testnet,
jadi gratis. Dikerjakan SETELAH batch dompet, atas urutan PO.

**Menunggu tangan PO (tidak memblokir):** **satu pendaftaran akun sungguhan
untuk menutup verifikasi §7d** · uji batch 2026-08-27 (empat misi baru +
halaman Akun) · prompt instal PWA di Android (§7).

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

~~**Tersisa di tangan PO:** lambang sederhana untuk favicon 16px.~~
✅ **LUNAS 2026-09-09** — logo baru dari PO menyelesaikannya. Diukur dengan
metode yang sama: **3–5 garis per irisan, tebal 15,5% rata-rata** (lama: 10
garis, 4,4%). Sebagian besar garis melewati patokan ≥10% lebar. Dua detail
tipis di bagian bawah (2,8% dan 5,0%) tetap hilang di 16px, tapi siluetnya
utuh — bukan lagi bercak.

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
- [ ] **Refaktor bundel `/masuk` DITUNDA 2026-08-28 — dan ini keputusan sadar.**

      Syarat keras PO: "sesi yang masih hidup harus tetap dikenali tanpa
      menunggu SDK; kalau user yang sudah login jadi harus login ulang,
      batalkan." Menunda SDK Privy di belakang ketukan tombol melanggar syarat
      itu pada satu jalur nyata: pengguna yang sesi Privy-nya masih hidup tapi
      cookie AIDM-nya kedaluwarsa saat ini disinkronkan ULANG secara diam-diam
      oleh `usePrivy()` di mount. Tanpa SDK di mount, jalur itu mati dan mereka
      harus menekan tombol masuk lagi — persis kasus yang disuruh dibatalkan.
      Ditukar dengan yang aman dan nyata (di bawah).

- [x] **Pemilik sesi tidak lagi membayar bundel `/masuk` sama sekali.**
      Middleware memantulkan siapa pun yang punya cookie sesi dari `/masuk` ke
      `/beranda`, SEBELUM satu byte JavaScript halaman dikirim. Aman terhadap
      OAuth: callback Privy mendarat di `/masuk` justru ketika cookie belum
      lahir, jadi tidak ada callback yang bisa terpantul. Yang masih membayar
      829 KB hanya pengunjung yang memang belum punya akun.

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

### 7b. ~~P2-6 · Kebenaran angka, splash, guardrail Catat~~ — ✅ **SELESAI 2026-08-30**

- [x] **"Sisa (laba kotor)" → "Sisa uang".** Rumus TIDAK berubah. Angkanya arus
      kas — pemasukan dikurangi SELURUH pengeluaran termasuk prive dan
      pembelian alat; laba kotor adalah pemasukan dikurangi HPP, dan HPP belum
      ada. Kata "laba" kini **nol** di seluruh teks yang dirender, layar maupun
      PDF yang dibawa pengguna ke pihak ketiga.
- [x] **Delta persentase disembunyikan di bawah 14 hari tercatat**, diganti
      selisih rupiah. "+1057% vs periode lalu" pada 7 hari data hanya mengukur
      bahwa periode sebelumnya nyaris kosong; selisih rupiah tetap jujur berapa
      pun sedikitnya data karena tidak dibagi apa pun.
- [x] **Splash hitam** (rute `/` + `background_color` manifest). Ikon berlatar
      #000, jadi cream di tengah rantai menghasilkan kedipan terang pada
      peralihan ikon → splash. `theme_color` TETAP cream (bilah status selama
      aplikasi terbuka), `/masuk` TETAP cream.
- [x] **P1-5 guardrail Catat — deterministik, nol biaya LLM tambahan.**
      Gerbang pra-LLM memakai ulang kosakata uang parser fallback: kalimat
      tanpa jejak uang tidak pernah mencapai model. Skema parser dibertipe
      (`tidak_dikenali` enum; `pertanyaan` DIHAPUS seluruhnya dari skema model).
      Seluruh kalimat yang dilihat pengguna lahir di `lib/catat/pesan.ts`,
      dipakai server DAN layar dari kode yang sama. Kalimat dipendekkan setelah
      3× offtopic sehari (migrasi 0029) — hitungan itu tidak membatasi apa pun.
- [x] **Regresi tertangkap & diperbaiki di jalan:** prompt baru sempat membuat
      "tadi ada yang bayar" berhenti memicu pertanyaan nominal, karena
      `tidak_jelas` bersaing dengan "buat entri bernominal null". Diperbaiki dua
      lapis — prompt menegaskan urutannya, DAN `tidak_jelas` dengan nol entri
      kini diteruskan ke parser fallback (yang menangkapnya dengan benar).
      `bukan_uang` tidak diteruskan: itu keputusan tegas, bukan keraguan.
- [x] **P4 · "Transaksi terakhir" terbukti segar.** Diuji di browser produksi:
      catat lewat UI → navigasi klien ke Beranda → entri baru tampil paling
      atas tanpa refresh manual. `occurred_at` ketiganya identik (dipatok 12:00
      WIB), jadi `created_at DESC` yang memutuskan urutan — persis pemecah seri
      yang dimaksud.

**Bukti:** 17 pemeriksaan produksi lulus 0 gagal · `test:parser` 200/200 ·
21 pemeriksaan gerbang · typecheck/lint/build bersih tanpa peringatan.

### 7c. ~~"Menyiapkan…" tanpa akhir & nama toko lambat~~ — ✅ **SELESAI 2026-08-31**

Dua keluhan uji produksi PO, satu akar: layar menyimpulkan "sedang memuat"
dari `data === null`, dan `null` juga berarti gagal.

- [x] **`panggil()` kini punya timeout 12 detik.** `fetch` tidak punya batas
      bawaan; satu permintaan menggantung berarti `me` tetap null selamanya dan
      "Menyiapkan…" tidak punya pintu keluar. 12 detik dipilih dari data:
      `/api/me` menjawab 0,9–3,1 dtk pada jalur hangat, ~21 dtk saat tersendat.
      Timeout dan putus-sambungan kini dibedakan, karena kalimatnya berbeda.
- [x] **Kartu Wallet punya keadaan GAGAL.** Sebelumnya kegagalan `/api/me`
      menghasilkan "Dompet belum siap." — menyalahkan dompet pengguna untuk
      kegagalan kita, padahal alamatnya ada di Postgres. Kini "Alamat dompet
      belum terbaca." + tombol Coba lagi.
- [x] **Identitas lewat `KueriProvider`.** Nama tersaji dari salinan terakhir
      seketika. Sekaligus menutup yang belum masuk laporan PO: `/akun` menembak
      `/api/me` **tiga kali** per muat (MeProvider · halaman Akun · daftar
      Pengaturan) — log Vercel menunjukkannya berulang dalam detik yang sama.
      Sekarang **satu**. Urutan provider dibalik: `KueriProvider` di LUAR
      `MeProvider`.
- [x] **`mobile-web-app-capable`** ditambahkan di samping `apple-*`, bukan
      menggantikannya — Safari masih membacanya untuk mode standalone.

**Yang TIDAK bisa dipastikan, dan dicatat apa adanya:** penyebab `/api/me`
memakan ~21 detik. Reproduksi dua kali pada jalur dingin, gagal direproduksi
beberapa menit kemudian (0,9–3,1 dtk). Memblokir `sw.js` tidak mengubah apa pun
dan jumlah permintaan halaman identik (92). Tersangka paling cocok: jalur
dingin serverless/pooler. **Sebabnya tidak menentukan perbaikannya** — yang
mengubah satu permintaan lambat jadi layar mati permanen ada di sisi kita.

**Bukti:** 11 pemeriksaan browser lulus 0 gagal, dijalankan di localhost DAN
produksi. Kegagalan disimulasikan dengan memblokir `/api/me` di lapisan
jaringan (CDP) — blokir tingkat halaman tidak menangkap permintaan yang lewat
service worker, dan uji yang menyangka sudah memblokir padahal belum akan lulus
karena alasan yang salah.

### 7d. ~~Tujuh akun tanpa dompet — jalur pembuatan dompet MATI~~ ✅ **SELESAI 2026-09-07**

**Kerusakan produksi yang berlangsung sepuluh hari tanpa satu pun sinyal.**
Ditemukan saat menjawab pertanyaan status rutin PO, bukan oleh pemantauan.

Sejak `1156194` (28 Agu, layar masuk headless) **tidak ada satu pun baris kode
kita yang membuat embedded wallet.** Yang membuatnya selama ini adalah MODAL
Privy lewat `embeddedWallets.createOnLogin` — dan `createOnLogin` dieksekusi
oleh layar modal itu sendiri, bukan oleh SDK secara umum (`"create-wallet"`
adalah screen React di dalam bundel, lengkap dengan tombol "Try again"). Ketika
modal diganti UI Indonesia demi P1-4, pembuatan dompet ikut hilang bersamanya.
Tujuh pengguna berturut-turut mendaftar tanpa dompet; satu di antaranya sudah
mencatat 21 transaksi.

**Bukti yang memisahkan hipotesis** — `email` dan `auth_provider` terisi 7/7,
dan keduanya lahir dari panggilan Privy yang SAMA yang menghasilkan `alamat`.
Jadi `bacaIdentitas()` sehat; hanya `alamatDariAkun()` yang null. Dikonfirmasi
ke Privy REST: akun terdampak `linked_accounts: [google_oauth]` saja, akun
sehat punya `wallet client=privy`. **Dompetnya tidak terlambat — tidak pernah
dibuat.** Dashboard Privy memang `create_on_login: "off"`, tapi itu BUKAN
penyebabnya: bundel SDK membuktikan config klien menang (`B ?? … ?? z`).

**Kenapa jaring pengaman 2026-08-26 tidak menangkap: ia tidak gagal.**
`alamatWalletUser()` hanya bisa MENYALIN alamat yang sudah ada di Privy ke
Postgres. Ia dengan patuh menjawab "belum siap" untuk sesuatu yang tidak akan
pernah siap. Diagnosis 26 Agustus ("Privy membuat dompet secara asinkron")
mengandaikan dompetnya PASTI jadi — dan andaian itulah yang salah.

- [x] **`buatDompetPrivy()`** (`lib/privy/identitas.ts`) memakai
      `privy.createWallets()` **server-side**. Mode aplikasi
      `user-controlled-server-wallets-only` + recovery default = satu panggilan
      API **tanpa UI apa pun**, jadi syarat P1-4 "nol teks Inggris di alur
      masuk" tetap utuh. Diukur dari dokumentasi SDK sendiri sebelum dipilih,
      bukan diasumsikan.
- [x] **Dipanggil `POST /api/auth/session` DAN `alamatWalletUser()`** — satu
      definisi, dua pemanggil, sejajar `alamatDariAkun()`. Balapan ditangani
      dengan **bertanya ulang ke Privy**, bukan mencocokkan teks pesan galat
      yang bisa berubah diam-diam.
- [x] **Invarian §7.1 pindah ke server.** Syarat PO: pembuatan dompet tidak
      boleh bergantung pada komponen UI mana pun. Komponen tampilan boleh
      diganti kapan saja oleh orang yang tidak tahu ada invarian menumpang di
      sana — jalur sesi tidak.
- [x] **Kegagalan pembuatan BERSUARA** dan mengembalikan `galat-privy`, bukan
      `belum-siap`: layar menerima `idmx: null` ("belum tahu"), bukan angka nol
      yang pasti tentang uang yang tidak pernah diperiksa.
- [x] **Backfill 7 user: 7 pulih, 0 belum siap, 0 galat.** Diverifikasi dua
      arah — `wallets` 16/16 tanpa alamat ganda, DAN Privy REST mengonfirmasi
      dompetnya benar-benar ada di sana sekarang.

**Gejalanya `200`, bukan `409`.** Tiga hari lalu lintas produksi pada hari
penemuan: 4.527×200, 70×304, 7×307 — **nol 4xx, nol 5xx.** Catatan lama di
berkas ini ("gejalanya 400/409, tidak pernah 500, jadi tidak muncul di
pemantauan error") ternyata masih terlalu optimistis.

- [ ] **🧑 Satu pendaftaran akun sungguhan** untuk menutup verifikasi.
      `buatDompetPrivy()` sudah TERBUKTI hidup di produksi — backfill 7 user
      berjalan lewat fungsi itu di deployment nyata. Yang belum terbukti hanya
      cabang `POST /api/auth/session`, dan itu menuntut access token Privy asli
      yang cuma lahir dari login sungguhan. Harness uji mencetak cookie sesi
      sendiri dengan `SESSION_SECRET`, jadi ia melewati rute itu dan secara
      struktural tidak bisa membuktikannya. **Kalau gagal, alarm §7e berbunyi
      dalam satu jam — bukan sepuluh hari.**

### 7e. Alarm invarian dompet — ✅ **TERPASANG & TERBUKTI BERBUNYI 2026-09-07**

`lib/pemantauan/invarian-dompet.ts`, menumpang cron `/api/relayer/tick` yang
sudah ada dan baris `relayer_state` berkunci `id` — **nol cron baru, nol tabel
baru, nol migrasi.** Sekali per jam.

- **Ambangnya NOL, bukan angka yang bisa disetel.** Invariannya menyatakan
  100%; setiap pelanggaran adalah cacat. Ambang yang bisa disetel adalah ambang
  yang bisa salah setel, dan yang paling mungkin disetel adalah "cukup tinggi
  supaya berhenti berisik".
- **Melaporkan UMUR pelanggaran tertua**, bukan cuma jumlah. "7 akun, tertua 10
  hari" adalah jalur mati; "3 akun, tertua 6 menit" adalah lonjakan trafik.
  Angka telanjang tidak bisa membedakan keduanya — dan justru pembedaan itu
  yang tidak kita punya selama sepuluh hari.
- **Memeriksa INVARIANNYA, bukan gejala kegagalannya.** Pertanyaan "apakah ada
  permintaan yang gagal" tidak akan pernah bisa menjawab "apakah setiap akun
  punya dompet". Inilah alasan struktural kelas bug ini luput.
- **User uji `did:privy:__test__` dikecualikan** — `SUPABASE_DB_URL` menunjuk
  instance yang sama dengan produksi, dan alarm yang pernah berbohong sekali
  akan diabaikan pada kali berikutnya, justru ketika ia benar.
- **`relayer_state.audit_dompet` ditulis juga saat SEHAT.** Alarm yang diam
  karena sehat dan alarm yang diam karena mati terlihat persis sama dari luar;
  `updated_at` di situ satu-satunya yang membedakan.

**Dijalankan manual dan terbukti berbunyi** (2026-09-07 04:21 UTC, sebelum
backfill), mendarat sebagai `[error/serverless]` pada permintaan ber-status
`200` — persis titiknya:

```
[audit-dompet] INVARIAN §7.1 DILANGGAR: 7 akun tanpa dompet lebih dari 15
menit, tertua 231 jam. Umur tertua yang besar berarti jalur pembuatan dompet
MATI, bukan sedang antre — periksa POST /api/auth/session dan
buatDompetPrivy(). Pengguna ini tidak bisa mengklaim misi maupun menyegel
laporan.
```

231 jam = 9,6 hari, cocok persis dengan user terdampak pertama (28 Agu 13:24).

- [ ] **🧑 Kanal yang lebih keras (Telegram/email).** `console.error` mendarat
      di klaster galat Vercel, dan itu tetap bergantung pada notifikasi Vercel
      yang aktif. Alarm yang benar-benar mengejar Anda butuh kredensial Anda —
      keputusan PO, ditunda sadar sampai versi ini terbukti jalan.

### 7f. ~~F-05 + plafon global — satu redeploy~~ ✅ **SELESAI 2026-09-07** (menunggu env)

Keputusan PO: **niatnya memang bulanan, kodenya yang kurang.** Ember bulanan
ada untuk reward besar (segel +150, profil +50); kalau reset harian, orang bisa
mengklaim reward "bulanan" tiap hari — itu bukan cap. Akibatnya plafon darurat
sesungguhnya **700/hari, bukan 250**, dan cap on-chain justru hanya berguna
ketika backend gagal atau kunci bocor — tepat saat selisih 450 itu nyata.

- [x] **Ember 1 diakumulasi per bulan kalender UTC+7** (`monthUtc7`, konversi
      civil-from-days standar). Mapping `claimedOnDay` diganti nama jadi
      `claimedInPeriod` — nama lamanya sudah menjadi pernyataan yang salah.
      **Bulan kalender, bukan 30 hari bergulir**: kunci periode backend adalah
      `YYYY-MM` WIB, dan jendela yang melenceng akan menolak klaim yang backend
      anggap sah — pengguna melihat penolakan tanpa sebab.
- [x] **Plafon global harian 500.000 IDMX** (opsi C). ≈7× maksimum SAH harian
      (100 user × (250+450) = 70.000), di dalam rentang 4–8× yang ditetapkan
      PO. `dailyGlobalCap = 0` **ditolak** konstruktor dan setter: nol berarti
      semua klaim mati, dan itu disengaja — plafon yang diam-diam berhenti
      melindungi saat salah setel adalah mode kegagalan yang bersembunyi paling
      lama.
- [x] **Mode penolakan layanan dibuat BERSUARA.** Ongkos plafon global adalah
      penyalahguna bisa menolak reward semua orang sampai besok. Relayer kini
      `console.error` saat sisa plafon turun di bawah seperlima — kalau mode
      ini senyap, kita mengulangi persis kelas kegagalan §7d.
- [x] **`pnpm test:misi`** (baru) — anvil, **30 lulus 0 gagal**. Termasuk batas
      kalender WIB (17:00Z tanggal 31 = pergantian bulan, bukan 00:00Z) dan
      tahun kabisat 2028.
- [x] **Uji regresinya diverifikasi lewat MUTASI.** Cacat F-05 dikembalikan
      satu baris; uji yang bersangkutan **gagal 3 dari 3**, lalu kontrak
      dipulihkan. Uji regresi yang tidak pernah gagal tidak membuktikan apa
      pun — ia hanya membuat kita merasa terlindungi.
- [x] **`--idmx=0x…` di `deploy:rewards`.** Skrip semula SELALU men-deploy IDMX
      baru; menjalankannya untuk memperbaiki kontrak reward akan menghasilkan
      **dua IDMX beredar bersamaan** — kesalahan yang jauh lebih mahal daripada
      bug yang diperbaiki, dan tidak bisa dibatalkan.
- [x] **Ter-deploy & terverifikasi on-chain:**
      `0x3fffdca557fb235fbc3d2516cb0e94910e8a520d`, terdanai 100 juta IDMX,
      `token` menunjuk IDMX yang SAMA, `periodOf(1)` → 2026-09 WIB. Rincian:
      `contracts/ALAMAT-DAN-CATATAN.md` §8b.
- [x] **Konsekuensi tata kelola dicatat di laporan audit** (§0.3.1), sesuai
      syarat PO: `setDailyGlobalCap` adalah kapabilitas istimewa **ketujuh** dan
      memperburuk F-08, jadi ia **wajib** masuk multisig sejak multisig itu
      dirancang. Plafon yang bisa ditinggikan sendiri oleh satu kunci panas
      tidak membatasi apa pun terhadap kunci itu.

- [ ] **🧑 Balik `NEXT_PUBLIC_MISSION_REWARDS_ADDRESS` di Vercel** ke
      `0x3fffdca557fb235fbc3d2516cb0e94910e8a520d`. Kontrak lama tetap melayani
      sampai saat itu — tidak ada yang mendesak.

      ⚠️ **HANYA ketika nol `mission_claims` berstatus non-terminal**
      (`queued`/`sending`/`submitted`/`signed`). Rekonsiliasi relayer membaca
      `nonceUsed` dari kontrak yang ditunjuk env; baris yang sudah dibayar
      kontrak LAMA akan dijawab `false` oleh yang BARU, dikembalikan ke
      antrean, lalu **dibayar dua kali**. Baris `confirmed` aman.
      **Diperiksa 2026-09-07: 13 baris, semuanya `confirmed`, nol non-terminal.**

### 7g. ~~Hapus akun tidak menghapus akun~~ ✅ **SELESAI 2026-09-08**

Ditemukan PO saat uji akun baru. Dialog menjanjikan penghapusan permanen;
kenyataannya akun lahir kembali satu detik kemudian berikut alamat dompet yang
sama. **Masalah kepatuhan UU PDP**, bukan sekadar bug — janji penghapusan yang
tidak dipenuhi, di menu yang bersebelahan dengan "Kebijakan privasi".

**Akar penyebabnya BUKAN cascade.** Cascade-nya lengkap — 18 tabel, diaudit
dari foreign key sungguhan, bukan dari komentar. Yang tidak pernah disentuh
adalah identitas Privy. Sesi Privy di browser tetap hidup sesudah DELETE,
`/masuk` menyinkronkannya ulang diam-diam, dan server membuat ulang akun dari
DID yang masih sah.

Dibuktikan dua arah: log produksi menunjukkan **tiga** `DELETE /api/akun`
masing-masing disusul `POST /api/auth/session` dalam ≤2 detik; dan umur baris
membuktikan datanya memang musnah — DID Privy dibuat 23:03:05 sedangkan baris
`users` yang hidup dibuat 23:05:20, **dua menit lebih muda**. Yang PO lihat
adalah baris baru, bukan baris lama yang bertahan.

Sinkronisasi diam-diam itu **fitur yang sengaja dipertahankan** (§6): sesi
Privy hidup + cookie AIDM kedaluwarsa harus pulih tanpa login ulang. Syarat itu
tidak membedakan cookie kedaluwarsa dari akun yang baru dihapus.

- [x] **`privy.deleteUser(did)` — dan inilah pembeda STRUKTURALnya.** Sesi yang
      cookie-nya sekadar kedaluwarsa masih memegang DID sah, jadi sinkronisasi
      normalnya utuh; akun yang dihapus tidak punya DID lagi, sehingga
      kebangkitannya mustahil menurut konstruksi — bukan menurut timing. Tanpa
      tombstone, tanpa pengenal yang harus disimpan (yang justru akan jadi
      pelanggaran PDP baru).
- [x] **Urutan disengaja: Privy dulu, baris lokal kemudian.** Dua sistem tidak
      bisa jadi satu transaksi, jadi yang bisa dipilih hanya inkonsistensi mana
      yang lebih ringan. Privy gagal → nol yang dihapus, dilaporkan gagal.
      Kebalikannya menghasilkan keadaan PALING buruk: pengguna melihat "akun
      terhapus" sementara identitas & dompetnya hidup — satu-satunya kegagalan
      yang BERBOHONG kepadanya.
- [x] **`deleteUser` diuji terisolasi lebih dulu** dengan identitas buangan:
      `importUser` + wallet → `deleteUser` → `getUserById` menjawab 404.
      Kredensial kita memang berwenang menghapus — itu tidak diasumsikan.
- [x] **`logout()` Privy di klien sebelum DELETE.** Lapis yang paling cepat
      bekerja; server tetap penjaga sesungguhnya.
- [x] **Migrasi 0030 — `subscription_orders` CASCADE → SET NULL.** UU PDP dan
      kewajiban pembukuan UU KUP saling tarik; jalan keluarnya memisahkan
      CATATAN dari ORANGNYA. Yang tersisa hanya nominal, tanggal, status, dan
      `aidm-<uuid v4 acak>` — **diperiksa, bukan diasumsikan**: seandainya
      order id diturunkan dari `user_id`, migrasi ini akan menyisakan pengenal
      yang masih menunjuk orang. `subscriptions` tetap cascade: itu hak akses,
      bukan catatan keuangan.
- [x] **Kasus baru yang ditimbulkan migrasi itu ikut ditutup:** pembayaran yang
      lunas SETELAH akun dihapus. Status tetap naik ke `paid` (uangnya nyata),
      langganan tidak diperpanjang, dan `console.error` meminta pengembalian
      dana oleh manusia. Tanpa penjaga ini `perpanjangLangganan()` menerima
      `user_id` null.
- [x] **Saldo IDMX — diperingatkan, TIDAK ditolak** (keputusan PO: menolak
      penghapusan karena ada saldo berarti menyandera hak PDP dengan token).
      Peringatan tidak bisa dilewati saat saldo > 0 — checkbox terpisah dari
      frasa HAPUS — menyebut ANGKANYA, menawarkan "Ekspor wallet dulu", dan
      mengatakan yang sebenarnya: **IDMX-nya tidak lenyap**, dompetnya tetap
      milik pengguna bila kuncinya disimpan. Saldo yang GAGAL dibaca sengaja
      tidak memicu peringatan: menahan hak seseorang atas dasar angka yang tak
      pernah kita lihat adalah menebak ke arah yang merugikan dia.
- [x] **Dialog dijujurkan.** Menyebut yang benar-benar hilang (transaksi,
      laporan, profil, dompet, akun), lalu dua hal yang tidak bisa dijanjikan
      hilang: sidik jari laporan tersegel permanen di blockchain —
      **disampaikan sebagai FITUR**, karena segel yang bisa dihapus belakangan
      tidak akan pernah bisa membuktikan apa pun — dan catatan pembayaran
      ter-anonimkan sesuai kewajiban pajak.
- [x] **`/akun-dihapus`** — halaman konfirmasi, rute PUBLIK (cookie sudah
      hilang saat dibuka; `/akun-dihapus` tidak tertangkap `PROTECTED` karena
      pencocokannya `${p}/`, bukan awalan longgar). Sebelumnya pengguna
      dilempar ke `/masuk`, layar yang sama persis seperti sebelum ia punya
      akun: tindakan paling tidak bisa dibatalkan di aplikasi ini berakhir
      tanpa satu kata konfirmasi.
- [x] **`privyTidakDitemukan()` diangkat** ke `lib/privy/identitas.ts` — satu
      definisi, dipakai pengisian dompet susulan DAN penghapusan akun.

**Uji ujung-ke-ujung terhadap PRODUKSI, 10/10** dengan identitas Privy nyata
sekali pakai: users hilang · wallets hilang · transaksi hilang · catatan
pembayaran BERTAHAN dengan `user_id` NULL dan nominal utuh · identitas Privy
menjawab 404. Data uji dibersihkan; produksi sesudahnya 18 user, 18 wallet,
0 tanpa wallet.

### 7h. ~~"Mode demo" pada profil kosong~~ ✅ **SELESAI 2026-09-08**

Label itu melayani DUA keadaan berbeda — profil kosong dan gagal baca — lalu
mengucapkan kalimat yang hanya benar untuk keadaan KETIGA (server tanpa
kredensial) pada keduanya. P2-5 menutup kasus *memuat* dan meninggalkan kasus
*profil kosong*, yang justru dilihat setiap pendaftar baru: kalimat pertama
yang ia baca tentang akunnya sendiri adalah pernyataan bahwa akunnya tidak
nyata.

- [x] Profil kosong → **"Profil belum lengkap"**.
- [x] Gagal baca → tanpa label; kartu dompet sudah mengatakannya sekali
      berikut tombol Coba lagi.
- [x] **Skeleton hanya untuk memuat.** Sebelumnya setiap label kosong digambar
      sebagai skeleton, jadi gagal-baca tampil sebagai shimmer berkedip
      selamanya — kelas bug "Menyiapkan…" tanpa akhir yang sudah dicabut §7c.

"Mode demo" tetap hidup di layar yang memang mode demo (Riset, Catat, Riwayat).

**Ekspor wallet: BUKAN bug** — diperiksa PO, berfungsi normal. Modal milik
Privy, iframe terisolasi, kunci privat tidak pernah melewati kode kita. Jangan
disentuh.

### 7i. ~~Pergantian logo AIDM~~ ✅ **SELESAI 2026-09-09**

Logo baru dari PO (sudah didaftarkan) menggantikan seluruh turunan brand.
Aturan latar sesuai perintah PO: **transparan** untuk favicon, apple-icon,
ikon platform, splash, dan logo Privy · **hitam `#000000`** untuk maskable
Android/iOS saat aplikasi diinstal.

- [x] Seluruhnya lahir dari SATU sumber `public/brand/logo-master.png` lewat
      `pnpm icons` — favicon.ico (16/32/48), app/icon, app/apple-icon,
      icon-192/512, maskable-192/512, logo splash, dan logo modal Privy.
- [x] **Sumber kini SELALU dipangkas dulu**, dan ini mencegah regresi senyap
      yang nyaris terjadi: logo lama mengisi 89% kanvasnya, logo baru hanya
      **58%** (1200×1282 di dalam 2048×2048). Tanpa pemangkasan, `-resize`
      akan mengecilkan setiap ikon sekitar sepertiga — app/icon 89%→58%,
      apple-icon 76%→49%, maskable 62%→41% — dan penyusutan itu akan terlihat
      seperti keputusan desain padahal semata akibat ruang kosong di berkas.
- [x] **Angka isi disalin dari ikon yang SEDANG terpasang**, bukan dikarang:
      89% · 76% · 62% · 86%. Yang berubah hanya artwork-nya, bukan geometrinya.
      Diverifikasi sesudah generasi: 89/76/85/61% — cocok dalam pembulatan 1%.
- [x] **Maskable 62%, bukan 70% nominal** seperti versi lama skrip. Keduanya
      berbeda karena artwork lama membawa ~10% ruang kosong sendiri di dalam
      komposit 70% itu; memakai 70% terhadap lambang yang sudah dipangkas
      justru membesarkan ikon melewati apa yang pernah diuji terhadap masker.
- [x] **Diverifikasi per berkas, bukan diasumsikan:** transparan → piksel pojok
      `srgba(0,0,0,0)`; maskable → `alpha=False`, pojok `srgb(0,0,0)`; favicon
      → alpha sungguhan (min=0 max=1) di ketiga ukuran, bukan diratakan.
      Diuji juga di bawah masker lingkaran — lambang tidak terpotong.
- [x] Logo modal Privy (`idmtokenlogo.png`) ikut diganti dengan lambang persegi
      — keputusan PO 2026-09-08, opsi (b).

**`og-image.jpg` sengaja TIDAK disentuh** atas instruksi PO.

### 7j. ~~Tukar mati di HP · chip Catat personal · peran tak bisa diubah~~ ✅ **SELESAI 2026-10-22**

Tiga temuan dari satu sesi uji PO di perangkat sungguhan. Yang paling mudah
hilang kalau tidak ditulis sekarang: sebab (1) sama sekali bukan di kode
kontrak, dan "sudah jalan di PC" justru yang menyesatkan selama berjam-jam.

**(1) "Gagal membaca data dari jaringan" — hanya di HP, tidak di PC.**

- [x] **Akar: satu endpoint, dan port yang difilter operator.** Pembacaan
      keadaan kontrak dari browser menembak SATU alamat RPC, dan untuk BSC
      testnet alamat itu `data-seed-prebsc-1-s1.bnbchain.org:8545`. Port 8545
      lazim difilter jaringan seluler — permintaannya tidak pernah sampai,
      sementara di WiFi rumah lewat. Bukan alamat kontrak, bukan ABI, bukan
      chain yang salah dirakit; tidak satu pun dugaan awal itu.
- [x] **RPC tiap chain kini DAFTAR, bukan satu alamat** (`lib/chains/rpc.ts`,
      `daftarRpc`: env di depan bila terisi, endpoint resmi sebagai cadangan,
      tanpa duplikat). Pemakai `http()` polos dan Privy tetap membaca entri
      pertama — perilaku lama tidak berubah — sedangkan `publicClient()` di
      `lib/swap/client.ts` memakai SELURUH daftar lewat `fallback()`.
      Semua endpoint berjalan di 443; yang `:8545` dibuang.
- [x] **`retryCount: 1` per endpoint, bukan bawaan viem (3).** Sekali buka
      sheet ada delapan pembacaan: retry bawaan berarti sampai 32 permintaan
      ke endpoint yang sedang menolak — bila sebabnya rate-limit, itu justru
      memperparah. Timeout 6 detik; pembacaan normal dari seluler Indonesia
      ada di kisaran 100–600 ms.
- [x] **Dua env BSC di `.env.local.example` dikosongkan**, karena nilai
      contohnya adalah endpoint `:8545` itu sendiri — siapa pun yang menyalin
      berkas itu mewarisi bug-nya.
- [x] **Sheet Tukar tidak lagi gagal total karena satu kaki.** Dua kaki
      (opBNB: saldo/jatah/izin · BSC: kurs/fee) dibaca `Promise.allSettled`;
      yang terbaca ditampilkan, yang gagal disebut NAMA JARINGANNYA, galat
      muat dipisah dari galat kirim (jalan keluarnya beda: "baca ulang" vs
      "coba kirim lagi"), ada tombol **Coba lagi**, dan satu percobaan ulang
      otomatis 1,5 detik — sekali saja, supaya kegagalan menetap berhenti di
      tombol, bukan di putaran permintaan yang membanjiri RPC. Tombol
      konfirmasi tetap terkunci selama salah satu kaki kosong.
- [x] **Sepuluh endpoint diverifikasi lewat 443 (sesi ini, bukan diasumsikan):**
      `eth_chainId` cocok semua — 0x38 (56), 0x61 (97), 0xcc (204), 0x15eb
      (5611) — **kecuali** `bsc-prebsc-dataseed.bnbchain.org`, yang menjawab
      **503 di port 443** (dua kali) dan hanya hidup di `:8545`. Diganti
      `bsc-testnet.publicnode.com` (terbukti 0x61 lewat 443). Entri yang
      selalu gagal bukan cadangan, cuma satu lapis timeout di depan cadangan
      sungguhan.
- ⬜ **Utang yang disengaja, sebelum mainnet:** pembacaan RPC browser belum
      dipindahkan ke `GET /api/swap/keadaan` + proxy same-origin. "Segar" tidak
      mewajibkan "dari browser" — pembacaan server tanpa cache sama segarnya,
      dan `lib/token/saldo.ts` sudah memakai pola itu dengan alasan yang
      berlawanan (alamat pengguna tidak bocor ke penyedia RPC, tiap tab tidak
      menembak RPC sendiri). `fallback()` membuat testnet bisa dipakai dari HP;
      proxy itu yang menghapus seluruh kelas masalah ini.
- [x] 🧑 **Diuji PO di HP dengan jaringan seluler sungguhan, 2026-10-22:
      sheet Tukar terbaca normal.** Hanya uji ini yang membuktikan
      perbaikannya; gerbang otomatis tidak menyentuhnya. Proxy RPC di atas
      tetap ditunda sesuai keputusan PO.

**(2) Chip Catat: kalimat pengguna sendiri, dan contoh yang cocok bidangnya.**

- [x] **Chip personal** (`lib/catat/chip.ts`): tiga `raw_input` BERBEDA dari
      tujuh hari terakhir, terbaru dulu, maksimal 48 karakter — "Jual 3 nasi
      goreng 45rb bayar QRIS" kemarin tinggal diketuk hari ini. Satu ketukan =
      satu catatan, persis gerakan yang menaikkan metrik utara, tanpa satu pun
      panggilan AI tambahan.
- [x] **Hanya `confirmed`.** Kalimat yang melahirkan draft belum tentu lengkap,
      dan kalimat yang entrinya sudah dihapus bukan contoh yang ingin diulang.
      Jendela 7 hari jauh di bawah retensi `raw_input` 90 hari (§16 #10), jadi
      purge tidak pernah mengosongkannya lebih dulu.
- [x] **Ikut di kueri hidrasi yang sudah ada** (`untuk=catat`), bukan endpoint
      baru: dibutuhkan pada saat yang persis sama dengan thread dan dari kolom
      yang sama. Kegagalan membaca chip TIDAK menggagalkan thread — chip cuma
      pemanis.
- [x] **Dipegang di state komponen sendiri**, karena cache thread dibuang
      setiap kali pengguna menulis (`segarkanSetelahTulis`) dan chip tidak
      boleh ikut lenyap pada detik itu. Kalimat yang baru saja melahirkan entri
      langsung masuk ke depan, tanpa menunggu server membacanya ulang; draft
      dan kalimat tak dikenali tidak ikut.
- [x] **Chip contoh kini peran × bidang usaha** (`lib/earner.ts`): peran
      menentukan BENTUK penghasilan, bidang menentukan BARANGNYA, dan keduanya
      dipilih terpisah di onboarding. Hanya pasangan yang kalimatnya
      benar-benar berbeda yang ditulis; sisanya jatuh ke chip peran, hasilnya
      sama seperti sebelum perluasan. Ojol tidak punya baris: bidang usaha
      tidak mengubah apa pun di sana.
- [x] **76/76 chip baru diuji terhadap parser fallback** (sesi ini):
      masing-masing dibaca sebagai SATU entri bernominal, tanpa memicu
      pertanyaan dan tanpa "tidak dikenali". Contoh yang menghasilkan kartu
      salah lebih buruk daripada tidak ada contoh. `chip.ts` diuji terpisah:
      urutan terbaru-dulu, dedup tanpa memandang kapital/spasi, dan gerakan
      state di `catat-view` (mengulang chip lama memindahkannya ke depan,
      bukan menduplikasinya).

**(3) Peran usaha tidak bisa diubah sesudah onboarding.**

- [x] **Kasus nyata 2026-10-22:** akun "Warung Abadi" berperan "Freelance /
      jasa", jadi chip Catat-nya "Beli lisensi software 300rb". Peran hanya
      bisa dipilih sekali di `/onboarding/peran` dan tidak pernah lagi — salah
      pilih berarti chip dan konteks parser salah selamanya.
- [x] **Baris "Peran & profil usaha" di Akun** (peran, bidang, nama usaha,
      kota). `PATCH /api/me` sudah menerima keempat field sejak v3.0 — yang
      hilang cuma pintunya. Memakai kelas `chip` yang sama dengan layar
      onboarding usaha, bukan lima kartu ikon: di dalam baris pengaturan,
      keputusan satu ketukan tidak butuh satu layar penuh.
- [x] **`meK.muatUlang()` menggantikan `batalkan(KUNCI_ME)`** di baris ini dan
      di BarisGaya. Membuang entri cache menjatuhkan header Akun dan kartu
      Wallet ke skeleton, dan tidak ada yang menjadwalkan pembacaan ulang
      sampai jendela kembali fokus — "Menyiapkan…" tanpa akhir versi kecil
      (§7c). `muatUlang` memaksa pembacaan sambil membiarkan salinan lama
      tampil sampai yang baru tiba.

**Gerbang batch ini:** `rm -rf .next` → typecheck bersih · lint bersih ·
`test:parser` 200/200. `test:api`, `test:swap`, `test:misi` **tidak**
dijalankan (butuh env produksi & anvil) — statusnya masih yang tercatat di
"Keadaan sekarang".

### 7k. Kasbon — Batch 2 🟡 **TAYANG DI PRODUKSI 2026-10-22**, `test:api` menunggu

Lima commit (`c8d6f60..bc07dad`). Commit API & UI membaca tabel `kasbon`,
jadi urutannya WAJIB migrasi dulu, baru push — kalau terbalik, setiap
kalimat kasbon di Catat menjadi 500 di produksi.

**Urutan menyalakan — yang terjadi 2026-10-22:**
1. [x] `pnpm db:migrate` dijalankan dari sesi agen atas perintah PO, setelah
       pemeriksaan baca-saja menunjukkan tabel `kasbon` belum ada. Yang
       masuk: **0030, 0031, 0032** — 0030 ikut karena dulu diterapkan lewat
       SQL Editor tanpa tercatat di `schema_migrations` (efeknya sudah ada,
       diulang aman). Diverifikasi sesudahnya: tabel, kolom `items`, 13
       constraint, 5 indeks, dua fungsi, RLS, `misi_sinyal_harian` versi
       0032, FK 0030 `set null`.
2. [x] `git push` → deploy Vercel `dpl_DxQaXvYoXEXyGz6m1V9CX8L5uLUU` READY
       (build 102 dtk). Cek asap tanpa sesi di `ai.idmtoken.com`: `/api/kasbon`
       404 → 401 (rute ada, auth diperiksa lebih dulu), PATCH/DELETE 401,
       `/laporan` 307 ke `/masuk`, beranda 200.
3. [x] `pnpm test:api` 2026-10-22 dengan env produksi (dev server lokal,
       parser Haiku, log server tanpa galat): **154/154** — seksi 16 kasbon
       **30/30** + cascade kasbon di hapus akun. Jalan pertama mati di seksi
       11 saat servernya terhenti; jalan kedua 153/154; jalan ketiga 154/154.
       Dua cek harness yang BASI disesuaikan, bukan dilonggarkan: seksi 3
       (pertanyaan kini bentuk bertipe `{jenis:"nominal"}`, bukan string —
       perubahan batch sebelumnya) dan seksi 11 (PDF wajib "Sisa uang" tanpa
       kata "laba", aturan `pdf.tsx`; cek lama justru menuntut "laba kotor").
       Pengguna uji `did:privy:__test__*` dibersihkan harness — diperiksa:
       nol tersisa.

**Keputusan PO 2026-10-22 (lima rekomendasi diterima):** kartu di halaman
Laporan yang ada, tanpa segmen baru (segmen "Usaha" tidak pernah ada) ·
basis kas — kasbon tidak masuk Sisa uang, PDF, maupun segel sampai lunas ·
"Tandai lunas" punya dua pilihan eksplisit (catat sekarang / sudah kucatat)
· cicilan ditunda · Hapus untuk salah tangkap, tanpa Edit.

- [x] **Tabel terpisah, bukan baris `transactions` bertanda** (0031). Setiap
      angka uang membaca `transactions` berstatus confirmed; di tabel
      terpisah laporan benar menurut konstruksi, bukan menurut filter yang
      harus diingat di tiap jalur. Status baru di `transactions` juga butuh
      DROP CONSTRAINT — dilarang untuk batch ini.
- [x] **Pelunasan atomik** (`kasbon_lunasi`): kunci baris, buat transaksi
      pada tanggal PELUNASAN, tutup kasbon — satu transaksi DB. Penjualan
      kasbon karenanya masuk laporan pada hari uangnya diterima.
- [x] **Misi tidak menghitung transaksi pelunasan** (0032). Tanpa ini
      setiap ketukan "Tandai lunas" menambah progres misi — hadiah untuk
      satu ketukan dan jalur dari kasbon ke klaim on-chain. Pelunasan yang
      DIUCAPKAN di Catat tetap dihitung, seperti sebelum kasbon ada.
- [x] **Retensi nama orang ketiga:** `raw_input` kasbon 90 hari (janji yang
      sama dengan 0025); `pihak` & `catatan` kasbon yang sudah selesai
      dikosongkan 90 hari setelah selesai, lewat cron pemeliharaan yang
      sama. Transaksi biasa tidak pernah menyimpan `pihak` sama sekali.
- [x] **Parser:** `status_bayar`, `pihak`, `items` di kedua jalur. Pagar
      server: "belum" dari LLM diturunkan ke "lunas" bila kalimatnya tidak
      punya satu pun jejak kasbon — penjualan tunai tidak boleh hilang dari
      laporan karena model keliru menebak. `items` hanya disimpan, tanpa UI
      stok, dan tidak pernah memengaruhi nominal.
- [x] **Korpus kasbon terpisah** (`tests/parser-kasbon.json`, 29 kasus).
      Korpus 200 sengaja tidak ditambah — pembanding historis & gerbang M6.
- [x] **Batas yang dijaga:** Catat tetap gratis (tidak menyentuh
      langganan) · tidak ada skor atau rasio dari kasbon (komponen "Kasbon
      terkelola" PRD §7.4 tidak dibangun) · tidak ada data kasbon di
      kanonik segel (dibuktikan test:canonical) · tanpa kata "laba",
      "layak", "KUR".

**Bukti (sesi ini, bukan diasumsikan):**
- 0031 & 0032 diterapkan DUA KALI ke Postgres sekali pakai (Docker lokal,
  setelah 0001–0030): 10/10 uji perilaku 0031 (kasbon aktif tidak
  menyentuh rollup, tujuh constraint menolak, lintas pengguna KB404,
  pelunasan ganda KB409, "sudah kucatat" tanpa transaksi, FK set null,
  retensi, hak eksekusi, hapus akun → nol baris). 0032: data tanpa kasbon
  menghasilkan angka misi identik sebelum/sesudah; 3 transaksi dengan 1
  pelunasan → 2 terhitung.
- `test:parser` 200/200 · korpus kasbon 29/29 (17/29 sebelum empat
  perbaikan fallback) · 0 dari 200 kalimat lama ditandai "belum" · 9/9
  frasa kasbon di luar korpus terbaca benar · `test:canonical` 27/27.
- UI diperiksa di mode demo (env produksi dikosongkan) pada 375×812.
  Satu bug tertangkap dan diperbaiki: sheet "Tandai lunas" semula
  bergeser 16px karena ikut `space-y` kartunya.

**Belum, dan terbuka:**
- ⬜ Belum ada satu pun kalimat kasbon dari pengguna nyata (baris `kasbon`
      = 0 saat tayang; baris uji dibersihkan harness). Jalur Haiku teruji
      lewat `test:api`, tetapi hanya pada tujuh kalimat seksi 16 — korpus 29
      kasus tetap hanya menguji fallback.
- [x] **Temuan saat verifikasi, di luar kasbon → migrasi 0033 DITERAPKAN &
      DIVERIFIKASI DI PRODUKSI 2026-10-22** (atas perintah PO: dry-run
      menunjukkan tepat satu migrasi menunggu, lalu `db:migrate`; 21 fungsi
      dirapikan, blok verifikasi internal lulus). Sesudahnya di produksi:
      0 fungsi proyek bisa `anon`/`authenticated`/PUBLIC, 21/21 masih bisa
      `service_role`, 118/118 fungsi `vector` tidak tersentuh, default ACL
      `GLOBAL={postgres=X}` + `public={postgres=X,service_role=X}` (entri
      `storage` dibiarkan). Eksekusi NYATA, bukan hanya ACL: `set role
      service_role` → `misi_sinyal_harian` dan `laporan_kategori` jalan;
      `set role anon`/`authenticated` → `permission denied for function`
      pada `misi_sinyal_harian`, `kasbon_lunasi`, `catat_kuota_inc`;
      `vector_dims` tetap jalan untuk `anon`. Kunci server di `.env.local`
      berklaim `role: service_role` (project ref sama). Aplikasi tayang tidak
      terpengaruh: ia selalu memanggil RPC sebagai service_role — kalau
      tidak, RLS tanpa policy sudah memutusnya jauh sebelum 0033.
      Latar temuannya: di produksi **139 dari 139 fungsi** skema
      `public` bisa dieksekusi `anon` (118 milik ekstensi `vector`, 21 milik
      proyek). Sebabnya *default privileges* Supabase memberi EXECUTE ke
      `anon`/`authenticated` saat fungsi dibuat, jadi pola `revoke … from
      public; grant … to service_role` di seluruh migrasi proyek (0013 dst.)
      tidak pernah mencapai maksudnya. **Bukan lubang hari ini,** diperiksa:
      tidak ada `SECURITY DEFINER`, setiap tabel ber-RLS tanpa policy (kecuali
      `schema_migrations`), klien anon `lib/supabase/client.ts`/`server.ts`
      tidak diimpor di mana pun, dan ke-17 pemanggil `.rpc(` memakai klien
      service-role — panggilan `anon` berakhir di nol baris.
      `0033_fungsi_hanya_service_role.sql`: cabut grant eksplisit dari 21
      fungsi milik proyek (anggota ekstensi & fungsi internal Supabase tidak
      disentuh), ubah *default privileges*, lalu **gagal keras** bila masih
      ada yang bocor. Jebakan yang ketemu saat diuji, dan terdokumentasi di
      PostgreSQL: entri *default privileges* **per-skema ditambahkan di atas**
      default bawaan, jadi `revoke … from public` per-skema tidak mencabut
      hak PUBLIC bawaan — dan produksi tidak punya entri global. Karena itu
      0033 mencabut PUBLIC di tingkat **global** dan `anon`/`authenticated` di
      skema `public`. Bukti di Postgres sekali pakai yang meniru produksi
      persis (entri per-skema Supabase, grant eksplisit di tiap fungsi), 0033
      dua kali berturut-turut: 0 fungsi proyek bisa `anon`/`authenticated`,
      19/19 masih bisa `service_role`, 37/37 fungsi ekstensi tidak tersentuh,
      fungsi BARU sesudahnya lahir `{postgres=X,service_role=X}`, dan blok
      verifikasinya terbukti bisa gagal (kebocoran buatan → exit 3).
- ⬜ Menghapus transaksi pelunasan di Riwayat TIDAK membuka kembali
      kasbonnya (kasbon tetap lunas, uangnya hilang dari laporan).
- ⬜ Cicilan, jatuh tempo (kolom sudah ada), dan pengingat WA belum.
- ⬜ Fallback hanya menangkap nama dengan sapaan ("Bu Ani"), dan kalimat
      dua arah seperti "bu warung ngasih utang dulu" terbaca piutang —
      parser LLM yang diandalkan untuk itu.

### 7l. Batch 3 — koreksi klaim Perpres 27/2026 ✅ **TAYANG 2026-10-22**

Perintah: `docs/PERINTAH-AGEN-PREMIUM.md` §Batch 3. Commit `d9ec3dd` (3a) di
atas `bc2f20f` (dua berkas perintah & riset) · deploy
`dpl_9irH97yMjvoNgwTMzTbCUK9g3BN2` READY.

- [x] **3a.** Klaim "berlaku 1 Juli 2026", "~2,8 juta pengemudi",
      "mewajibkan pilar pelatihan manajemen keuangan", "KUR mikro bunga 3%"
      diganti rumusan netral §Batch 3 di PRD §2 #4 (+ catatan kaki yang
      merekam apa yang dihapus dan tanda **[verifikasi naskah di JDIH Setneg
      — PO]**), PRD §4 (sasaran & persona ojol), komentar `lib/earner.ts` dan
      `onboarding/peran` (kini alasan PRODUK: bentuk penghasilan ojol
      berbeda; Perpres disebut sebagai pengakuan mitra), keyword metadata
      `app/layout.tsx`. Grep ulang: README, prompt `lib/parse/llm.ts`,
      `lib/konten`, `lib/research`, halaman hukum — tidak memuat klaim itu.
- [x] **3b.** Migrasi 0033 sudah diterapkan & diverifikasi di §7k; bukti
      "tidak ada jalur yang putus" = `test:api` penuh **154/154** pasca-0033
      (jalan ini, dev server lokal + env produksi, parser Haiku).

**Gerbang §0.3:** typecheck bersih · lint bersih · `test:parser` 200/200 +
kasbon 29/29 · `test:canonical` 27/27 · `test:swap` tidak wajib (tidak
menyentuh swap/chain) · `test:api` 154/154 · tanpa migrasi baru · deploy
READY, cek asap tanpa sesi: `/` 200, `/api/kasbon` 401, HTML beranda memuat
keyword baru dan nol "KUR mikro".

**Keputusan yang saya ambil sendiri:**
- Keyword metadata "KUR mikro" → "berkas pengajuan pinjaman mikro" (§0.2
  menyebut metadata; alternatif ditolak: membiarkannya sebagai "kalimat
  penjelas" — sebuah keyword bukan kalimat).
- PRD §4 (sasaran "definisi yang diperluas negara", persona ojol "akses KUR
  3%") ikut dirapikan meski §Batch 3 hanya menyebut ~59 dan ~85 secara
  eksplisit; alternatif ditolak: meninggalkan klaim turunan yang sama.
- Komentar "penilai KUR" di `lib/laporan/pdf.tsx` dan README dibiarkan —
  kalimat penjelas umum, diizinkan §0.2.

**Butuh tangan PO:** naskah Perpres 27/2026 di JDIH (tanda di PRD §2) ·
`AIDM_Ringkasan_Produk.pdf` di akar repo adalah biner yang masih memuat klaim
Perpres versi lama, "Skor Kelayakan Kredit", dan "laba operasional" — tidak
bisa disunting agen; dokumen itu beredar ke pihak luar.

### 7m. Batch 4 — Kesiapan Catatan ✅ **TAYANG 2026-10-22**

Perintah: `PERINTAH-AGEN-PREMIUM` §1.4 & §Batch 4. Commit `cb0e93a` (lib +
API + 0034), `7eef5f7` (UI), `ab7f751` (harness) · deploy
`dpl_3WzeKzQv5KCXC66gY85X7xfokGcH` READY.

- [x] `lib/kesiapan/hitung.ts` murni (tanpa impor runtime, aritmetika bulan
      atas string YYYY-MM) + `pnpm test:kesiapan` **22/22** — batas bulan
      WIB, akun baru, bulan kosong di tengah, pelunasan kasbon = hari aktif,
      jendela 12, checklist, label per peran.
- [x] `GET /api/kesiapan` + `POST /api/kesiapan/tonggak`; cache per pengguna
      per hari di proses, dikosongkan di awal tiap rute tulis.
- [x] Migrasi **0034** `kesiapan_tonggak` (PK user×tingkat, RLS, cascade):
      dua kali di Postgres sekali pakai → dry-run tepat satu → `db:migrate`
      → verifikasi tabel/RLS/tercatat.
- [x] Beranda: kartu inline setelah "Sisa hari ini"; Laporan: `KesiapanCard`
      menggantikan `ValuationLocked` (komponen & `VALUASI_BUTUH_BULAN`
      dihapus); Catat: toast tonggak sekali seumur akun.
- [x] Diperiksa dengan sesi uji di dev server lokal (pengguna `siap3` yang
      disemai lalu dihapus): Beranda menampilkan "Siap 3 bulan · 3 dari 6
      bulan terakhir aktif · Buat Berkas Usaha"; Laporan `#kesiapan` tampil
      dengan checklist penuh dan gulir mendarat di kartunya. Toast Catat
      diverifikasi di tingkat API (seksi 17), tidak sempat diperiksa visual.

**Gerbang §0.3:** typecheck bersih · lint bersih · `test:parser` 200/200 +
kasbon 29/29 · `test:kesiapan` 22/22 · `test:canonical` 27/27 (tidak wajib) ·
`test:api` **173/173** (seksi 17 baru: 18 cek + cascade) · 0034 diterapkan
sebelum push · deploy READY · cek asap: `/api/kesiapan` 404 → 401.

**Keputusan yang saya ambil sendiri:**
- Jendela `siap3` = 6 bulan termasuk bulan berjalan; hanya `siap6` yang
  mengecualikannya (teks §1.4 hanya menyebut pengecualian pada siap6).
- `rutin` = ≥1 bulan aktif yang belum siap3/siap6 — tabel §1.4 tidak
  menutup tiga bulan aktif yang tersebar di luar 6 bulan terakhir.
- Tonggak toast di tabel kecil `kesiapan_tonggak`, bukan kolom `users`;
  menandai siap6 ikut menandai siap3.
- Cache harian di dalam proses (bukan tabel) dengan invalidasi di AWAL tiap
  rute tulis; jendela basinya sepersekian detik dan tersapu pergantian hari.
- Toast Catat diperiksa saat thread pertama terbaca, bukan tiap kirim.
- Mode demo: kartu tidak dirender (tidak ada catatan siapa pun untuk dinilai).
- Field `bulanTercatat` di `/api/laporan` dibiarkan walau `ValuationLocked`
  hilang — cek harness lama masih memakainya.

**Catatan operasional:** dev server `next dev` dua kali dibunuh OOM killer
kernel (RSS 3,3 GB lalu 4,0 GB) saat harness menyentuh semua rute, dan
yang kedua ikut mematikan sesi agen. Mulai Batch 5 dev server lokal dijalankan
dengan `NODE_OPTIONS=--max-old-space-size=2048` (konfigurasi lokal
`.claude/launch.json`, tidak di-commit) supaya yang mati hanya servernya.

**Butuh tangan PO:** tidak ada.

### 7n. Batch 5 — Berkas Pengajuan ✅ **TAYANG 2026-10-22**

Perintah: `PERINTAH-AGEN-PREMIUM` §1.1, §1.2, §1.5, §Batch 5. Commit
`74cea8f` (0035 + katalog + lib/berkas + rute + webhook + cron), `190a8bf`
(UI), `b2cb68a` + `8b8946d` (harness) · deploy
`dpl_5216WuVUcLSPdf9ve4nGWbqoTMPb` READY.

- [x] Migrasi **0035**: `berkas_pengajuan`, `premium_events`,
      `subscription_orders.kode` (NULL = pesanan lama tetap sah), bucket
      privat Storage `berkas` dibuat dari migrasi (dijaga "hanya bila skema
      storage ada"). Dua kali di Postgres sekali pakai (9 bukti + trigger
      lintas transaksi) → dry-run tepat satu → `db:migrate` → bucket
      terverifikasi `public=false`.
- [x] `lib/langganan/katalog.ts`: satu-satunya tempat harga/nama produk;
      `syaratBeli` berkas6 ≥ siap3, berkas12 ≥ 6 bulan aktif/12.
- [x] PDF (`lib/berkas/render.tsx`, pola pdf.tsx, tanpa library PDF baru):
      sampul + QR (Svg/Rect dari matriks `qrcode`), ringkasan per bulan +
      grafik batang, rincian per bulan (bulan kosong tetap berhalaman),
      penutup (pernyataan baku, dokumen pendamping, notarisasi). Diperiksa
      VISUAL: tanda air PRATINJAU miring, QR, tabel & grafik tampil benar.
- [x] Alur: nomor → render → bucket → SHA-256 → `attestFor(keccak(
      "berkas:<nomor>"))` → status; cron menyapu `gagal` (maks 3×) dan segel
      menggantung. Rute pratinjau/pesan/daftar/unduh (signed URL 10 menit)/
      verifikasi publik (tanpa data keuangan). Webhook sadar `kode`.
- [x] UI: tombol "Buat <label peran>" di kartu Kesiapan (Laporan) → sheet
      pratinjau (halaman 1 nyata, halaman lain terkunci, harga, beli);
      Akun: daftar berkas + unduh ulang; `/verifikasi/<kode>` publik dengan
      pencocokan hash di perangkat pembaca.

**Gerbang §0.3:** typecheck bersih · lint bersih · `test:parser` 200/200 +
29/29 · `test:canonical` 27/27 (wajib: segel/PDF) · `test:kesiapan` 22/22 ·
`test:api` **206/206** (seksi 18: 33 cek + cascade `premium_events`) ·
0035 diterapkan sebelum push · deploy READY · cek asap tanpa sesi:
`/api/berkas*` 401, `/api/verifikasi/<asing>` 404, `/verifikasi/<kode>` 200.
Tiga jalan `test:api`: ke-1 gugur di harness (bersih-bersih SQL ke
`storage.objects` ditolak trigger Supabase `storage.protect_delete`, dan
galat `finally` itu menutupi putusnya soket sesaat); ke-2 202/206 — empat
assertion keliru (tanda air tak terekstrak `pdftotext`, "idmtoken" di
domain, "kriptografis" yang wajib, boolean `'true'`); ke-3 206/206.

**Keputusan yang saya ambil sendiri:**
- Periode berkas = N bulan PENUH yang berakhir di bulan lalu (bulan berjalan
  belum lengkap); "nama pemilik" tampil "—" (profil tidak menyimpan nama).
- Sidik jari SHA-256 tidak dicetak di dalam PDF (sirkular): penutup
  menyatakan di mana ia dicatat; pembaca mencocokkan di halaman verifikasi.
- Pesanan berkas memakai `periode_hari = 1` (kolom `check > 0`; berkas
  bukan langganan). Pratinjau mencetak "Terbit setelah pembelian" di tempat
  nomor — nomor baru lahir saat dokumen dibuat.
- Baris berkas lahir `gagal` lalu diproses: proses yang mati di tengah
  terlihat dan dicoba ulang cron, bukan "setengah jadi" yang tersembunyi.
  Tanpa dompet/segel → `dibuat` + galat yang menyebut sebabnya; dokumen
  tetap bisa diunduh, notarisasi menyusul.
- Halaman verifikasi publik TANPA tautan explorer rantai (§0.2: dibaca
  bank/pejabat); tautan itu tersedia di dalam aplikasi.
- `qrcode` 1.5.4 ditambahkan (sudah di store pnpm sebagai transitif; bukan
  library PDF). Label bulan dipisah ke `lib/berkas/label.ts` agar komponen
  klien tidak menarik react-pdf ke bundel.
- Pembersihan PDF uji di harness lewat Storage API (SQL dilarang).

**Butuh tangan PO:** kunci Midtrans produksi masih 401 (Memblokir #1) —
jalur bayar per dokumen hanya bisa hidup setelah itu; sampai saat itu
tombol beli menjawab "sedang disiapkan". Uji di HP: Laporan → "Buat Berkas
Usaha" → pratinjau → (Plus) buat → unduh; buka `/verifikasi/<kode>` dari HP
dan cocokkan PDF-nya.

### 7o. Batch 6 — Etalase premium & SKU Plus tahunan ✅ **TAYANG 2026-10-22**

Perintah: `PERINTAH-AGEN-PREMIUM` §1.1, §1.3, §Batch 6. Commit `53a8dcd`
(SKU + katalog + webhook + riwayat), `d826aaf` (UI /premium, Akun, halaman
hukum), `389420e` (harness seksi 19 + dua perbaikan harness) · deploy
`dpl_AwEbxQSGaPmkustsJCe6cmx8BcWP` READY. Tanpa migrasi.

- [x] SKU 30 hari → **AIDM Plus 365 hari Rp149.000** (`kode = plus`).
      `HARGA_BULANAN_IDR`, `PERIODE_HARI`, `HARGA_TAMPIL` dihapus dari
      `lib/langganan/index.ts`; harga, periode, dan nama produk kini
      satu-satunya di `lib/langganan/katalog.ts`. `POST /api/langganan/bayar`
      mencatat `kode` + `premium_events` klik_beli; webhook sadar `kode`
      (plus → 365 hari + bayar_sukses · berkas → `buatBerkas` · pesanan lama
      tanpa kode → jalur lama); `GET /api/langganan` + `riwayat` (20 lunas
      terakhir).
- [x] `/premium` urutan §1.3 #6: Berkas (label peran, harga 6/12 bulan,
      tautan ke pintu Laporan) → Plus tahunan (masa coba 7 hari tetap) →
      "Termasuk dalam Plus" (Riset Tren & Generator Konten, gerbang 402/429
      yang ada) → gratis selamanya + Kesiapan Catatan + Segel. Tidak ada
      angka rupiah hard-coded.
- [x] Akun: kartu "Fitur premium" → **"Langganan & berkas"** (status Plus/
      masa coba, riwayat pembelian, daftar berkas + unduh ulang, tautan
      `/premium`) — bukan lagi pintu penjualan utama; pintu utama di Laporan.
- [x] `/syarat-ketentuan` + `/pengembalian-dana`: "30 hari" → Plus 365 hari
      dan Berkas sekali bayar per dokumen; tetap "tidak diperpanjang
      otomatis".
- [x] Tidak berubah: masa coba 7 hari sekali seumur akun, `KUOTA_BULANAN`
      Riset/Konten, `middleware.ts`, langganan lama `tidak_aktif`.

**Gerbang §0.3:** typecheck bersih · lint bersih · `test:parser` 200/200 +
29/29 · `test:canonical` 27/27 · `test:kesiapan` 22/22 · `test:api`
**218/218** (seksi 19: 12 cek — pesanan plus 365 hari Rp149.000; notifikasi
Midtrans disimulasikan dengan tanda tangan sha512 yang sah dari kunci
sandbox lokal, tanpa jaringan Midtrans dan tanpa uang nyata: tanda tangan
palsu 401, nominal tak cocok → `failed`, settlement sah → aktif ≈365 hari,
replay → "sudah diproses" tanpa menambah masa, Plus dari pesanan memberi
berkas tanpa bayar) · deploy READY · cek asap produksi: `/api/langganan`
401 tanpa sesi, `/syarat-ketentuan` dan `/pengembalian-dana` memuat
"Rp149.000"/"365 hari" dan tidak lagi "30 hari".

**Keputusan yang saya ambil sendiri:**
- Durasi perpanjangan di webhook diambil dari **katalog berdasarkan `kode`**,
  bukan dari `subscription_orders.periode_hari` — kolom itu jejak harga/masa
  saat memesan, bukan otoritas; pesanan tanpa `kode` (era 30 hari) tetap
  memakai jalur lama agar notifikasi yang terlambat tidak salah hitung.
- Kartu Pajak **disembunyikan** sampai Batch 9 (bukan "segera hadir" yang
  menjanjikan tanggal).
- Riset & Konten tidak dipindah; hanya diberi label "termasuk dalam Plus"
  dan ajakan diarahkan ke Plus tahunan (keputusan arsitek PO).
- Harness: galat TRANSPORT (soket ditutup sebelum menjawab) diulang satu
  kali — yang diuji aplikasinya, bukan soketnya; klien Storage memakai
  `fetchAsli` (pembungkus `connection: close` menyebar `Headers` sehingga
  content-type hilang); pesanan uji dihapus eksplisit di akhir
  (`subscription_orders` bertahan saat pengguna dihapus).

**Butuh tangan PO:** kunci Midtrans produksi masih 401 (Memblokir #1) —
pembelian Plus di produksi menjawab "sedang disiapkan" sampai itu beres.
Uji di HP: `/premium` → kartu Berkas menautkan ke Laporan; Akun → "Langganan
& berkas" menampilkan status + riwayat; Syarat & Ketentuan menyebut 365
hari.

### 7p. Batch 7 — Misi rantai "Siap Bank" ✅ **TAYANG 2026-10-22**

Perintah: `PERINTAH-AGEN-PREMIUM` §1.4, §Batch 7. Commit `f2ffeb0` · deploy
`dpl_EoHCNuNcH1tn9PYysn8DjZvT98Tx` READY.

- [x] Migrasi **0036**: tiga misi `once` — `aktif_30` (100), `aktif_90`
      (150), `aktif_180` (250) — `insert … on conflict (code) do update`
      (pola 0016/0023), `aktif = true`. Dua kali di Postgres sekali pakai →
      dry-run tepat satu → `db:migrate` sebelum push → 12 misi aktif.
- [x] `DEFAULT_MISSIONS` + tiga misi (target 30/90/180). Progres di
      `lib/missions/server.ts` = jumlah baris `daily_rollups` dengan
      `jml_transaksi > 0` dalam 365 hari terakhir (definisi hari aktif §1.4,
      sama dengan Kesiapan Catatan) — satu `count` `head: true`, bukan
      menarik 365 baris; kumulatif, bukan runtun.
- [x] Kartu misi 180 hari: tautan **"Buat <label peran>"** →
      `/laporan#kesiapan` — pintu Berkas di Laporan, bukan pembelian di
      dalam Misi. Kartu misi yang ada dipakai apa adanya.
- [x] Klaim lewat jalur yang ada (`POST /api/missions/klaim` →
      `mission_claims` → cron relayer → `MissionRewards`). `CAP_HARIAN_IDMX`
      250, `CAP_BULANAN_IDMX` 450, dan kontrak **tidak diubah**.

**Gerbang §0.3:** typecheck bersih · lint bersih · `test:parser` 200/200 +
29/29 · `test:kesiapan` 22/22 · `test:misi` **30/30** (anvil lokal) ·
`test:api` **247/247** (seksi 20: 9 cek — 40 hari seed + 1 hari ke-200
dihitung, hari ke-400 tidak; `aktif_30` selesai & dipotong di 30; progres
41/90 dan 41/180; cap 250/450 tidak berubah) · deploy READY · cek asap:
`/api/missions` 401 tanpa sesi, 12 misi aktif di DB produksi.

**Keputusan yang saya ambil sendiri:**
- `PERINTAH-AGEN-FINAL` §0.1 tidak menetapkan angka untuk misi sekali-seumur-
  akun → 100/150/250 dari perintah dipakai; jumlah 500 ≈ 9% dari 12 ×
  CAP_BULANAN. Tidak ada selisih yang perlu dicatat.
- Hari aktif dihitung dari `daily_rollups`, BUKAN dari RPC `misi_sinyal_harian`
  (0032) yang mengabaikan pelunasan kasbon: bagi bank, hari pelunasan adalah
  hari pencatatan yang nyata, dan definisinya harus sama dengan Kesiapan
  Catatan yang menjadi pintu Berkas.
- Misi `once` tetap di ember HARIAN (seperti `complete_profile`), bukan
  bulanan — mengikuti `ikutCapHarian` yang ada dan cap kontrak. Akibatnya
  klaim `aktif_180` (250 = cap harian) hanya bisa dilakukan di hari ia belum
  mengklaim misi lain; layar menampilkan kalimat cap harian yang sudah ada
  ("Batas 250 IDMX/hari sudah tercapai. Coba lagi besok.") dengan tombol
  mati — bukan galat. Kalimat "Jatah bulan ini penuh" dari perintah tidak
  berlaku karena misi ini tidak menyentuh ember bulanan.
- Label pintu memakai `useMe()` (identitas ber-cache): sebelum terbaca,
  label umum — sama dengan kartu Kesiapan.
- Direktori kerja berpindah path di tengah run (19:45; `~/idmtoken` menjadi
  symlink ke salinan di drive NTFS); berkas 0036 dan edit Batch 7 yang belum
  ter-commit hilang dan ditulis ulang identik. `db:migrate --dry-run`
  membuktikan 0036 sudah ter-apply di produksi.

**Butuh tangan PO:** tidak ada yang memblokir. Uji di HP: Misi → tiga kartu
"hari aktif" dengan progres N/30, N/90, N/180; kartu 180 hari → tautan
"Buat <label>" membuka Laporan di kartu Kesiapan; klaim `aktif_30` bila
sudah 30 hari aktif (relayer membayar ≤ 1 menit).

**Catatan operasional:** sesi agen mati dua kali karena OOM killer kernel
membunuh `next-server` (RSS 3,3–4,0 GB pada mesin 7,6 GB) dan ikut
menjatuhkan aplikasi desktop; `pnpm install` di drive NTFS macet 24 menit;
rute PDF menjawab 500 saat `.next` dipindah ke disk lain (paket eksternal
`@react-pdf/renderer` diresolusi dari lokasi `.next`). Semua diselesaikan
dengan konfigurasi LOKAL (tidak di-commit): virtual store pnpm dan `.next`
di disk ext4 dengan symlink `node_modules` di dalamnya, dev server dari shell
tanpa tab browser pada port 3200 dengan heap 2 GB (RSS stabil ±1 GB sepanjang
harness), dan `api()` harness mengulang galat transport sampai 5× (jendela
restart pengawas memori Next ±7 dtk) — penyesuaian harness, bukan pelonggaran
assertion.

### 7q. Batch 8 — Proxy RPC same-origin & pembacaan sisi server ✅ **TAYANG 2026-10-22**

Perintah: `PERINTAH-AGEN-PREMIUM` §Batch 8 (utang pra-mainnet). Commit
`21ce111` (0037 + proxy + keadaan), `771c19d` (klien Tukar + Privy lewat
proxy), `fb4e31e` (harness seksi 21 + env + runbook) · deploy `dpl_DPAXsFCeLxw3vn3KoCoNzfDZbNsf` READY.

- [x] `POST /api/rpc/<opbnb|opbnb-testnet|bsc|bsc-testnet>`: pass-through
      JSON-RPC dengan allowlist method, batch ≤ 10, body ≤ 64 KB,
      `eth_getLogs` ≤ 2.000 blok (rentang eksplisit), timeout upstream 8 dtk
      lalu cadangan, batas laju **120/menit** per sesi (atau IP) lewat
      `rpc_rate_inc` (migrasi **0037**, pola `catat_rate_inc` 0028).
      Upstream = `*_RPC_URL_SERVER` (kunci berbayar, opsional, tidak pernah
      ke klien) di depan `daftarRpc()` yang ada. `eth_chainId` dijawab lokal.
- [x] `GET /api/swap/keadaan`: kedua kaki dibaca server (opBNB: saldo/
      minimum/jatah/izin/jeda · BSC: kurs/fee/jeda), cache 10 dtk per alamat,
      `pada` epoch + status per kaki; alamat dari dompet milik sesi.
- [x] `swap-sheet.tsx` memakai rute itu; "Coba lagi" memanggil ulang rute;
      cadangan pembacaan browser lewat proxy bila rutenya gagal.
- [x] Transport klien viem (`publicClient`) dan `supportedChains`/
      `defaultChain` Privy → chain dengan proxy same-origin di depan, daftar
      RPC publik tetap cadangan terakhir (`lib/swap/chains-klien.ts`).
- [x] Service worker: `/api/*` sudah `NetworkOnly` — tidak perlu aturan baru.
- [x] `.env.local.example` (+4 env server) dan `docs/RUNBOOK-ADMIN.md` §11.

**Gerbang §0.3:** typecheck bersih · lint bersih · `test:parser` 200/200 +
29/29 · `test:swap` **36/36** (anvil; wajib: swap/chains) · `test:api`
**247/247** (seksi 21: 20 cek — 404 jaringan asing, allowlist 400
-32601, batch 11 → 400, batch 10 → 200, getLogs rentang/tag → 400 -32602,
body 70 KB → 413, 120 lolos & ke-13 → 429, penghitung 130, keadaan 401/404/
200 dua kaki berstatus, cache 10 dtk) · 0037 diterapkan sebelum push ·
deploy READY · cek asap produksi: `eth_chainId` lewat proxy → `0xcc`,
method asing → 400, `/api/swap/keadaan` → 401 tanpa sesi.

**Keputusan yang saya ambil sendiri:**
- Empat slug, bukan dua: dompet Privy mendaftarkan keempat jaringan dan
  kontrak hidup di fase testnet; `opbnb` dan `bsc` dari perintah tetap sah.
  Env server pun empat (`*_TESTNET_RPC_URL_SERVER` ditambahkan).
- Allowlist perintah + `eth_getBlockByNumber`/`eth_getBlockByHash` (baca-
  saja): viem memanggilnya untuk taksiran biaya EIP-1559 dan saat menunggu
  struk — tanpa itu approve/swap dari dompet gagal di langkah pertama.
- `eth_getLogs` dengan tag (`latest`, dll.) ditolak: rentangnya tidak bisa
  diperiksa tanpa bertanya ke jaringan. Browser tidak pernah memanggilnya
  (relayer di server memakai transport sendiri).
- Batas laju dihitung SETELAH validasi (yang ditolak tidak menyentuh DB/
  upstream); isi batch dihitung per item; penghitung tidak tersedia →
  lewatkan, bukan tolak (pola Catat). Angka 120 dari taksiran satu menit
  sibuk dompet (approve + swap + polling struk ≈ 40–60).
- Tanpa header CORS: proxy untuk halaman same-origin saja; skrip luar tetap
  bisa memanggil (CORS bukan pagar server-ke-server) dan dibatasi per IP.
- Kegagalan kaki tidak di-cache: "Coba lagi" harus membaca ulang.
- Relayer (`lib/swap/relayer-server.ts`) dan saldo kartu wallet
  (`lib/token/saldo.ts`) tidak diubah — sudah sisi server, di luar perintah.
- Baris `rpc_rate` yang tidak tersentuh 24 jam disapu cron pemeliharaan
  (`rpc_rate_sapu`), supaya tabelnya tidak tumbuh tanpa batas.

**Butuh tangan PO:** (1) **Uji approve + swap dari HP di testnet** — ini
satu-satunya jalur yang tidak bisa saya buktikan tanpa dompet Privy
sungguhan: bila dompet Privy ternyata memanggil RPC dari iframe-nya (bukan
dari halaman), panggilan ke proxy same-origin gagal dan transaksi tidak
terkirim; perbaikannya satu baris (`lib/privy/provider.tsx`: kembalikan
`supportedChains`/`defaultChain` tanpa `denganProxy`), pembacaan sheet tidak
terpengaruh. (2) Bila ingin kunci penyedia berbayar: isi `*_RPC_URL_SERVER`
di env Vercel → redeploy; kosong = endpoint resmi.

### 7r. Batch 9 — Modul Pajak OP ("Paket Pajak Tahunan") ✅ **TAYANG 2026-10-22**

Perintah: `PERINTAH-AGEN-PREMIUM` §1.1 (`pajak` Rp59.000/tahun pajak,
termasuk Plus), §Batch 9. Commit `164d60c` (0038 + lib/pajak + rute),
`afc2e75` (UI Laporan/Beranda/Akun//premium + bayar/webhook), `cb9f391`
(harness seksi 22) · deploy `dpl_CN3K13udcKkmH4FcVYbqHRA5MDHx` READY.

- [x] Migrasi **0038**: `users.wajib_pajak_op` (boolean, default mati) +
      tabel `dokumen_pajak` (`rincian` | `pernyataan`, nomor `PJ-YYYY-xxxxx`,
      kode verifikasi 12 huruf, RLS, cascade). Tabel BARU, bukan memperluas
      CHECK `berkas_pengajuan.kode` (DROP CONSTRAINT dilarang §0.3). Tidak
      ada kolom NPWP/NIK di mana pun (dibuktikan harness). Dua kali di
      Postgres sekali pakai (12 bukti) → dry-run tepat satu → `db:migrate`.
- [x] `lib/pajak/hitung.ts` murni + `pnpm test:pajak` **17/17**: batas bebas
      Rp500 juta kumulatif per tahun pajak, PPh Final 0,5% atas BAGIAN di
      atas batas (bulan terlampaui hanya selisihnya, bulan berikutnya
      seluruh omzet), jatuh tempo tanggal 15 bulan berikutnya, pengingat
      tanggal 1–15.
- [x] Gratis: `GET /api/pajak` + kartu "Pajak usaha" di Laporan — baris
      "Omzet tahun ini: Rp X dari batas bebas Rp500 juta" + alarm non-blokir
      saat melewati (hanya bila wajib pajak OP ditandai); toggle "Saya wajib
      pajak orang pribadi" di Akun (`PATCH /api/me`, boolean murni).
- [x] Premium `pajak` (Plus atau pesanan `pajak` lunas <365 hari —
      `bolehPajak`): kalkulator setoran bulan terakhir yang kena; pengingat
      tanggal 15 di Beranda + Laporan (in-app; push belum ada infrastruktur);
      `POST /api/pajak/rincian` → PDF "Rincian Peredaran Bruto per Bulan
      (bahan pengisian SPT)" di bucket privat, hash dinotarisasi
      (`pajak:<nomor>`); `POST /api/pajak/pernyataan` → PDF "Surat Pernyataan
      Omzet di Bawah Rp500 Juta" dikirim LANGSUNG (nama & NPWP diketik saat
      membuat, tidak disimpan; `path_pdf` NULL; yang tersimpan hash +
      metadata), 409 bila omzet tahun itu sudah mencapai batas; verifikasi
      publik `/verifikasi/<kode>` mengenali dokumen pajak; cron menyapu
      render gagal & segel menggantung.
- [x] Katalog: `pajak.tersedia = true` → kartu Paket Pajak di `/premium`
      setelah Plus; `POST /api/langganan/bayar {kode: "pajak"}`; webhook
      `pajak` lunas → jejak `bayar_sukses` tanpa memperpanjang Plus.
- [x] Setiap layar/PDF pajak memuat "Bukan nasihat pajak. Cocokkan dengan
      Coretax atau konsultan pajak." PDF pajak: nol kata token/wallet/
      opBNB/kripto/laba (dibuktikan `pdftotext` di harness).

**Gerbang §0.3:** typecheck bersih · lint bersih · `test:parser` 200/200 +
29/29 · `test:canonical` 27/27 (PDF) · `test:kesiapan` 22/22 ·
`test:pajak` 17/17 · `test:api` **282/282** (seksi 22: 35 cek; jalan ke-1 278/282 — empat
assertion isi PDF keliru: "idmtoken.com" dan "kriptografis" terbaca
sebagai kata terlarang, `\\b` sebelum "Rp500.000", dan spasi JSX yang
hilang di surat — regex diperketat ke batas kata di luar URL, spasi
diperbaiki; jalan ke-2 282/282) · 0038
diterapkan sebelum push · deploy READY · cek asap: `/api/pajak` 401 tanpa
sesi, `/api/pajak/rincian` 401, kartu Paket Pajak tampil di `/premium`.

**Keputusan yang saya ambil sendiri:**
- PPh dihitung atas BAGIAN omzet di atas Rp500 juta (bulan terlampaui =
  selisih), mengikuti pasal pengecualian "bagian peredaran bruto s.d.
  Rp500 juta tidak dikenai PPh"; alternatif ditolak: mengenakan seluruh omzet
  bulan terlampaui (lebih sederhana, tetapi melebihkan setoran).
- "Omzet" = `total_masuk` `daily_rollups` (seluruh pemasukan confirmed);
  tidak ada pemisahan usaha/pribadi di skema, jadi tidak dipisahkan di sini.
- Surat Pernyataan hanya bisa dibuat bila omzet tahun itu menurut catatan
  memang di bawah batas (409 kalau tidak) — AIDM tidak mencetak pernyataan
  yang bertentangan dengan catatannya sendiri.
- PDF pernyataan tidak disimpan sama sekali (bukan "disimpan di bucket
  privat"): "NPWP tidak disimpan" dibaca sebagai mencakup salinan di dalam
  PDF. Pengguna menyimpan berkasnya sendiri; hash tetap bisa diverifikasi.
- Pengingat in-app saja (Beranda + Laporan): infrastruktur push belum ada
  (Akun → Notifikasi masih "Belum tersedia"); WA memang dilarang perintah.
- Hak akses `pajak` dari pesanan lunas <365 hari, bukan tabel/kolom baru.
- Pembantu PDF (`Qr`, `Footer`, gaya, warna) diekspor dari
  `lib/berkas/render.tsx` alih-alih diduplikasi.

**Butuh tangan PO:** format resmi lampiran SPT belum diverifikasi (judul PDF
sudah menyatakan "bahan pengisian"); Midtrans produksi masih 401 → beli Paket
Pajak di produksi menjawab "sedang disiapkan". Uji di HP: Akun → nyalakan
"Saya wajib pajak orang pribadi" → Laporan → kartu Pajak usaha (omzet vs
batas); (Plus) buat Rincian → unduh; buat Surat Pernyataan → berkas terunduh
ke HP, tidak tersimpan di Akun.

### 8. 🤖 M5 — premium di balik LANGGANAN

Model kredit **dibatalkan sebelum sempat rilis** (keputusan PO 2026-08-28).
Skema dua ember yang sudah dirancang dibuang tanpa pernah dimigrasikan —
keputusan yang benar, dan lebih murah dibuang sekarang daripada setelah ada
uang di dalamnya.

**Yang berdiri sekarang**

- [x] `subscriptions` · `premium_usage` · `subscription_orders` (migrasi 0027)
- [x] Gerbang premium di Riset & Konten — non-pelanggan melihat **ajakan
      berlangganan**, bukan pesan "jatah habis". Mereka tidak pernah punya
      jatah; kalimat kehabisan menjelaskan hal yang salah.
- [x] Masa coba 7 hari, sekali seumur akun (`coba_dipakai` tidak pernah direset)
- [x] Kuota wajar bulanan, atomik di Postgres, reset per bulan WIB
- [x] **Generator Konten** — mesin + API + layar (4 format, salin sekali ketuk)
- [x] Midtrans **sekali-bayar 30 hari**, bukan recurring — QRIS & VA secara
      sifat tidak bisa ditagih otomatis, dan memaksakan recurring berarti
      memaksa kartu kredit pada pengguna yang tidak punya
- [x] Webhook Midtrans dengan verifikasi tanda tangan sha512 + idempotensi
      lewat transisi status atomik
- [x] Seluruh jejak "kredit" dicabut dari UI
- [x] Batas laju **10 permintaan/menit** di Catat (migrasi 0028)
- [x] `docs/RUNBOOK-ADMIN.md`

- [x] **Halaman hukum publik** — `/syarat-ketentuan` & `/pengembalian-dana`
      (grup rute baru `(publik)`, shell ringan sendiri, 162 B per halaman).
      Prasyarat persetujuan merchant Midtrans. `/kebijakan-privasi` ikut
      dipindah ke sana: sebelumnya ia hidup di dalam shell aplikasi dengan
      tautan "Kembali ke Akun" — jalan buntu bagi pengunjung tanpa sesi, yang
      akan dipantulkan ke `/masuk`. URL ketiganya tidak berubah. Diuji di
      browser pada konteks INCOGNITO terhadap produksi: 38 pemeriksaan lulus,
      nol cookie sesi, tanpa `noindex`, tautan footer bisa diklik dari `/masuk`.
- [x] **Diuji ujung-ke-ujung di produksi, 14/14** — gerbang 402 sebelum
      langganan, masa coba 7 hari + tolakan 409 pada percobaan kedua, Generator
      Konten menghasilkan salinan yang memakai konteks usaha, kuota tercatat,
      rate limit menolak permintaan ke-11.

**Yang dilewati, dengan alasan**

- [ ] **Refaktor bundel `/masuk` ditunda.** Penjelasan di §6.

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

## Ekonomi reward IDMX

**Dipindahkan seluruhnya ke `docs/PERINTAH-AGEN-FINAL.md` §0.1** (versi 2,
dikunci PO 9 September 2026). Bagian panjang yang dulu berdiri di sini —
tabel perolehan misi setahun, ketahanan kolam, dan perspektif "100 juta dari
10 triliun" — **dihapus, bukan ditandai usang.**

Alasannya adalah pelajaran yang sudah dibayar mahal di papan kerja ini:
menandai sesuatu "usang" dan membiarkannya tetap terbaca berarti angka mati
akan tetap dikutip oleh siapa pun yang membaca cepat. Angka 10 triliun
bertahan berbulan-bulan justru dengan cara itu; suplai IDMX yang benar
**50.000.000.000**.

Satu koreksi yang perlu diingat saat membaca dokumen lama: **kolam
MissionRewards 100.000.000 adalah IDMX**, diambil dari suplai 50 miliar di
opBNB — ia tidak menyentuh suplai 1 miliar IDM Reborn sama sekali. Dokumen
yang menyandingkan keduanya seolah satu suplai adalah dokumen yang salah.

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
