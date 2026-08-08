# AIDM

**Agen AI Intelijen Pasar UMKM · dApp Ekosistem IDM Reborn · opBNB**

PWA intelijen pasar untuk UMKM & calon wirausaha Indonesia. Pendekatan agen riset
on-demand (tanya → agen meriset TikTok/Google Trends/marketplace → insight + konten
siap pakai). Web3 "proud but calm": punya akun = punya wallet, reward IDMX, tukar ke
IDM Reborn — sementara alur riset harian bersih tanpa jargon.

> **Status: Milestone M0** (roadmap PRD §14) — fondasi siap: Next.js 14 (App Router)
> + Tailwind, sistem desain §13 (putih-emas, serif+sans), PWA installable (manifest +
> service worker), auth Privy + embedded wallet otomatis (opBNB), skema database
> Supabase §10 sebagai migrasi. Fitur inti (agen riset, kredit, kontrak, tukar)
> menyusul di M1–M7.

---

## Stack (§9.1)

| Lapisan | Pilihan |
|---|---|
| Frontend | Next.js 14 App Router (PWA) + Tailwind |
| Auth + Embedded Wallet | Privy (email/HP/Google → wallet EVM otomatis) |
| PWA / Service Worker | Serwist (`@serwist/next`) |
| Database | Supabase Postgres + pgvector (migrasi di `supabase/migrations`) |
| Chain | **opBNB** (mainnet 204 / testnet 5611) via viem |
| Font | Fraunces (serif display) + Plus Jakarta Sans (sans) |

## Prasyarat

- Node.js ≥ 18.18 (dipakai: v22)
- pnpm (dipakai: v11)
- ImageMagick — hanya untuk regenerasi ikon (`pnpm icons`), opsional

## Mulai

```bash
pnpm install
cp .env.local.example .env.local   # lalu isi nilainya (lihat di bawah)
pnpm dev                           # http://localhost:3000
```

Tanpa mengisi `.env.local`, aplikasi tetap jalan dalam **mode demo**: seluruh UI
bisa dijelajahi; auth + wallet + persistensi aktif begitu env diisi.

### Environment

| Variabel | Untuk |
|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | App ID Privy (aktifkan auth + wallet). Ambil di dashboard.privy.io |
| `PRIVY_APP_SECRET` | Verifikasi token Privy di server |
| `SESSION_SECRET` | Tanda tangan cookie sesi (HMAC) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Klien Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Tulis data server-side (bypass RLS) |
| `NEXT_PUBLIC_DEFAULT_CHAIN` | `opbnb` (default) / `opbnb-testnet` |

### Database (Supabase)

Skema §10 ada sebagai migrasi berurutan di `supabase/migrations/` (0001–0009:
extensions/pgvector → core → kredit → riset → misi/swap → config/admin → indeks →
RLS → seed). Terapkan dengan salah satu:

```bash
# Supabase CLI (disarankan)
supabase link --project-ref <ref>
supabase db push

# atau: salin isi tiap file 0001..0009 ke SQL Editor Supabase, jalankan berurutan
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
| `pnpm icons` | Regenerasi ikon PWA dari `public/brand/logo_idm.png` (butuh ImageMagick) |

## Struktur

```
app/
  (auth)/            masuk + onboarding (peran, usaha) — fokus tunggal per layar
  (app)/             shell + Beranda · Riset · Konten · Misi · Akun
  api/               auth/session · me
  manifest.ts        manifest PWA
  sw.ts              service worker Serwist (di-exclude dari tsc)
  ~offline/          halaman offline
components/
  ui/                Button, Card, PillToggle, SuggestionChips, CreditCounter, Gauge, AskInput, StepDots
  layout/            BottomNav (mobile) · TopNav (tablet/desktop) · AuthStatus
  research/          AnswerArticle ("Kamu bertanya…") · RisetView
  wallet/            WalletCard (gelap-emas)
  pwa/               registrasi SW + prompt install
lib/
  privy/  chains/  supabase/  auth/  design/  + utils, categories, missions, research
supabase/migrations/ skema §10 (0001–0009)
public/icons/        ikon PWA (any + maskable) dari logo
```

## Sistem desain (§13)

Tema terang & bersih: latar putih hangat `#FAFAFA`, teks hitam pekat, kartu putih
radius 24px ber-border tipis. CTA utama pill **charcoal** `#1F1F1F`. Aksen **emas**
`#F0B90B→#FCD535` untuk ikon aktif, progress, highlight angka. Kartu **gelap-emas**
hanya untuk Wallet/Reward. Tipografi kontras **serif (Fraunces)** untuk judul/
pertanyaan + **sans (Plus Jakarta Sans)** untuk body/angka. Nilai token: `app/globals.css`.

## Catatan M0

- **Mode placeholder:** tanpa kredensial, `Providers` melewati Privy dan middleware
  mengizinkan semua rute agar UI bisa didemokan. Isi env untuk mengaktifkan alur riil.
- **Auth + wallet:** setelah login Privy, klien memanggil `POST /api/auth/session` →
  token diverifikasi server-side → upsert `users` + `wallets` (100% akun ber-wallet,
  AC §7.1) → cookie sesi ber-HMAC.
- **Bundle ≤ 200 KB (§12):** target optimasi lanjutan (lazy-load Privy, code-split)
  digarap pada milestone kualitas M5. SDK Privy saat ini masuk shared bundle.
- **Skeleton bermakna:** Riset menampilkan pratinjau format kartu jawaban;
  Konten/Misi menandai milestone aktivasi (M2/M4).

## Milestone selanjutnya (§14)

M1 agen riset + 5 tools + cache + kredit · M2 wizard + generator konten ·
M3 pembelian kredit QRIS/VA · M4 kontrak IDMX/MissionRewards/IDMXSwapPool (testnet) ·
M5 wallet card + hardening + Lighthouse · M6 mainnet + launch PWA + DappBay ·
M7 Google Play (TWA) + App Store (Capacitor).
