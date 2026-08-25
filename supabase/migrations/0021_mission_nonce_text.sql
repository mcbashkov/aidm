-- 0021 · mission_claims.nonce → text (uint256 penuh).
--
-- Bug yang diperbaiki (SUDAH menimpa user di produksi, bukan temuan uji):
-- `nonceBaru()` menghasilkan bilangan acak **unsigned 64-bit** (0 … 2^64-1),
-- sedangkan kolomnya `bigint` — **signed** 64-bit, maksimum 2^63-1. Tepat
-- separuh dari semua nonce yang mungkin melampauinya, jadi setiap ketukan
-- "Klaim" adalah lemparan koin: 50% ditolak Postgres dengan SQLSTATE 22003
-- ("value ... is out of range for type bigint"), yang lolos ke catch terluar
-- dan keluar sebagai 500. Log Vercel 2026-08-22..25: 5 kejadian, 4 user, dan
-- keempat nonce yang tercatat berada di paruh atas — 13030657321482534858,
-- 12814068647619642222, 13225437895595547385, 16213509590252896750.
--
-- Kenapa text, bukan mask 63-bit di aplikasi: nonce adalah `uint256` di
-- `MissionRewards.sol`. Mengecilkan domainnya agar muat ke tipe penyimpanan
-- yang salah adalah menyesuaikan kebenaran pada wadahnya. `swap_vouchers.nonce`
-- sudah text sejak 0019 dengan alasan yang sama; kolom ini yang terakhir
-- menyimpang, dan sekarang seragam.
--
-- Ada alasan kedua yang lebih senyap: PostgREST mengembalikan `bigint` sebagai
-- **number JavaScript**, yang kehilangan presisi di atas 2^53. Hari ini tidak
-- ada kode yang membaca kolom ini balik, tapi jalur rekonsiliasi klaim
-- (B1/B2) akan membacanya — dan nonce yang meleset satu digit berarti tanda
-- tangan tidak cocok dengan pesannya, persis kelas kegagalan yang 0019 cegah.
--
-- Aman untuk 10 baris `confirmed` yang sudah ada: bigint → text adalah cast
-- yang tidak mungkin kehilangan informasi, dan nilai lama sudah berbentuk
-- digit desimal polos. Indeks unik (user_id, mission_id, nonce) dibangun ulang
-- otomatis oleh ALTER TYPE dan tetap berlaku atas nilai yang sama.

alter table mission_claims
  alter column nonce type text using nonce::text;

-- Digit desimal polos, tanpa tanda dan tanpa nol di depan — bentuk yang persis
-- dihasilkan `BigInt.toString()`. CHECK ini yang menjaga perbandingan kesamaan
-- string tetap bermakna: '007' dan '7' adalah nonce yang sama bagi kontrak,
-- tapi dua baris berbeda bagi Postgres. Sama seperti 0019.
alter table mission_claims drop constraint if exists mission_claims_nonce_kanonik;
alter table mission_claims add constraint mission_claims_nonce_kanonik
  check (nonce ~ '^(0|[1-9][0-9]*)$');
