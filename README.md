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
> ditegakkan on-chain. Sisa: **`pnpm deploy:rewards`** ke testnet — sampai env
> reward diisi, tombol Klaim nonaktif dengan keterangan jujur dan API menjawab
> 501, sehingga aman berada di produksi.

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
  (app)/             shell + Beranda · Catat · Laporan · Misi · Akun (+ /riwayat, /premium)
  api/               auth/session · me · akun · catat · catat/konfirmasi · transaksi ·
                     laporan · laporan/pdf · laporan/segel · missions · missions/klaim ·
                     verify (publik) · research
  manifest.ts        manifest PWA
  sw.ts              service worker Serwist (di-exclude dari tsc)
  ~offline/          halaman offline (memuat form catat offline)
components/
  catat/             CatatView (komposer chat) · EntryCard · MicButton · OfflineCatatForm
  transaksi/         RiwayatView · TransactionRow · TransactionSheet (edit/hapus)
  laporan/           SummaryCards · CashflowChart · CategoryBreakdown · SealCard
  layout/            BottomNav (<1024px) · TopNav (≥1024px) · HeaderStats · MobileTopBar
  research/          RisetView · AnswerArticle — kini di balik /premium
  wallet/  pwa/  ui/  providers/
lib/
  parse/             index (orkestrasi) · llm (Haiku §17.1) · fallback (regex) · validate
  catat/             server (helper API) · client (pembungkus fetch)
  laporan/           periode (batas WIB) · server (agregasi) · kanonik (hash §17.2) ·
                     segel-server (relayer) · client · pdf (dokumen A4)
  offline/           antrean IndexedDB
  api/               panggil (pembungkus fetch bersama: ok / demo / offline)
  missions/          index (definisi & target) · server (progres diturunkan) ·
                     klaim-server (voucher EIP-712) · client
  privy/  chains/  supabase/  auth/  ai/  agent/  design/  mock/
contracts/           ReportAttestation.sol · IDMX.sol · MissionRewards.sol (§9.4)
                     + artifacts hasil kompilasi
supabase/migrations/ skema §10 (0001–0017)
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
GET /api/laporan/pdf?period=…   → A4 siap dibawa ke bank (@react-pdf/renderer)
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

## Milestone selanjutnya (§14)

~~M2 uji suara & offline di perangkat nyata~~ **selesai (uji lapangan 2026-08-14)** ·
~~M3 tab Laporan + ekspor PDF~~ **selesai** ·
~~M4 Segel on-chain + misi pencatatan~~ **selesai** (segel live di testnet; misi
tinggal `pnpm deploy:rewards`) ·
**M5** fitur premium di balik kredit + pembelian kredit + hardening ·
**M6** mainnet opBNB + beta tertutup 100 user + launch PWA + DappBay ·
**M7** Google Play (TWA) + App Store (Capacitor).

**Gerbang beta M6:** akurasi parser ≥ 95% pada data lapangan dan ≥ 60% beta user
mencatat ≥ 4 hari/minggu. *(Gerbang "PDF diserahkan ke petugas bank" dicabut
2026-08-15 — lihat PRD §14.)*
