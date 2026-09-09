# SPESIFIKASI — docs.idmtoken.com (IDM Whitepaper)

**Untuk:** agen VS Code (repo AIDM)
**Prasyarat:** perintah sinkronisasi ekonomi token sudah selesai dijalankan dan `docs/PERINTAH-AGEN-FINAL.md` §0.1 sudah versi terbaru. Jangan mulai sebelum itu.
**Tanggal:** 9 September 2026

Prinsip yang menentukan seluruh desain di bawah: **angka tidak diketik di halaman.** Angka datang dari satu berkas data atau dari rantai. Kalau sebuah angka harus diketik manual di file markdown, itu tanda ada yang salah dalam spesifikasi ini — laporkan, jangan kerjakan.

---

## 1. Stack & inisialisasi

```bash
npx create-docusaurus@latest whitepaper classic --typescript
cd whitepaper
npm i viem
npm i -D docusaurus-prince-pdf
```

Lokasi: `whitepaper/` di root repo AIDM, sejajar dengan `docs/` dan `contracts/`. Alasannya: `tokenomics.json` harus bisa diturunkan dari `docs/PERINTAH-AGEN-FINAL.md` tanpa lintas-repo.

---

## 2. Struktur berkas

```
whitepaper/
├── docusaurus.config.ts
├── sidebars.ts
├── data/
│   ├── tokenomics.json          ← turunan §0.1, satu-satunya sumber angka
│   ├── status.json              ← status tiap pilar
│   └── onchain.cache.json       ← hasil fetch terakhir (di-commit)
├── scripts/
│   ├── fetch-onchain.ts         ← dijalankan sebelum build
│   └── verify-tokenomics.ts     ← cek jumlah alokasi = 100%
├── src/
│   ├── components/
│   │   ├── Receipt.tsx
│   │   ├── AllocationTable.tsx
│   │   ├── UnlockCurve.tsx
│   │   ├── StatusBadge.tsx
│   │   └── OnChainStat.tsx
│   └── css/custom.css
├── static/img/
│   ├── logo-idm-reborn.svg
│   └── og-whitepaper.png
├── docs/                        ← 12 halaman, bahasa Indonesia
└── i18n/en/docusaurus-plugin-content-docs/current/   ← 12 halaman, Inggris
```

---

## 3. `data/tokenomics.json`

Berkas ini adalah turunan mesin dari §0.1. Bentuknya:

```json
{
  "snapshot": "2026-09-09",
  "sourceDoc": "docs/PERINTAH-AGEN-FINAL.md#0.1",
  "totalSupply": 1000000000,
  "launchPrice": 0.005,
  "fdv": 5000000,
  "allocations": [
    { "id": "ecosystem", "label": { "id": "Ekosistem & Reward", "en": "Ecosystem & Rewards" },
      "pct": 26, "tokens": 260000000,
      "components": [
        { "label": { "id": "Kolam swap", "en": "Swap pool" }, "tokens": 150000000, "locked": true },
        { "label": { "id": "Cadangan reward", "en": "Reward reserve" }, "tokens": 110000000 }
      ],
      "vesting": { "tge": 5, "cliffMonths": 0, "linearMonths": 48 },
      "circulatingAtTge": 5500000 }
  ],
  "migration": {
    "verifiedObligation": 146668760,
    "lateePool": 13331240,
    "addresses": 487,
    "threshold": 250000,
    "belowThreshold": { "addresses": 357, "tokens": 25076287 },
    "aboveThreshold": { "addresses": 130, "tokens": 120907014, "tgePct": 20, "linearMonths": 6 }
  },
  "treasury": { "tokens": 100000000, "multisig": "2-of-3", "address": null,
    "split": { "operations": 45, "partnerships": 20, "emergency": 20, "buyback": 15 } }
}
```

Lengkapi seluruh pos sesuai §0.1. `address` diisi setelah Safe dibuat; selama `null`, komponen treasury merender catatan "alamat dipublikasikan setelah dompet dibuat" — **bukan alamat contoh.**

`scripts/verify-tokenomics.ts` dijalankan di `prebuild` dan **menggagalkan build** kalau: jumlah `pct` ≠ 100, jumlah `tokens` ≠ `totalSupply`, atau jumlah `components[].tokens` ≠ `tokens` pos induknya. Angka yang tidak menjumlah tidak boleh pernah terbit.

---

## 4. `data/status.json`

```json
{
  "aidm":      { "state": "live",    "since": "2026-08-08" },
  "skemguard": { "state": "live",    "since": "2026-09" },
  "film":      { "state": "live",    "titles": 2 },
  "idmchain":  { "state": "concept" },
  "contracts": { "state": "testnet", "count": 7 }
}
```

`StatusBadge` membaca berkas ini. Nilai `state` yang diizinkan hanya: `live`, `testnet`, `concept`. Tidak ada nilai lain — kalau sesuatu tidak masuk tiga kategori itu, ia belum layak muncul di whitepaper.

---

## 5. `scripts/fetch-onchain.ts`

Dijalankan sebagai `prebuild`. Memakai viem, membaca:

| Data | Jaringan | Sumber |
|---|---|---|
| `totalSupply` IDM Reborn | BSC | kontrak IDMReborn |
| `totalSupply` IDMX | opBNB | kontrak IDMX |
| Saldo `0x…dEaD` token v1 | BSC | `0x14B13E06f75E1F0Fd51ca2E699589Ef398E10F4C` |
| Saldo kolam SwapClaim | BSC | kontrak SwapClaim |
| Saldo kolam MissionRewards | opBNB | kontrak MissionRewards |
| Jumlah laporan tersegel | opBNB | event `ReportAttestation` |

Alamat kontrak dari env: `IDM_REBORN_ADDR`, `IDMX_ADDR`, `SWAPCLAIM_ADDR`, `MISSIONREWARDS_ADDR`, `ATTESTATION_ADDR`, `RPC_BSC`, `RPC_OPBNB`.

**Aturan kegagalan — ini penting.** Kalau RPC gagal atau timeout (batas 10 detik per panggilan), skrip **tidak menggagalkan build**. Ia memakai `data/onchain.cache.json` yang terakhir berhasil dan menandainya. Setiap nilai membawa `fetchedAt`. `OnChainStat` selalu merender tanggal itu, dan menampilkan penanda visual kalau umurnya lebih dari 7 hari. Halaman yang gagal terbit karena satu RPC lambat adalah kegagalan yang lebih buruk daripada angka berumur tiga hari.

Hasil fetch yang berhasil di-commit ke repo, supaya build di Vercel tidak bergantung pada ketersediaan RPC.

---

## 6. Komponen

**`<Receipt claim="..." evidence="..." url="..." date="..." />`**
Merender klaim dengan tautan bukti dan tanggal snapshot dalam satu blok seragam. `url` dan `date` **wajib** — kalau salah satu kosong, komponen melempar error saat build. Ini yang memaksa disiplin receipts: klaim tanpa bukti tidak bisa dirender.

**`<AllocationTable />`** — membaca `tokenomics.json`, merender tabel alokasi + kolom rincian. Tidak menerima props angka.

**`<UnlockCurve months={24} />`** — grafik pelepasan kumulatif dari seluruh jadwal vesting, termasuk emisi migrasi 6 bulan. Tandai garis sirkulasi TGE. Pakai SVG murni atau recharts, jangan tambah dependensi berat.

**`<StatusBadge pillar="skemguard" />`** — chip warna dari `status.json`. `testnet` dan `concept` wajib punya warna berbeda dari `live`, dan teksnya mengandung kata itu sendiri.

**`<OnChainStat metric="deadBalance" />`** — angka dari cache + label "per [tanggal]".

---

## 7. `docusaurus.config.ts`

```ts
const config: Config = {
  title: 'IDM Whitepaper',
  tagline: 'IDM Reborn — dokumen teknis dan ekonomi',
  url: 'https://docs.idmtoken.com',
  baseUrl: '/',
  favicon: 'img/logo-idm-reborn.svg',
  i18n: {
    defaultLocale: 'id',
    locales: ['id', 'en'],
    localeConfigs: {
      id: { label: 'Bahasa Indonesia', htmlLang: 'id-ID' },
      en: { label: 'English', htmlLang: 'en-US' },
    },
  },
  presets: [['classic', {
    docs: {
      routeBasePath: '/',
      sidebarPath: './sidebars.ts',
      showLastUpdateTime: true,
      showLastUpdateAuthor: false,
      editUrl: undefined,
    },
    blog: false,
    theme: { customCss: './src/css/custom.css' },
  }]],
  themeConfig: {
    navbar: {
      title: 'IDM Whitepaper',
      logo: { alt: 'IDM Reborn', src: 'img/logo-idm-reborn.svg' },
      items: [
        { type: 'localeDropdown', position: 'right' },
        { href: 'https://idmtoken.com', label: 'idmtoken.com', position: 'right' },
      ],
    },
    footer: { style: 'dark', copyright: `PT IDM Film Sejahtera · NIB 1006240127505` },
  },
};
```

**Aset logo:** salin berkas logo dari repo landing page ke `static/img/logo-idm-reborn.svg`. Jangan membuat ulang atau menggambar sendiri. Kalau berkasnya tidak ditemukan, hentikan dan laporkan — jangan pakai placeholder.

Judul navbar **"IDM Whitepaper"** dengan logo IDM Reborn di sebelah kirinya. Tidak perlu wordmark terpisah.

---

## 8. Halaman

```
docs/
  00-ringkasan.md            Ringkasan eksekutif
  01-latar-belakang.md       Masalah
  02-rekam-jejak.md          Rekam jejak, v1, migrasi
  03-ekosistem.md            4 pilar + StatusBadge
  04-arsitektur-token.md     v1, IDM Reborn, IDMX, properti kontrak, tokenomics
  05-model-ekonomi.md        Kredit AI, buyback, treasury
  06-teknologi.md            BSC + opBNB, ERC-4337, hash-only, keamanan
  07-roadmap.md              Tiga lapis: tercapai / komitmen / bersyarat
  08-kepatuhan.md            PDP, risiko, disclaimer
  09-tim.md                  Badan hukum
  10-lampiran.md             Alamat kontrak, glossary
  11-riwayat-revisi.md       Perubahan + hash PDF tiap versi
```

Frontmatter tiap halaman: `sidebar_position`, `title`, `description`.

**Halaman 00 harus berdiri sendiri.** Pembaca docs mendarat dari sidebar atau mesin pencari, bukan dari halaman pertama. Ringkasan tidak boleh mengandaikan halaman lain sudah dibaca.

Isi ditulis belakangan — tugasmu sekarang membuat kerangka berkas, frontmatter, dan sidebar. Jangan mengarang isi.

---

## 9. Dwibahasa

```bash
npm run write-translations -- --locale en
mkdir -p i18n/en/docusaurus-plugin-content-docs/current
cp docs/*.md i18n/en/docusaurus-plugin-content-docs/current/
```

Buat `data/glossary.json` berisi pasangan istilah ID–EN yang dikunci (contoh: *kolam swap* → *swap pool*, *pos alokasi* → *allocation*, *segel laporan* → *report seal*). Semua terjemahan memakai daftar ini. Istilah yang diterjemahkan berbeda di dua halaman lebih merusak daripada halaman yang belum diterjemahkan.

Label angka di komponen mengambil dari `label.id` / `label.en` di `tokenomics.json` — jangan duplikasi tabel dalam bahasa Inggris.

---

## 10. Deploy

Vercel, import repo, **Root Directory `whitepaper`**. Build `npm run build`, output `build`. Tambahkan env var dari §5.

DNS di Hostinger: CNAME `docs` → `cname.vercel-dns.com`.

---

## 11. Ekspor PDF berversi

```bash
npx docusaurus-prince-pdf -u https://docs.idmtoken.com/ \
  --output static/pdf/idm-reborn-whitepaper-v1.0.pdf
sha256sum static/pdf/idm-reborn-whitepaper-v1.0.pdf
```

Hash dicatat di `11-riwayat-revisi.md` bersama tanggal dan ringkasan perubahan. Setelah versi 1.0 terbit, tulis hash-nya ke `ReportAttestation` di opBNB — kontraknya sudah ada dan hanya menerima hash 32 byte, jadi tidak ada perubahan kontrak yang diperlukan.

---

## 12. Aturan isi yang ditegakkan alat, bukan ingatan

Tambahkan `scripts/lint-claims.ts` ke `prebuild`. Build **gagal** kalau menemukan di berkas markdown mana pun:

- frasa "siap diajukan ke bank", "layak kredit", "kelayakan kredit" dalam konteks janji
- "sudah diaudit" tanpa kata "internal" atau "pra-"
- "kontrak live" / "sudah live" dalam kalimat yang sama dengan nama kontrak, tanpa kata "testnet"
- "menjaga harga", "menaikkan harga", "imbal hasil", "dividen", "bagi hasil", "ROI" — di mana pun
- angka rupiah yang menempel pada jumlah token reward

Daftar ini disimpan di satu berkas `data/forbidden-phrases.json` supaya bisa ditambah tanpa menyentuh skrip.

---

## 13. Definisi selesai

- [ ] `npm run build` lolos untuk kedua locale
- [ ] `verify-tokenomics` lolos: alokasi menjumlah 100% dan 1.000.000.000
- [ ] `lint-claims` lolos
- [ ] Build tetap berhasil saat RPC dimatikan (memakai cache, menampilkan tanggal)
- [ ] `<Receipt>` melempar error kalau `url` atau `date` kosong — uji sekali, lalu perbaiki
- [ ] docs.idmtoken.com hidup, logo tampil, pengalih bahasa berfungsi
- [ ] Laporkan: daftar angka yang masih diketik manual di markdown, kalau ada
