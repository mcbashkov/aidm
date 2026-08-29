-- 0027 · Langganan bulanan menggantikan Kredit AI (§8, keputusan PO 2026-08-28)
--
-- KENAPA MODELNYA DIGANTI, bukan diperbaiki. Kredit menuntut pengguna memahami
-- empat konsep sebelum bisa memakai satu fitur: apa itu kredit, berapa
-- harganya, mana yang hangus, mana yang tidak. Langganan menuntut satu
-- keputusan: berlangganan atau tidak. Pemilik produk sendiri perlu dua kali
-- baca untuk memahami skema dua ember yang dirancang sebelum ini — dan kalau
-- pembuatnya bingung, pedagang di Cianjur pasti lebih bingung.
--
-- `credit_ledger` SENGAJA TIDAK DI-DROP. Ia menyimpan riwayat keuangan sembilan
-- pengguna pertama, dan riwayat uang tidak dibuang hanya karena modelnya
-- berganti. Yang dilakukan: memutusnya dari alur produk (tidak ada lagi kode
-- yang menulis ke sana) dan menandainya beku di sini, supaya orang berikutnya
-- yang membaca skema tahu ia arsip, bukan jalur hidup.

comment on table credit_ledger is
  'BEKU sejak 0027 (2026-08-28). Arsip Kredit AI — model berganti ke langganan '
  'bulanan. Tidak ada kode produk yang menulis ke sini lagi; dipertahankan '
  'untuk audit riwayat sembilan pengguna pertama. Cara membacanya: '
  'docs/RUNBOOK-ADMIN.md.';

comment on table orders is
  'BEKU sejak 0027 (2026-08-28). Arsip pembelian kredit satuan yang tidak '
  'pernah terpakai (0 baris). Pembayaran langganan hidup di subscription_orders.';

/* ── 1. Status langganan per pengguna ────────────────────────────────────── */
-- Satu baris per pengguna, bukan satu baris per periode: yang ditanyakan
-- aplikasi ribuan kali sehari adalah "boleh masuk atau tidak", dan pertanyaan
-- itu harus dijawab satu pembacaan primary-key tanpa mengurutkan riwayat.
-- Riwayat pembayarannya sendiri hidup di `subscription_orders`.
create table if not exists subscriptions (
  user_id uuid primary key references users(id) on delete cascade,
  status text not null default 'tidak_aktif'
    check (status in ('masa_coba', 'aktif', 'tidak_aktif')),
  -- Kapan hak akses berakhir. NULL hanya sah untuk 'tidak_aktif'.
  berakhir_at timestamptz,
  sumber text check (sumber in ('trial', 'midtrans', 'manual')),
  -- Masa coba SEKALI SEUMUR AKUN. Disimpan terpisah dari `status` karena ia
  -- harus tetap benar setelah masa cobanya lewat — kalau tidak, keluar-masuk
  -- status akan menghadiahkan tujuh hari gratis berulang kali.
  coba_dipakai boolean not null default false,
  coba_mulai_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Hak akses tanpa tanggal berakhir adalah hak akses abadi yang tidak
  -- disengaja. Ditegakkan database, bukan kehati-hatian pemanggil.
  constraint langganan_aktif_wajib_bertanggal
    check (status = 'tidak_aktif' or berakhir_at is not null)
);

drop trigger if exists trg_subscriptions_updated on subscriptions;
create trigger trg_subscriptions_updated before update on subscriptions
  for each row execute function set_updated_at();

-- Dipakai penyapu kedaluwarsa harian; parsial supaya indeksnya hanya sebesar
-- jumlah pelanggan aktif, bukan sebesar tabel pengguna.
create index if not exists idx_subscriptions_berakhir
  on subscriptions (berakhir_at)
  where status <> 'tidak_aktif';

/* ── 2. Kuota wajar bulanan ──────────────────────────────────────────────── */
-- PAGAR ANTI-ABUSE, bukan angka yang dipamerkan. 30 riset + 60 konten per
-- bulan; pengguna normal tidak akan pernah menyentuhnya (produksi: pemakaian
-- riset tertinggi sepanjang hidup aplikasi = 4).
--
-- Bulan disimpan sebagai teks 'YYYY-MM' WIB, bukan dihitung dari created_at:
-- alasannya sama persis dengan `hari_wib` di 0024 — konversi zona waktu
-- bersifat STABLE dan tidak bisa diindeks, dan batas waktu WIB hanya boleh
-- punya satu definisi di aplikasi ini (lib/wib.ts).
create table if not exists premium_usage (
  user_id uuid not null references users(id) on delete cascade,
  bulan_wib text not null check (bulan_wib ~ '^\d{4}-\d{2}$'),
  riset int not null default 0,
  konten int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, bulan_wib)
);

/* ── 3. Pembayaran langganan ─────────────────────────────────────────────── */
-- Tabel BARU, bukan `orders` lama. `orders.credits` bersifat NOT NULL dan
-- tidak punya arti bagi langganan; mengisinya 0 hanya untuk memuaskan skema
-- akan menanam angka bohong di tabel uang.
create table if not exists subscription_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  periode_hari int not null default 30 check (periode_hari > 0),
  harga_idr integer not null check (harga_idr >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired')),
  -- Identitas pesanan di sisi Midtrans. UNIK: inilah kunci idempotensi
  -- webhook. Midtrans mengirim notifikasi yang sama berkali-kali, dan tanpa
  -- kunci ini satu pembayaran bisa memperpanjang langganan berulang kali.
  midtrans_order_id text unique,
  midtrans_status text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_subscription_orders_updated on subscription_orders;
create trigger trg_subscription_orders_updated before update on subscription_orders
  for each row execute function set_updated_at();

create index if not exists idx_subscription_orders_user
  on subscription_orders (user_id, created_at desc);

alter table subscriptions enable row level security;
alter table premium_usage enable row level security;
alter table subscription_orders enable row level security;

/* ── 4. Masa coba — sekali seumur akun ───────────────────────────────────── */
-- Mengembalikan baris status setelahnya, apa pun hasilnya, supaya pemanggil
-- tidak perlu membaca ulang. Bila masa coba sudah pernah dipakai, ia TIDAK
-- gagal — ia hanya tidak memberi apa-apa dan mengembalikan keadaan sekarang.
create or replace function langganan_mulai_coba(
  p_user uuid,
  p_hari int
) returns table (status text, berakhir_at timestamptz, coba_dipakai boolean)
language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  insert into subscriptions (user_id, status, berakhir_at, sumber,
                             coba_dipakai, coba_mulai_at)
  values (p_user, 'masa_coba', now() + make_interval(days => p_hari),
          'trial', true, now())
  on conflict (user_id) do nothing;

  return query
    select s.status, s.berakhir_at, s.coba_dipakai
      from subscriptions s where s.user_id = p_user;
end $$;

/* ── 5. Perpanjangan berbayar ────────────────────────────────────────────── */
-- Menambah dari SISA yang masih berjalan, bukan dari sekarang: pelanggan yang
-- membayar lebih awal tidak boleh kehilangan hari yang sudah dibayarnya.
create or replace function langganan_perpanjang(
  p_user uuid,
  p_hari int,
  p_sumber text
) returns timestamptz
language plpgsql as $$
declare
  v_mulai timestamptz;
  v_akhir timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  select greatest(coalesce(berakhir_at, now()), now()) into v_mulai
    from subscriptions where user_id = p_user;
  if v_mulai is null then v_mulai := now(); end if;

  v_akhir := v_mulai + make_interval(days => p_hari);

  insert into subscriptions (user_id, status, berakhir_at, sumber)
  values (p_user, 'aktif', v_akhir, p_sumber)
  on conflict (user_id) do update
    set status = 'aktif', berakhir_at = v_akhir, sumber = p_sumber;

  return v_akhir;
end $$;

/* ── 6. Pemakaian kuota — atomik ─────────────────────────────────────────── */
-- Menaikkan DAN memeriksa dalam satu langkah berkunci, bukan baca-lalu-tulis.
-- Mengembalikan sisa kuota setelah pemakaian, atau NULL bila batas sudah
-- terlampaui (pemanggil menerjemahkannya jadi 429 dengan kalimatnya sendiri).
create or replace function premium_pakai(
  p_user uuid,
  p_fitur text,
  p_bulan text,
  p_batas int
) returns int
language plpgsql as $$
declare
  v_terpakai int;
begin
  if p_fitur not in ('riset', 'konten') then
    raise exception 'fitur tidak dikenal: %', p_fitur;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));

  insert into premium_usage (user_id, bulan_wib) values (p_user, p_bulan)
  on conflict (user_id, bulan_wib) do nothing;

  select case when p_fitur = 'riset' then riset else konten end
    into v_terpakai
    from premium_usage where user_id = p_user and bulan_wib = p_bulan;

  if v_terpakai >= p_batas then
    return null;
  end if;

  update premium_usage
     set riset = riset + (case when p_fitur = 'riset' then 1 else 0 end),
         konten = konten + (case when p_fitur = 'konten' then 1 else 0 end),
         updated_at = now()
   where user_id = p_user and bulan_wib = p_bulan;

  return p_batas - v_terpakai - 1;
end $$;

/* ── 7. Penyapu kedaluwarsa ──────────────────────────────────────────────── */
-- Dipanggil cron harian. Status yang lewat tanggal diturunkan ke
-- 'tidak_aktif'; `coba_dipakai` TIDAK disentuh, sehingga masa coba tetap
-- sekali seumur akun setelah ia berakhir.
create or replace function langganan_sapu_kedaluwarsa()
returns int
language plpgsql as $$
declare v_jml int;
begin
  update subscriptions
     set status = 'tidak_aktif', berakhir_at = null
   where status <> 'tidak_aktif'
     and berakhir_at is not null
     and berakhir_at < now();
  get diagnostics v_jml = row_count;
  return v_jml;
end $$;

/* ── 8. Hak akses ────────────────────────────────────────────────────────── */
revoke all on function langganan_mulai_coba(uuid, int) from public;
revoke all on function langganan_perpanjang(uuid, int, text) from public;
revoke all on function premium_pakai(uuid, text, text, int) from public;
revoke all on function langganan_sapu_kedaluwarsa() from public;
grant execute on function langganan_mulai_coba(uuid, int) to service_role;
grant execute on function langganan_perpanjang(uuid, int, text) to service_role;
grant execute on function premium_pakai(uuid, text, text, int) to service_role;
grant execute on function langganan_sapu_kedaluwarsa() to service_role;
