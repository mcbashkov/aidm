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
curl -X POST https://aidm-idmtoken.vercel.app/api/relayer/tick \
  -H "authorization: Bearer $CRON_SECRET"
# → {"ok":true,"dariBlok":"…","sampaiBlok":"…","voucherBaru":0,…}
```

**Kalau jawabannya `302` ke `vercel.com/sso-api`, bukan endpoint ini yang salah**
— Deployment Protection tim Pro sedang mencegat seluruh aplikasi sebelum request
sampai ke kode. Matikan Vercel Authentication untuk Production (Settings →
Deployment Protection; lindungi Preview saja), atau pakai Protection Bypass for
Automation. Vercel Cron sendiri menembus proteksi ini, jadi cron bisa hidup
padahal `curl` Anda tertahan — **jangan simpulkan relayer mati dari 302 saja.**
Ukuran yang jujur ada di bagian Kursor: kalau `updated_at` bergerak tiap menit,
relayer bekerja.

### Penjadwal — **Vercel Cron** (dipakai sejak 2026-08-22)

`vercel.json` di akar repo menjadwalkan `/api/relayer/tick` tiap menit:

```json
{ "crons": [{ "path": "/api/relayer/tick", "schedule": "* * * * *" }] }
```

Tiga hal yang perlu diketahui tentang jadwal ini:

- **Butuh paket Pro.** Hobby hanya mengizinkan sekali sehari, dan `vercel.json`
  dengan jadwal lebih rapat **menggagalkan build** — bukan diam-diam melambat.
  Project ini dipindahkan ke tim Pro lebih dulu, karena itu berkas ini ada.
- **Header otorisasi dikirim Vercel sendiri**, bukan ditulis di `vercel.json`.
  Syaratnya env `CRON_SECRET` ada di project — kalau tidak, tick dijawab 404 dan
  relayer diam tanpa suara. Env itu wajib ikut ada di tim Pro setelah transfer.
- **Cron hanya hidup di deployment Production.** Preview/branch deployment tidak
  menjalankannya; jadwal terdaftar saat deployment production baru dipromosikan.

Kalau suatu saat paket Vercel turun lagi ke Hobby, endpointnya tidak berubah —
tinggal hapus `vercel.json` dan tunjuk penjadwal luar ke URL yang sama:
**cron-job.org** (gratis, 1 menit, header `Authorization` diisi manual) atau
**GitHub Actions** (gratis, minimum 5 menit, sering meleset saat runner sibuk).

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

## Tick yang sama juga menuntaskan klaim misi (sejak 2026-08-26)

`/api/relayer/tick` mengerjakan DUA pekerjaan berurutan dalam satu invokasi:
tick swap di atas, lalu tick klaim misi. Sengaja satu endpoint dan satu jadwal
— bukan cron kedua — supaya hanya ada satu hal yang perlu hidup, dan satu
tempat untuk memeriksa kalau ia mati.

Tick misi mengerjakan tiga hal:

1. mengirim klaim yang berstatus `queued` (handler HTTP hanya menulis niat,
   tidak pernah menyentuh rantai);
2. membaca receipt untuk yang `submitted` → `confirmed`;
3. **merekonsiliasi baris menggantung** — status `sending`/`submitted` tanpa
   `tx_hash`. Rantai yang berwenang: `nonceUsed(user, nonce)` menjawab apakah
   rewardnya benar-benar sudah dibayar, dan event `Claimed` memulihkan hash-nya
   supaya pengguna tetap punya tautan yang bisa dibuka. Yang ternyata belum
   pernah terkirim dikembalikan ke antrean dengan nonce yang SAMA — kontrak
   menolak nonce terpakai, jadi kirim ulang tidak mungkin membayar dua kali.

**Satu EOA, satu pengirim.** Klaim misi adalah satu-satunya jalur yang
mengirim transaksi dari EOA relayer; tick swap hanya membaca log,
menandatangani voucher di luar rantai, dan membaca kontrak — tidak satu pun
menghabiskan nonce EVM, dan penandatangan swap adalah EOA yang berbeda
(`SWAP_SIGNER_PRIVATE_KEY`, ditolak skrip deploy bila sama). Perebutan nonce
yang nyata karena itu bukan antara misi dan swap, melainkan antara dua tick
MISI yang bertumpang tindih — cron menembak tiap menit sementara satu tick
boleh berjalan 60 detik. Yang menyerialkannya adalah sewa di `relayer_locks`,
berkunci ALAMAT PENGIRIM:

```sql
select * from relayer_locks;   -- id = 'pengirim:0x…', locked_until
```

Tick yang tidak mendapat sewa menjawab `misi.dilewati: true` dan mundur — itu
perilaku normal, bukan kegagalan.

**Klaim tersangkut di "Diproses…".** Periksa `select status, tx_hash from
mission_claims where status <> 'confirmed';`. Selama `relayer_locks.locked_until`
bergerak dan tick berjalan, baris apa pun di sana akan tuntas sendiri paling
lama beberapa tick — kalau tidak, sewa yang macet (`locked_until` jauh di masa
depan tanpa tick berjalan) adalah tersangka pertama.

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
