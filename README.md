# AIDM

**Catatan Usaha & Laporan Keuangan untuk UMKM** · dApp Ekosistem IDM Reborn · opBNB

PWA pencatatan keuangan untuk pelaku usaha mikro Indonesia. Pengguna **menceritakan**
apa yang terjadi dengan kalimat biasa atau suara ("jual 3 nasi goreng 45rb bayar
QRIS"), agen mengurainya jadi entri transaksi terstruktur, lalu mengubahnya menjadi
laporan keuangan yang rapi dan bisa diunduh kapan saja. Web3 "proud but calm": punya
akun = punya wallet, reward IDMX, segel laporan on-chain — sementara alur mencatat
harian bersih tanpa jargon.

> **Pivot v3.0 (§0 PRD).** Versi 2.0 adalah agen *riset pasar* ("kamu bertanya, agen
> menjawab"). v3.0 membalik arah: **kamu memberi tahu, agen mencatat**. Riset pasar &
> generator konten tetap ada, tapi turun jadi **fitur premium** di `/premium` —
> bukan lagi jantung produk. Mencatat **selalu gratis, nol Kredit AI**.
>
> **Status: M1–M4 selesai** (roadmap PRD §14). Parser pencatatan, tab Catat,
> Riwayat, Laporan (agregasi server), dan ekspor PDF teruji di
> produksi (`ai.idmtoken.com`); M2 (suara & offline) diverifikasi di perangkat
> Android sungguhan 2026-08-14. **Segel laporan on-chain (§7.5) sudah berjalan
> di testnet opBNB** — `ReportAttestation.sol` ter-deploy, laporan nyata
> tersegel dengan hash + tautan explorer. **Sistem misi (§7.6) terpasang penuh
> di kode**: progres diturunkan langsung dari catatan (menghapus transaksi
> otomatis menurunkannya), anti-abuse duplikat-60-detik, kontrak `IDMX.sol` +
> `MissionRewards.sol` dengan voucher EIP-712, cap harian & anti-replay
> ditegakkan on-chain. **M4 tuntas 2026-08-26** — kontrak ter-deploy & terdanai,
> klaim diuji di aplikasi (spinner → Diklaim + tautan opBNBScan). Sejak
> 2026-08-27 klaim berjalan **asinkron**: permintaan HTTP hanya menulis niat,
> cron relayer yang mengirim dan merekonsiliasi.
>
> **Masuk lewat Google atau email**, keduanya dengan UI kita sendiri — modal
> Privy tidak dipakai karena SDK-nya tidak bisa diterjemahkan. Sembilan misi
> aktif: empat harian, dua mingguan, dua bulanan, satu sekali seumur hidup.

---

## Stack (§9.1)

| Lapisan | Pilihan |
|---|---|
| Frontend | Next.js 14 App Router (PWA) + Tailwind |
| Auth + Embedded Wallet | Privy (email/HP/Google → wallet EVM otomatis) |
| Parser pencatatan | Claude Haiku (JSON mode, §17.1) + fallback regex deterministik |
| PWA / Service Worker | Serwist (`@serwist/next`) |
| Database | Supabase Postgres + pgvector (migrasi di `supabase/migrations`) |
| Chain | **opBNB** (mainnet 204 / testnet 5611) via viem |
| Font | Fraunces (serif display) + Plus Jakarta Sans (sans) |

## Prasyarat

- Node.js ≥ 22.18 (type stripping bawaan dipakai runner test parser)
- pnpm (dipakai: v11)
- `psql` — untuk `pnpm db:migrate` (opsional; alternatifnya SQL Editor Supabase)
- ImageMagick — hanya untuk regenerasi ikon (`pnpm icons`), opsional

## Mulai

```bash
pnpm install
cp .env.local.example .env.local   # lalu isi nilainya (lihat di bawah)
pnpm dev                           # http://localhost:3000
```

Tanpa mengisi `.env.local`, aplikasi tetap jalan dalam **mode demo**: seluruh UI bisa
dijelajahi dan tab Catat memakai parser fallback di klien. Auth, wallet, dan
persistensi aktif begitu env diisi.

### Environment

| Variabel | Untuk |
|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | App ID Privy (aktifkan auth + wallet). Ambil di dashboard.privy.io |
| `PRIVY_APP_SECRET` | Verifikasi token Privy di server |
| `SESSION_SECRET` | Tanda tangan cookie sesi (HMAC) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Klien Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Tulis data server-side (bypass RLS) |
| `SUPABASE_DB_URL` | Connection string Postgres untuk `pnpm db:migrate` |
| `ANTHROPIC_API_KEY` | Parser pencatatan + agen riset premium. **Kosong = parser fallback saja** (aplikasi tetap jalan) |
| `AIDM_LIGHT_MODEL` | Override model parser (default `claude-haiku-4-5`) |
| `NEXT_PUBLIC_DEFAULT_CHAIN` | `opbnb` (default) / `opbnb-testnet` |

### Database (Supabase)

Skema §10 ada sebagai migrasi berurutan di `supabase/migrations/` (0001–0017).
0001–0010 adalah fondasi v2.0; **0011–0017 adalah inti v3.0** (`transactions`,
`daily_rollups`, `report_seals`, taksonomi kategori transaksi, trigger rollup, kuota
anti-abuse, RPC agregasi laporan, misi v3.0 + pemicu segel, progres misi + idempotensi klaim). Migrasi v3.0 hanya **menambah** — tabel v2.0 tidak disentuh.

```bash
pnpm db:migrate --dry-run   # tampilkan rencana
pnpm db:migrate             # apply yang belum pernah jalan (idempoten)
```

Regenerasi tipe setelah skema diterapkan:

```bash
supabase gen types typescript --project-id <ref> --schema public > types/database.ts
```

## Skrip

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Build produksi (service worker ikut di-generate) |
| `pnpm start` | Jalankan hasil build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Pengecekan tipe TypeScript |
| `pnpm test:parser` | Test suite parser — 200 kalimat, gagal bila akurasi < 95% |
| `pnpm test:api` | Integration test API (butuh `pnpm dev` + `psql`) — 115 assertion |
| `pnpm test:canonical` | Test kanonikalisasi & hash segel (§17.2) — deterministik, jalan di CI |
| `pnpm deploy:attestation` | Kompilasi + deploy `ReportAttestation.sol` (`--dry-run` / `--mainnet`) |
| `pnpm deploy:rewards` | Kompilasi + deploy `IDMX.sol` + `MissionRewards.sol`, lalu mendanai kontrak reward |
| `pnpm db:migrate` | Terapkan migrasi Supabase berurutan |
| `pnpm icons` | Regenerasi ikon PWA dari `public/brand/logo_idm.png` (butuh ImageMagick) |

CI (`.github/workflows/ci.yml`) menjalankan typecheck + lint + test parser + test
kanonikalisasi tiap push dan PR. Keduanya deterministik — tanpa API key, tanpa chain.

`pnpm test:api` tidak ikut CI karena butuh database & dev server hidup. Jalankan
manual: `pnpm dev` di satu terminal, `pnpm test:api` di terminal lain. Test ini
memanggil `/api/catat` ~10× — bila `ANTHROPIC_API_KEY` terisi di `.env.local`, parser
LLM sungguhan ikut terpanggil (biaya kecil). Bagian Laporan/PDF/Akun menanam data uji
lewat SQL langsung, jadi tidak menambah biaya model.

## Struktur

```
app/
  (auth)/            masuk + onboarding (peran, usaha) — fokus tunggal per layar
  (app)/             shell + Beranda · Catat · Laporan · Misi · Akun
                     (+ /riwayat, /premium, /kebijakan-privasi)
  api/               auth/session · me · akun · catat · catat/konfirmasi · transaksi ·
                     laporan · laporan/pdf · laporan/segel · missions · missions/klaim ·
                     missions/lihat-laporan · wallet/saldo · wallet/backfill ·
                     swap/config · swap/vouchers · relayer/tick (swap + misi) ·
                     verify (publik) · research
  not-found.tsx      404 berbahasa Indonesia
  error.tsx          layar galat tak terduga
  manifest.ts        manifest PWA
  sw.ts              service worker Serwist (di-exclude dari tsc)
  ~offline/          halaman offline (memuat form catat offline)
components/
  catat/             CatatView (komposer chat) · EntryCard · MicButton · OfflineCatatForm
  transaksi/         RiwayatView · TransactionRow · TransactionSheet (edit/hapus)
  laporan/           SummaryCards · CashflowChart · CategoryBreakdown · SealCard
  layout/            BottomNav (<1024px) · TopNav (≥1024px) · HeaderStats · MobileTopBar
  research/          RisetView · AnswerArticle — kini di balik /premium
  wallet/            WalletCard · SwapSheet (burn opBNB) · VoucherPanel (klaim BSC)
  account/           SettingsList · LogoutButton · DeleteAccount
  ui/                Button · Card · Skeleton · GagalMuat (keadaan gagal) ·
                     BelumTersinkron (salinan cache yang belum tersegarkan) · dll
  pwa/
  providers/         MeProvider (identitas + saldo, dua jalur terpisah) ·
                     KueriProvider (cache pembacaan lintas tab)
lib/
  parse/             index (orkestrasi) · llm (Haiku §17.1) · fallback (regex) · validate
  catat/             server (helper API) · client (pembungkus fetch)
  laporan/           periode (batas WIB) · server (agregasi) · kanonik (hash §17.2) ·
                     segel-server (relayer) · client · pdf (dokumen A4)
  offline/           antrean IndexedDB
  api/               panggil (pembungkus fetch bersama: ok / demo / offline)
  missions/          index (definisi & target) · server (progres diturunkan) ·
                     klaim-server (voucher EIP-712) · relayer (kirim & rekonsiliasi
                     on-chain) · galat (taksonomi galat klaim) · client
  wallet/            server — alamat dompet, diisi susulan dari Privy bila perlu
  wib.ts             SATU sumber batas hari WIB untuk seluruh aplikasi
  auth/              session-cookie · constants · tujuan (next → sessionStorage)
  privy/             provider · config · galat-masuk (kalimat galat Indonesia)
  chains/  supabase/  ai/  agent/  design/  mock/  token/  swap/  env.ts
contracts/           ReportAttestation.sol · IDMX.sol · MissionRewards.sol (§9.4)
                     + artifacts hasil kompilasi
supabase/migrations/ skema §10 (0001–0023)
tests/parser-cases.json  200 kalimat uji lintas 5 persona
```

## Alur pencatatan (§9.2)

```
User (chat/suara) → POST /api/catat
  → parser LLM Haiku (JSON mode, skema §17.1) [timeout 5 dtk]
      ↓ gagal/timeout → parser fallback regex
  → validasi server-side (nominal > 0, jenis, kategori ada di taksonomi, tanggal ≤ hari ini)
  → insert transactions[] (confirmed | draft bila nominal belum disebut)
  → trigger memperbarui daily_rollups
  → respons: kartu konfirmasi di chat
```

Prinsip yang mengikat: **satu kalimat boleh jadi banyak entri**; **dilarang mengarang
nominal** (tidak disebut → simpan sebagai draft + tanya **satu** hal saja); **mencatat
tidak pernah memotong Kredit AI**.

## Laporan & ekspor PDF (§7.3)

```
GET /api/laporan?period=2026-08 | 30d | today
  → ringkasan + grafik harian   : daily_rollups  (O(hari), bukan O(transaksi))
  → rincian kategori            : RPC laporan_kategori (GROUP BY, migrasi 0015)
  → status segel                : report_seals
GET /api/laporan/pdf?period=…   → laporan A4 siap cetak (@react-pdf/renderer)
```

Seluruh agregasi di server; layar tidak pernah menjumlah transaksi sendiri. Batas
periode dihitung sekali di `lib/laporan/periode.ts` sebagai **tanggal WIB**, lalu
diturunkan jadi ISO — dua sumber data (rollup bertipe `date`, transaksi bertipe
`timestamptz`) karena itu memotong garis yang sama persis, sehingga total kategori
selalu sama dengan total ringkasan. **Membuka Laporan & mengunduh PDF = 0 kredit.**

Isi PDF mengikuti kebutuhan penilai KUR: kop usaha, ringkasan, arus kas 12 bulan,
rincian kategori, porsi terverifikasi, blok verifikasi, dan footer wajib. Angka yang
ditampilkan adalah **laba kotor** — istilah "laba bersih" dilarang sampai HPP ada
(Fase 2). `pnpm test:api` membaca ulang isi PDF hasil (`pdftotext`) untuk memastikan
kalimat baku §7.5 dan footer §7.3 benar-benar ada di berkas, bukan cuma di kode.

### Akurasi parser

`pnpm test:parser` → **200/200 (100%)**, target PRD ≥ 95%. Catatan jujur: expected
output-nya diturunkan dari aturan §17.1 lalu parser disetel sampai lulus — jadi angka
ini berarti "cocok dengan 200 harapan turunan-spek", **bukan** jaminan 100% pada
kalimat yang belum pernah dilihat. Uji lapangan menyusul di gerbang beta M6.

## Sistem desain (§13)

Tema **ivory hangat**: latar `#FAF7F0` (bukan putih dingin), teks near-black hangat
`#211C15`, kartu putih radius 24px yang **mengambang** — shadow lembut, *bukan* border
1px. CTA utama pill **charcoal** `#1B1B1B`. Aksen **emas** `#F0B90B→#FCD535` untuk
ikon aktif, progress, highlight angka. Kartu **gelap-emas** hanya untuk Wallet/Reward.
Tipografi kontras **serif (Fraunces)** untuk judul/sapaan/angka besar + **sans (Plus
Jakarta Sans)** untuk body/label/nav. Nilai token: `app/globals.css`.

Pola layout: <1024px memakai pola mobile (bottom-nav 5 tab + baris status tanpa logo);
≥1024px memakai top-nav berlabel dengan nav di tengah, sejajar container konten.

## Catatan implementasi

- **Mode demo:** tanpa kredensial, `Providers` melewati Privy dan middleware
  mengizinkan semua rute. Tab Catat memakai parser fallback di klien; Riwayat, Beranda,
  dan Laporan memakai dataset mock (Laporan lewat `laporanDemo()` yang menghasilkan
  bentuk `LaporanResponse` yang sama persis, jadi layarnya cuma punya satu jalur
  render). Kegagalan jaringan **dibedakan tegas** dari mode demo — user sungguhan yang
  servernya mati melihat pesan jujur, bukan data mock. Unduh PDF dimatikan di mode demo
  karena datanya bukan milik siapa pun.
- **Auth + wallet:** setelah login Privy, klien memanggil `POST /api/auth/session` →
  token diverifikasi server-side → upsert `users` + `wallets` (100% akun ber-wallet,
  AC §7.1) → cookie sesi ber-HMAC.
- **RLS:** tulis/baca dilakukan server memakai service-role; otorisasi per-baris
  ditegakkan dengan filter `user_id` di **setiap** query API.
- **Rollup harian pakai trigger, bukan job.** Jalur tulis transaksi ada banyak (catat,
  konfirmasi draft, edit, hapus, sinkron offline); trigger di tabel menjamin agregat
  tidak pernah tertinggal oleh jalur yang lupa memanggil update.
- **Anti-abuse:** 200 entri/user/hari (§7.2) plus batas percakapan/hari yang dinaikkan
  atomik sebelum parser dipanggil — supaya kalimat yang tidak menghasilkan entri tidak
  bisa memanggil model berbayar tanpa batas.
- **Hapus akun (§12 / UU PDP):** `DELETE /api/akun` meminta frasa konfirmasi `HAPUS`,
  lalu satu `delete from users` — seluruh data turunan ikut lewat `on delete cascade`,
  jadi tidak ada daftar tabel yang harus dijaga manual dan tertinggal saat tabel baru
  ditambahkan.
- **Bundle ≤ 200 KB (§12):** target optimasi lanjutan (lazy-load Privy, code-split)
  digarap pada milestone kualitas M5. SDK Privy saat ini masuk shared bundle.
- **Chain fitur Tukar dirakit di server, bukan di klien.** `AIDM_REWARD_CHAIN` dan
  `AIDM_SWAP_CHAIN` sengaja TIDAK berawalan `NEXT_PUBLIC_`, jadi di browser keduanya
  `undefined` dan resolver akan diam-diam jatuh ke `NEXT_PUBLIC_DEFAULT_CHAIN` — nilai
  yang saat ini menunjuk **mainnet** padahal seluruh kontrak hidup di testnet. Komponen
  klien karena itu menerima nomor chain dari `GET /api/swap/config` dan tidak pernah
  menghitungnya sendiri. Salah chain di sini bukan sekadar gagal: transaksi terkirim ke
  alamat yang di jaringan itu tidak berisi kontrak apa pun.
- **Saldo IDMX dibaca server, bukan browser.** Satu pembacaan melayani semua tab,
  alamat pengguna tidak bocor ke penyedia RPC tiap muat halaman, dan `/api/me` — yang
  dipanggil pada SETIAP navigasi — dilindungi batas 2,5 detik plus cache 60 detik per
  alamat. Saldo yang tidak bisa dipastikan dikembalikan `null`, bukan 0; "belum tahu"
  dan "dompetmu kosong" adalah dua pernyataan berbeda kepada pengguna.
- **Nilai uang tidak pernah dirender sebelum data aslinya tiba.** Layar data
  punya TIGA keadaan (`lib/api/keadaan.ts`): memuat → shimmer, terbaca → angka,
  gagal → pesan + "Coba lagi". Dua keadaan tidak cukup, dan alasannya spesifik
  untuk aplikasi pembukuan: layar yang hanya mengenal "kosong" dan "ada data"
  akan memetakan kegagalan ke keadaan kosong — dan "Rp0 · Belum ada transaksi"
  tidak terbaca sebagai kegagalan jaringan, melainkan sebagai kabar bahwa
  catatannya hilang. Pesan gagal membedakan offline dari gagal lain, dan
  `offline` disimpan DI DALAM keadaan gagal, bukan dibaca ulang dari
  `navigator.onLine` saat render.
- **Satu endpoint tidak boleh mencampur data yang selalu tersedia dengan data
  yang bisa gagal.** `/api/me` (Postgres) dipisah dari `/api/wallet/saldo`
  (RPC opBNB) karena saat keduanya menyatu, nama usaha pengguna tersandera
  pembacaan rantai sampai 2,5 detik. Yang lemah menarik yang kuat ke bawah,
  tidak pernah sebaliknya.
- **Service worker tidak pernah menyimpan `/api/*`.** `defaultCache` bawaan
  `@serwist/next` menampung setiap `GET /api/*` selama 24 jam; di aplikasi ini
  yang mengalir lewat sana adalah uang milik pengguna. Cache SW hidup
  per-origin, bukan per-sesi — satu perangkat dua akun bisa saling melihat.
  Seluruh `/api/*` `NetworkOnly`, dan header `private, no-store`
  (`lib/api/respons.ts`) menutup lapisan di luar SW.
- **Urutan transaksi memakai `occurred_at DESC, created_at DESC`.**
  `occurred_at` sengaja dipatok 12.00 WIB agar tanggal laporan stabil lintas
  timezone, konsekuensinya seluruh transaksi sehari punya timestamp identik dan
  pengurutan seri sepenuhnya. Tanpa pemecah seri, Postgres mengembalikan urutan
  fisik — yang TERLAMA di atas — sehingga "Transaksi terakhir" justru tidak
  pernah menampilkan yang baru dicatat.
- **Alur masuk memakai UI kita, bukan modal Privy.** SDK Privy tidak punya opsi
  terjemahan (v2.25: satu-satunya `intl` adalah `defaultCountry`), jadi
  modalnya permanen berbahasa Inggris — "Enter confirmation code", "an email
  from privy.io" — di layar pertama yang dilihat pedagang. Hook headless
  (`useLoginWithEmail`, `useLoginWithOAuth`) memberi alur yang sama tanpa UI-nya.
  Konsekuensinya mengikat: **setiap** pintu masuk harus mengarah ke `/masuk`,
  tidak ada satu pun yang boleh memanggil `login()` — satu tombol yang lupa
  membuka kembali seluruh layar Inggris yang sedang dihapus.
- **Deteksi akun baru vs lama milik kita, bukan Privy.** Pemicunya
  `usePrivy().authenticated` (state provider, sama bagi modal maupun headless),
  keputusannya `/api/me` + `profilLengkap()` terhadap database kita sendiri.
  Karena itu ia tidak ikut berubah saat cara masuk diganti.
- **URL yang dikirim ke pihak ketiga dirakit sendiri, tidak pernah diambil dari
  `window.location.href`.** Privy mencocokkan `redirect_to` sebagai string UTUH
  dengan allowlist-nya, jadi satu query string yang menempel di halaman —
  `?next=` dari middleware kita sendiri — membuatnya ditolak `401 Redirect URL
  is not allowed` betapa pun banyak entri ditambahkan, wildcard sekalipun.
  `customOAuthRedirectUrl` di `lib/privy/provider.tsx` memakai
  `` `${origin}/masuk` `` yang tidak bisa membawa query maupun fragmen.
  Sebaliknya, saat membersihkan URL halaman, buang HANYA parameter milik kita:
  Privy mengembalikan pengguna membawa `privy_oauth_code`/`_state`/`_provider`
  di query yang sama, dan efek komponen anak berjalan sebelum efek provider.
- **Tujuan setelah masuk divalidasi sebagai path internal.** Nilai `next`
  datang dari query string — masukan tak terpercaya. Tanpa saringan, tautan
  `/masuk?next=//situs-palsu.com` membuat korban melihat domain kita di bilah
  alamat lalu dilempar ke tiruan yang meminta kredensialnya lagi. Tiga saringan
  di `lib/auth/tujuan.ts`, dan yang ketiga (`new URL()` dibanding origin)
  menangkap bentuk yang lolos dua yang pertama.
- **Batas hari selalu WIB, dari satu berkas.** `lib/wib.ts` — laporan bulanan,
  progres misi harian, cap IDMX, kuota mencatat, dan pengelompokan Riwayat
  saling dibandingkan pengguna, jadi batas yang bergeser di salah satunya tidak
  tampil sebagai galat melainkan sebagai "misi saya tidak bertambah padahal
  sudah mencatat". Sebelumnya rumus `+7 jam` disalin di tujuh tempat.
- **Cache klien punya satu pintu untuk data lama.** `KueriProvider` menyajikan
  salinan terakhir seketika lalu memeriksa ulang di belakang layar (fokus &
  reconnect), dan fase "memuat" tidak pernah muncul selagi ada salinan.
  Saat pembacaan gagal sementara salinan ada, salinan itu DITAHAN dan ditandai
  "Belum tersinkron" — satu-satunya tempat aplikasi ini sengaja menampilkan
  data lama, sah karena yang ditahan milik pengguna sendiri dan layar
  mengatakannya. Mengosongkannya justru akan mengulang P0-1: kegagalan jaringan
  terbaca sebagai "catatanmu tidak ada".
- **Endpoint yang longgar menjawab lebih awal.** `?untuk=catat` di
  `/api/transaksi` menyertakan draft dan `raw_input`, dan ia `return` sebelum
  satu baris pun jalur umum dieksekusi — kelonggaran yang dibutuhkan satu layar
  tidak boleh punya jalan untuk merembes ke pembacaan yang berhubungan dengan
  uang. Draft sendiri tidak pernah masuk angka mana pun karena trigger rollup
  dan RPC misi sama-sama menyaring `confirmed`; jaminannya di database.
- **Permintaan HTTP tidak pernah menunggu rantai; ia menulis NIAT.** Klaim misi
  mencatat baris `queued` berikut `nonce`-nya lalu langsung menjawab
  "diproses"; cron relayer yang menandatangani, mengirim, dan merekonsiliasi.
  Yang dihapus bukan sekadar latensi melainkan satu kelas bug: dulu transaksi
  dikirim LALU `tx_hash` ditulis, dan kegagalan di antara keduanya berarti uang
  berpindah tanpa catatan — pengguna melihat 500, mencoba lagi, dan dijawab
  "sudah diklaim" untuk reward yang tidak pernah bisa ia lihat. Karena `nonce`
  kini tersimpan SEBELUM apa pun dikirim, kebenaran on-chain selalu bisa
  ditanyakan ulang (`nonceUsed`, lalu event `Claimed` untuk hash-nya): baris
  database tidak pernah lagi menjadi satu-satunya bukti bahwa uang berpindah.
- **Satu EOA hanya boleh punya satu pengirim aktif.** Sewa di `relayer_locks`
  berkunci ALAMAT PENGIRIM, bukan nama pekerjaan — pekerjaan baru yang mengirim
  dari EOA yang sama ikut terserialkan tanpa perlu ingat mendaftarkan kunci.
  Dua pengirim bersamaan akan membaca nonce EVM yang sama dan salah satunya
  ditolak node.
- **Nilai on-chain disimpan sebagai `text`, tidak pernah tipe numerik.**
  `uint256` tidak muat di `bigint` (yang signed, jadi separuh ruang nonce ditolak
  22003) dan `numeric` dikembalikan PostgREST sebagai number JavaScript yang
  kehilangan presisi di atas 2^53. Keduanya sudah pernah jadi bug: 0019 untuk
  voucher swap, 0021 untuk nonce klaim misi. `text` + CHECK `^(0|[1-9][0-9]*)$`
  menjaga ketepatan secara struktural, bukan bergantung pada setiap query ingat
  menulis cast.
- **Kondisi yang bisa diprediksi tidak pernah dijawab 500.** 500 berarti "kami
  tidak tahu apa yang terjadi"; memakainya untuk jatah habis atau dompet belum
  siap membuat pengguna membaca "coba lagi" lalu menabrak dinding yang sama.
  Taksonomi `{ code, message }` di `lib/missions/galat.ts` menyimpan status DAN
  retryabilitas di satu tabel, dipakai server untuk menolak dan dipakai layar
  untuk mematikan tombol — dua daftar terpisah pasti berbeda pendapat cepat atau
  lambat.
- **Konfigurasi dideteksi dari "string tidak kosong", bukan dari "variabel
  ada" — jadi cadangan env dibaca `envPertama()`, tidak pernah `??`.**
  `.env.local.example` menganjurkan field yang belum siap dibiarkan KOSONG
  (placeholder seperti `your-privy-app-id` akan dianggap terisi dan membuat
  aplikasi boot dengan kunci palsu). Konsekuensinya `""` adalah keadaan normal
  — dan `""` bukan nullish, sehingga `process.env.A ?? process.env.B`
  mengembalikan string kosong dan cadangan B tidak pernah terpakai.
  Kegagalannya diam. Sudah dua kali terjadi: `MISSION_RELAYER_PRIVATE_KEY`
  kosong membuat klaim menjawab 501 padahal `SEAL_RELAYER_PRIVATE_KEY` terisi,
  dan `AIDM_REWARD_CHAIN` kosong menjatuhkan chain ke default **mainnet**
  alih-alih ke `AIDM_SEAL_CHAIN`. Helper: `lib/env.ts`.
- **Alamat dompet tidak pernah datang dari klien, dan bisa diisi susulan.**
  Baris `wallets` dulu hanya ditulis sekali saat login dari alamat yang dibaca
  browser; embedded wallet Privy lahir asinkron, jadi akun yang dompetnya
  terlambat beberapa detik menjadi PERMANEN tanpa dompet (22% user produksi saat
  ditemukan). `alamatWalletUser()` di `lib/wallet/server.ts` menanyakannya
  sendiri ke Privy dari DID di cookie sesi lalu menyimpannya — satu-satunya
  sumber yang berwenang atas alamat tempat reward dibayarkan adalah Privy, bukan
  input klien.
- **Jam transaksi tidak pernah ditampilkan — tanggal saja.** AIDM tidak
  mengetahui jam kejadian: parser hanya menghasilkan tanggal, `occurred_at`
  dipatok 12.00 WIB, dan `created_at` adalah jam MENCATAT (pelaku mikro sering
  mencatat borongan malam hari). Keduanya karangan bila dibaca sebagai jam
  transaksi, dan label tidak menolong — pengguna membaca posisi itu sebagai jam
  kejadian apa pun tulisannya. Tidak ada keputusan usaha yang bergantung pada
  jam transaksi. Berlaku di baris transaksi, ekspor CSV, dan PDF laporan.
- **Tukar = dua transaksi, dua jaringan, dikirim dompet pengguna sendiri.** `swap()`
  membakar IDMX di opBNB; relayer menerbitkan voucher EIP-712; `claim()` menebusnya di
  BSC dengan gas ditanggung pengguna (garis monetisasi yang disengaja — jangan tambahkan
  jalur relayer-submit). Seluruh penolakan ditegakkan kontrak sebelum burn; UI hanya
  mencerminkannya lebih awal supaya tidak ada gas terbuang untuk transaksi yang pasti
  revert.

## Milestone selanjutnya (§14)

~~M2 uji suara & offline di perangkat nyata~~ **selesai (uji lapangan 2026-08-14)** ·
~~M3 tab Laporan + ekspor PDF~~ **selesai** ·
~~M4 Segel on-chain + misi pencatatan~~ **selesai 2026-08-26** — segel & reward
live di opBNB testnet, klaim asinkron lewat cron relayer, sembilan misi aktif ·
**M5** fitur premium di balik kredit + pembelian kredit + hardening ·
**M6** mainnet opBNB + beta tertutup 100 user + launch PWA + DappBay ·
**M7** Google Play (TWA) + App Store (Capacitor).

**Gerbang beta M6:** akurasi parser ≥ 95% pada data lapangan dan ≥ 60% beta user
mencatat ≥ 4 hari/minggu. *(Gerbang "PDF diserahkan ke petugas bank" dicabut
2026-08-15 — lihat PRD §14.)*
