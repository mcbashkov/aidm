# Relayer Swap — operasi

Jembatan opBNB → BSC untuk fitur Tukar. Dokumen ini menjawab satu pertanyaan:
*bagaimana menjalankannya, dan apa yang harus dilakukan kalau ia berhenti.*

Kontrak & keputusan ekonominya ada di `docs/PERINTAH-AGEN-FINAL.md` (§5–§7, §10)
— dokumen itu tetap sumber kebenaran tunggal.

---

## Apa yang dilakukannya

```text
user  ── swap() ──►  SwapInitiator (opBNB)     IDMX dibakar, event SwapRequested
                            │
                     [ relayer di sini ]        menandatangani voucher untuk nonce itu
                            │
user  ── claim() ─►  SwapClaim (BSC)            IDM Reborn dibayar, fee 1 IDM dibakar
```

Satu putaran (“tick”) mengerjakan empat hal:

1. memindai `SwapRequested` dari kursor terakhir sampai 15 blok di belakang
   kepala rantai;
2. menandatangani voucher untuk tiap event, menyimpannya di `swap_vouchers`;
3. memperpanjang voucher yang tersisa < 7 hari (nonce sama, deadline baru);
4. menandai voucher yang nonce-nya sudah terpakai di BSC sebagai `claimed`.

**Invariant yang dijaga:** setiap `SwapRequested` harus berakhir sebagai voucher
yang bisa ditebus. Burn tidak bisa dibatalkan — relayer yang melewatkan satu
event membuat user kehilangan uang, bukan sekadar terlambat.

---

## Menjalankan

Endpoint: `POST /api/relayer/tick` (GET juga dilayani — sebagian penjadwal hanya
bisa GET). Otorisasi: header `Authorization: Bearer $CRON_SECRET`.

Pemanggil tak sah dijawab **404**, bukan 401 — keberadaan endpoint sengaja tidak
dikonfirmasi kepada pemindai. Tanpa `CRON_SECRET` terisi, endpoint tertutup
total; server yang lupa mengisinya tidak berubah jadi tombol yang bisa ditekan
siapa saja.

Uji manual:

```bash
curl -X POST https://ai.idmtoken.com/api/relayer/tick \
  -H "authorization: Bearer $CRON_SECRET"
# → {"ok":true,"dariBlok":"…","sampaiBlok":"…","voucherBaru":0,…}
```

### Penjadwal — pilih SALAH SATU

Interval yang dituju **1 menit**. Kodenya identik untuk ketiganya; yang berbeda
hanya siapa yang menekan tombolnya.

| Opsi | Interval | Catatan |
|---|---|---|
| **Vercel Cron** | 1 menit (**paket Pro**) | Paling rapi. Vercel mengirim `Authorization: Bearer $CRON_SECRET` otomatis bila env itu ada. **Hobby hanya mengizinkan sekali sehari — `vercel.json` dengan jadwal lebih rapat akan MENGGAGALKAN build.** Karena itu `vercel.json` sengaja belum dibuat di repo ini. |
| **cron-job.org** | 1 menit | Gratis, tidak bergantung paket Vercel. Header `Authorization` diisi manual di dashboard-nya. |
| **GitHub Actions** | 5 menit (minimum) | Gratis, tapi jadwalnya sering meleset beberapa menit saat runner sibuk. |

Kalau memakai Vercel Cron (Pro), buat `vercel.json`:

```json
{ "crons": [{ "path": "/api/relayer/tick", "schedule": "* * * * *" }] }
```

Latensi ~1 menit memang terlihat user, dan itu jujur ditampilkan UI sebagai
**Diproses → Siap diklaim → Selesai**.

---

## Env yang dibutuhkan

| Env | Peran |
|---|---|
| `CRON_SECRET` | Kunci pintu endpoint. Buat: `openssl rand -base64 32` |
| `SWAP_SIGNER_PRIVATE_KEY` | Penandatangan voucher. **WAJIB berbeda dari `MISSION_VOUCHER_PRIVATE_KEY`** |
| `NEXT_PUBLIC_SWAP_INITIATOR_ADDRESS` | Kontrak yang dipindai (opBNB) |
| `NEXT_PUBLIC_SWAP_CLAIM_ADDRESS` | Kontrak tujuan voucher (BSC) |
| `SWAP_RELAYER_CURSOR_BLOCK` | **Bootstrap saja.** Dibaca sekali seumur hidup |
| `AIDM_SWAP_CHAIN` | Kosongkan — fase BSC mengikuti fase opBNB otomatis |

### Kunci penandatangan

`SWAP_SIGNER_PRIVATE_KEY` setara **surat kuasa mencairkan kolam** dalam batas
`maxIdmxPerVoucher` (2.000 IDMX per voucher). Batas itu dan anti-replay
ditegakkan di `SwapClaim.sol`, bukan di relayer — jadi kebocoran kunci tetap
terbatas aturan on-chain, tidak tak terbatas.

Tetap: **terpisah dari `MISSION_VOUCHER_PRIVATE_KEY`** (satu kunci bocor tidak
boleh membuka dua pintu), dan **di mainnet wajib HSM atau multisig** — bukan env
biasa. Skrip `deploy-swap-bsc.mjs` menolak jalan bila kedua kunci itu menurunkan
alamat yang sama.

---

## Kursor

Hidup di tabel `relayer_state` (baris `id = 'swap'`), **bukan di env**. Alasannya:
relayer berjalan serverless — tiap tick proses baru tanpa memori — dan env yang
di-redeploy akan memundurkan kursor (memproses ulang) atau memajukannya
(melewatkan burn = burn tanpa voucher).

`SWAP_RELAYER_CURSOR_BLOCK` hanya dipakai saat baris itu belum ada. Sesudahnya
mengubah env tidak berpengaruh apa pun.

Memundurkan kursor dengan sengaja (mis. setelah insiden) aman — voucher
idempoten karena nonce adalah primary key:

```sql
update relayer_state set cursor_block = <blok> where id = 'swap';
```

---

## Kalau ada masalah

**“User bilang IDMX-nya terbakar tapi tidak ada voucher.”**
Ini keadaan paling serius. Urutan periksa:

1. Relayer memang jalan? `select cursor_block, updated_at from relayer_state;`
   — `updated_at` yang basi berarti penjadwalnya mati, bukan kodenya.
2. Kursor sudah melewati blok burn-nya? Bandingkan dengan nomor blok tx user.
   Kalau belum, tunggu — tick berikutnya mengejar (batas 100.000 blok/tick).
3. Kalau kursor sudah lewat tapi voucher tidak ada, mundurkan kursor ke sebelum
   blok itu dan panggil tick manual. Aman diulang.

**“Voucher ada tapi klaim revert.”**
Cocokkan `swapSigner` on-chain dengan alamat turunan `SWAP_SIGNER_PRIVATE_KEY`.
Kunci yang diganti tanpa `setSwapSigner` membuat semua voucher lama ditolak.

**“Tick lambat / timeout.”**
Normal saat mengejar ketertinggalan jauh. Tiap tick membatasi diri ~20 detik dan
menyimpan kemajuannya; panggil berulang sampai `tertinggal` mencapai `0`.

---

## Yang belum dibangun

- **UI Tukar** (§9) — tombol swap, pratinjau kurs, tombol klaim BSC
- **Dust top-up opBNB** — cron penjaga saldo tBNB user agar bisa `approve`+`swap`
- **`scripts/ratchet-check.mjs`** (§5) — penghitung plafon sebelum menurunkan kurs

Sampai UI ada, alur ini **belum bisa dipakai user**. Jangan melakukan swap di
testnet lewat kontrak langsung kecuali memang sedang menguji relayer.
