-- 0024 · Kredit jadi operasi ATOMIK (§8.2 / §12)
--
-- MASALAH. `lib/credits.ts` mengerjakan saldo dengan pola baca-lalu-tulis
-- tanpa kunci: SELECT SUM → hitung di JavaScript → INSERT. Dua permintaan
-- bersamaan membaca saldo yang sama, keduanya lolos pagar 402, keduanya
-- memotong penuh. Saldo menembus nol dan `balance_after` menyimpan angka yang
-- tidak pernah benar. Hal yang sama berlaku untuk hibah harian: `/api/me` dan
-- `/api/research` yang tiba bersamaan di awal hari WIB bisa memberi 20.
--
-- Belum pernah kejadian di produksi — 39 baris ledger, 0 duplikat `daily_free`,
-- `balance_after` konsisten 100%, dan hanya SATU pemakaian seumur hidup
-- aplikasi. Itu bukan bukti aman; itu bukti belum pernah diuji beban. M5
-- menjadikan kredit barang yang dibeli dengan uang, dan galat akuntansi pada
-- barang berbayar tidak bisa diperbaiki dengan permintaan maaf.
--
-- YANG SENGAJA TIDAK DIUBAH DI SINI. Kredit gratis harian tetap MENUMPUK
-- (+10 tiap hari), meskipun §8.2 berbunyi "reset 00:00 WIB, tidak menumpuk".
-- Itu temuan terpisah (T-1) dan keputusannya milik PO: reset maupun isi-ulang
-- MENGAMBIL saldo yang sudah dilihat 9 pengguna (tertinggi 120 kredit), dan
-- memisahkan ember gratis vs berbayar adalah perubahan model ekonomi, bukan
-- perbaikan balapan. Migrasi ini hanya membuat perilaku yang SUDAH ADA menjadi
-- benar secara konkuren — tidak menggeser satu pun angka yang berlaku hari ini.

/* ── 1. Hari WIB sebagai kolom, bukan hasil hitung ───────────────────────── */
-- Idempotensi "sekali per hari WIB" harus ditegakkan indeks, bukan `select
-- exists` di aplikasi — pemeriksaan di aplikasi selalu punya jendela antara
-- membaca dan menulis.
--
-- Postgres tidak bisa mengindeks `(created_at at time zone 'Asia/Jakarta')::date`
-- karena ekspresi itu STABLE, bukan IMMUTABLE: hasilnya bergantung pada basis
-- data timezone yang bisa diperbarui. Jadi harinya disimpan eksplisit, diisi
-- aplikasi dari `lib/wib.ts` — sumber WIB tunggal yang sama dengan seluruh
-- aplikasi, bukan definisi kedua yang bisa menyimpang diam-diam.
alter table credit_ledger add column if not exists hari_wib date;

-- Baris lama diisi mundur. Tanpa ini indeks unik di bawah tidak berarti apa-apa
-- untuk hari ini: NULL tidak pernah bentrok dengan NULL, sehingga hibah hari
-- ini masih bisa terbit dua kali di sebelah baris lama yang harinya kosong.
update credit_ledger
   set hari_wib = ((created_at at time zone 'Asia/Jakarta')::date)
 where reason = 'daily_free'
   and hari_wib is null;

create unique index if not exists uq_credit_daily_free
  on credit_ledger (user_id, hari_wib)
  where reason = 'daily_free';

/* ── 2. Hibah harian — tepat sekali per hari WIB ─────────────────────────── */
create or replace function kredit_harian(
  p_user uuid,
  p_hari date,
  p_jumlah int
) returns int
language plpgsql as $$
declare
  v_saldo int;
begin
  -- Kunci PER-USER, bukan kunci tabel: dua permintaan milik orang yang sama
  -- diseriakan, sementara pengguna lain tidak ikut antre di belakangnya.
  -- Advisory lock transaksional dilepas otomatis saat fungsi ini selesai,
  -- termasuk bila ia gagal di tengah — tidak ada kunci yang bisa tertinggal.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  select coalesce(sum(amount), 0) into v_saldo
    from credit_ledger
   where user_id = p_user;

  if exists (
    select 1 from credit_ledger
     where user_id = p_user
       and reason = 'daily_free'
       and hari_wib = p_hari
  ) then
    return v_saldo;
  end if;

  insert into credit_ledger (user_id, amount, reason, hari_wib, balance_after)
  values (p_user, p_jumlah, 'daily_free', p_hari, v_saldo + p_jumlah);

  return v_saldo + p_jumlah;
end $$;

/* ── 3. Potong kredit ────────────────────────────────────────────────────── */
-- Dipanggil SESUDAH pekerjaan terkirim (charge-on-success, AC §7.2). Karena
-- itu ia tidak menolak saat saldo kurang: risetnya sudah berjalan dan sudah
-- membakar uang API, jadi menolak potongannya berarti memberikan barangnya
-- gratis. Saldo boleh menembus nol satu kali lewat balapan, dan pagar pada
-- permintaan BERIKUTNYA yang menghentikan orangnya.
--
-- Pagar sebelum-kerja hidup di sisi aplikasi (`app/api/research/route.ts`) dan
-- kini ikut menghitung riset yang masih berjalan, sehingga jendela balapan itu
-- tertutup dari hulu, bukan ditambal di hilir.
create or replace function kredit_potong(
  p_user uuid,
  p_jumlah int,
  p_alasan text,
  p_ref uuid default null
) returns int
language plpgsql as $$
declare
  v_saldo int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  select coalesce(sum(amount), 0) into v_saldo
    from credit_ledger
   where user_id = p_user;

  insert into credit_ledger (user_id, amount, reason, ref_id, balance_after)
  values (p_user, -p_jumlah, p_alasan, p_ref, v_saldo - p_jumlah);

  return v_saldo - p_jumlah;
end $$;

/* ── 4. Saldo ────────────────────────────────────────────────────────────── */
-- Sebelumnya seluruh baris ledger ditarik ke Node lalu dijumlahkan di sana.
-- Dengan hibah harian, tiap pengguna menambah ~365 baris per tahun, dan
-- `/api/me` dipanggil pada setiap navigasi — penjumlahan itu tidak boleh
-- melewati jaringan.
create or replace function kredit_saldo(p_user uuid) returns int
language sql stable as $$
  select coalesce(sum(amount), 0)::int
    from credit_ledger
   where user_id = p_user
$$;

/* ── 5. Hak akses ────────────────────────────────────────────────────────── */
-- Fungsi ini MENERBITKAN kredit. Meski RLS pada `credit_ledger` sudah menutup
-- anon/authenticated (0008) sehingga pemanggil bukan-server akan gagal di
-- INSERT-nya, hak eksekusinya tetap dicabut eksplisit: pertahanan yang
-- bergantung pada satu lapis akan runtuh diam-diam ketika lapis itu diubah.
revoke all on function kredit_harian(uuid, date, int) from public;
revoke all on function kredit_potong(uuid, int, text, uuid) from public;
revoke all on function kredit_saldo(uuid) from public;
grant execute on function kredit_harian(uuid, date, int) to service_role;
grant execute on function kredit_potong(uuid, int, text, uuid) to service_role;
grant execute on function kredit_saldo(uuid) to service_role;
