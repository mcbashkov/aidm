-- 0019 · Perbaikan 0018 — uint256 disimpan sebagai text, bukan numeric.
--
-- Bug yang diperbaiki (ditemukan saat uji, sebelum dipakai user):
-- PostgREST mengembalikan kolom `numeric` sebagai **number JavaScript**, dan
-- number kehilangan presisi di atas 2^53 (9.007.199.254.740.991). Dua kolom di
-- 0018 rutin melampauinya:
--
--   idmx_burned  — nilai wei; 500 IDMX saja sudah 5e20
--   nonce        — aman untuk sekarang (mulai dari 1), tapi sekelas yang sama
--
-- Contoh nyatanya: menulis nonce `999000000000000009` lalu membacanya kembali
-- menghasilkan `999000000000000000` — digit terakhir hilang diam-diam.
--
-- Kenapa ini bukan sekadar kerapian: relayer MEMBACA BALIK kedua nilai itu
-- untuk menandatangani ulang voucher yang mendekati kedaluwarsa, dan endpoint
-- voucher mengirimkannya ke klien untuk dipakai memanggil kontrak. Satu digit
-- meleset = tanda tangan tidak lagi cocok dengan pesannya = `SwapClaim` menolak
-- voucher dengan `InvalidSignature`. Padahal IDMX-nya sudah terbakar di opBNB
-- dan tidak bisa dikembalikan. Kolom bertipe salah di sini berujung pada
-- kehilangan dana user, bukan pada angka yang jelek di layar.
--
-- `text` mengembalikan string apa adanya, jadi ketepatannya terjaga secara
-- struktural — bukan bergantung pada setiap query di masa depan ingat menulis
-- cast `::text`. Aritmetika di SQL memang jadi tidak mungkin, tapi kedua kolom
-- ini tidak pernah dihitung di database: keduanya hanya disimpan, dibaca utuh,
-- lalu diserahkan ke kontrak.
--
-- Konversi aman dijalankan kapan saja: tabelnya baru lahir di 0018 dan belum
-- pernah menampung voucher sungguhan.

alter table swap_vouchers
  alter column nonce type text using nonce::text,
  alter column idmx_burned type text using idmx_burned::text;

-- Digit desimal polos, tanpa tanda dan tanpa nol di depan — bentuk yang persis
-- dihasilkan `BigInt.toString()`. CHECK ini yang menjaga perbandingan
-- kesamaan string tetap bermakna: '007' dan '7' adalah nonce yang sama bagi
-- kontrak, tapi dua baris berbeda bagi Postgres.
alter table swap_vouchers drop constraint if exists swap_vouchers_nonce_kanonik;
alter table swap_vouchers add constraint swap_vouchers_nonce_kanonik
  check (nonce ~ '^(0|[1-9][0-9]*)$');

alter table swap_vouchers drop constraint if exists swap_vouchers_idmx_kanonik;
alter table swap_vouchers add constraint swap_vouchers_idmx_kanonik
  check (idmx_burned ~ '^(0|[1-9][0-9]*)$');
