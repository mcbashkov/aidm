-- 0022 · Klaim misi jadi pekerjaan asinkron (§7.6).
--
-- Kelas bug yang dicabut migrasi ini beserta kodenya: handler HTTP mengirim
-- transaksi on-chain LALU menulis `tx_hash` ke database. Di antara keduanya ada
-- jendela tempat uang sudah berpindah tapi catatannya belum ada. Bila tulisan
-- itu gagal, pengguna melihat 500, mencoba lagi, dan dijawab 409 "sudah
-- diklaim" — untuk sebuah reward yang memang sudah dibayarkan, tapi yang tidak
-- pernah bisa ia lihat. Uang berpindah, pemiliknya tidak tahu, dan sistem
-- menolak dia bertanya. Di produksi hal ini belum pernah terjadi (0 baris
-- berstatus tidak jelas per 2026-08-26); yang menjaganya selama ini hanyalah
-- keberuntungan.
--
-- Bentuk barunya membalik urutan sehingga jendela itu tidak bisa ada:
--
--   1. HTTP menulis NIAT (`queued`) — termasuk `nonce`, sebelum apa pun
--      menyentuh rantai — lalu langsung menjawab "diproses".
--   2. Cron relayer yang menandatangani dan mengirim.
--   3. Cron yang sama merekonsiliasi: hasil di rantai dibaca balik dan
--      dituliskan ke baris yang sudah ada.
--
-- Kuncinya ada di langkah 1: karena `nonce` tersimpan SEBELUM transaksi
-- dikirim, kebenaran on-chain selalu bisa ditanyakan ulang lewat
-- `nonceUsed(user, nonce)` — bahkan ketika kita kehilangan tx hash-nya.
-- Baris database tidak pernah lagi menjadi satu-satunya bukti bahwa reward
-- sudah dibayar, dan tidak ada keadaan yang tidak bisa dipulihkan dari rantai.
-- Nonce yang tetap juga membuat percobaan ulang aman: kontrak menolak nonce
-- yang sudah terpakai, jadi mengirim ulang voucher yang sama tidak mungkin
-- membayar dua kali.

/* ── Status baru ─────────────────────────────────────────────────────────── */
-- queued    — niat tercatat, belum ada apa pun di rantai
-- sending   — satu worker memegangnya dan sedang/akan mengirim
-- submitted — tx sudah dikirim, hash diketahui, receipt belum
-- confirmed — receipt sukses
-- failed    — gagal permanen; sengaja DIKECUALIKAN dari indeks unik periode
--             (0017) supaya misinya tidak terkunci selamanya bagi user
-- signed    — status era sinkron; dipertahankan agar baris lama tetap sah
alter table mission_claims drop constraint if exists mission_claims_status_check;
alter table mission_claims add constraint mission_claims_status_check
  check (status in ('queued','sending','submitted','confirmed','failed','signed'));

-- Antrean worker: hanya baris yang belum tuntas yang pernah dipindai, jadi
-- indeksnya parsial. Tabel klaim akan didominasi baris `confirmed` yang tidak
-- perlu ikut dibaca setiap menit.
create index if not exists idx_mission_claims_antrean
  on mission_claims (status, created_at)
  where status in ('queued','sending','submitted');

/* ── Sewa pengirim (satu EOA, satu pengirim pada satu waktu) ─────────────── */
-- Klaim misi adalah SATU-SATUNYA jalur yang mengirim transaksi dari EOA
-- relayer; tick swap hanya membaca log, menandatangani voucher di luar rantai,
-- dan membaca kontrak — tidak satu pun menghabiskan nonce EVM, dan
-- penandatangan swap adalah EOA yang berbeda. Karena itu perebutan nonce yang
-- nyata bukan antara misi dan swap, melainkan antara dua tick MISI yang
-- bertumpang tindih: Vercel Cron menembak tiap menit sementara satu tick boleh
-- berjalan sampai 60 detik.
--
-- Dua pengirim bersamaan dari satu EOA akan membaca nonce EVM yang sama dan
-- salah satunya ditolak node. Sewa di bawah menyerialkannya di database, dan
-- kuncinya adalah ALAMAT PENGIRIM — bukan nama pekerjaan — supaya penambahan
-- pekerjaan lain yang mengirim dari EOA yang sama ikut terserialkan tanpa
-- perlu ingat menambahkan kunci baru.
create table if not exists relayer_locks (
  id           text primary key,
  locked_until timestamptz not null,
  pemegang     text,
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_relayer_locks_updated on relayer_locks;
create trigger trg_relayer_locks_updated before update on relayer_locks
  for each row execute function set_updated_at();

alter table relayer_locks enable row level security;
-- Tanpa policy: hanya service-role (server) yang boleh menyentuhnya, sama
-- seperti relayer_state di 0018.
