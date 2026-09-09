# whitepaper/ — docs.idmtoken.com

Situs whitepaper IDM Reborn (Docusaurus, dwibahasa ID/EN). Dibangun mengikuti
`docs/spesifikasi-docs-idmtoken.md`.

**Prinsip yang menentukan seluruh desainnya: angka tidak diketik di halaman.**
Angka datang dari `data/tokenomics.json` atau dari rantai lewat
`data/onchain.cache.json`. Kalau sebuah angka harus diketik manual di markdown,
itu tanda ada yang salah — laporkan, jangan kerjakan.

## Perintah

```bash
pnpm install --ignore-workspace   # paket ini berdiri sendiri
pnpm build                        # prebuild: verify-tokenomics → lint-claims → fetch-onchain
pnpm verify:tokenomics            # alokasi menjumlah 100% & 1.000.000.000
pnpm lint:claims                  # klaim terlarang di markdown
pnpm fetch:onchain                # perbarui cache on-chain
```

## Tiga gerbang yang menggagalkan build

| Skrip | Menggagalkan build kalau |
|---|---|
| `verify-tokenomics` | persen ≠ 100 · token ≠ 1 miliar · komponen ≠ induknya · sirkulasi/MC/persen tidak konsisten |
| `lint-claims` | markdown memuat klaim terlarang (`data/forbidden-phrases.json`) |
| `<Receipt>` | dirender tanpa `url` atau `date` — klaim tanpa bukti tidak bisa terbit |

`fetch-onchain` **sengaja TIDAK** menggagalkan build. RPC yang buntu membuatnya
memakai cache terakhir dan menandainya `stale`; `<OnChainStat>` selalu merender
tanggal pembacaan, dan menandai umur di atas 7 hari. Halaman yang gagal terbit
karena satu RPC lambat lebih buruk daripada angka berumur tiga hari.

## Yang BELUM bisa diselesaikan

- **Logo.** `static/img/logo-idm-reborn.svg` tidak dibuat. Spesifikasi §7
  melarang menggambar ulang atau memakai placeholder, dan berkasnya tidak ada
  di repo landing page (`aset/` hanya memuat PNG pilar: AIDM, IDM Film,
  SkemGuard). Rujukan di config dipertahankan pada nama yang benar supaya
  langsung bekerja begitu berkasnya ditaruh.
- **Alamat Safe treasury.** `tokenomics.json` → `treasury.address` sengaja
  `null`; komponen merender catatan "alamat dipublikasikan setelah dompet
  dibuat", **bukan alamat contoh**.
- **Isi 12 bab.** Spesifikasi §8: agen membuat kerangka, frontmatter, dan
  sidebar — bukan mengarang isi.
- **Deploy & DNS.** Vercel root directory `whitepaper`, CNAME `docs` →
  `cname.vercel-dns.com`. Tangan PO.
- **Ekspor PDF berversi.** Butuh situs yang sudah hidup (`pnpm pdf`).
