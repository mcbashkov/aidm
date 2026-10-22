-- 0035 · Berkas Pengajuan, premium_events, dan kode produk pesanan (Batch 5)
--
-- Tiga hal, semuanya aditif dan idempoten, tanpa DROP:
--
--   1. `berkas_pengajuan` — satu baris per dokumen premium "Berkas Pengajuan"
--      (6 atau 12 bulan; PERINTAH-AGEN-PREMIUM §1.5). PDF-nya disimpan di
--      bucket privat Supabase Storage `berkas`, hash SHA-256 byte PDF-nya
--      dinotarisasi ke kontrak ReportAttestation yang sudah ada (HASH SAJA —
--      tidak ada angka keuangan yang pernah menyentuh rantai). `kode_verifikasi`
--      12 karakter (bukan UUID) dicetak di sampul dan menjadi URL publik
--      /verifikasi/<kode>, yang hanya membuka (wallet, periodKey) untuk
--      verifikasi hash — tanpa data keuangan.
--   2. `premium_events` — jejak pratinjau/klik/bayar per peran. Harga §1.1
--      adalah inferensi pasar yang belum diuji; tabel ini yang membuat
--      konversi per earner_type terbaca SEBELUM harga diubah.
--   3. `subscription_orders.kode` — produk yang dibeli (`plus | berkas6 |
--      berkas12 | pajak`). NULL = pesanan lama 30 hari, tetap sah: webhook
--      lama tidak pernah mengenal kode, dan baris lama tidak diubah.
--
-- Bucket Storage dibuat di sini pula, dijaga "hanya bila skema `storage`
-- ada": di Postgres sekali pakai (uji migrasi) skema itu tidak ada dan blok
-- ini dilewati; di Supabase ia membuat bucket privat `berkas` sekali.
--
-- Tidak ada fungsi baru → tidak ada grant; default privileges 0033 berlaku.

/* ── 1. berkas_pengajuan ─────────────────────────────────────────────────── */
create table if not exists berkas_pengajuan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kode text not null check (kode in ('berkas6', 'berkas12')),
  periode_awal date not null,                -- bulan pertama (tanggal 1)
  periode_akhir date not null,               -- bulan terakhir (tanggal 1)
  nomor_dokumen text not null unique,        -- BK-YYYYMM-xxxxx
  kode_verifikasi text not null unique
    check (char_length(kode_verifikasi) = 12),
  -- NULL = dibuat lewat AIDM Plus (tanpa bayar per dokumen). set null, bukan
  -- cascade: catatan pembayaran bertahan lebih lama daripada dokumennya.
  order_id uuid references subscription_orders(id) on delete set null,
  path_pdf text,                             -- path di bucket `berkas`
  sha256 text,                               -- hex, atas byte PDF
  tx_hash text,
  status text not null default 'menunggu_bayar'
    check (status in ('menunggu_bayar', 'dibuat', 'pending_segel', 'confirmed', 'gagal')),
  -- Render yang gagal sesudah bayar dicoba ulang cron pemeliharaan, maks 3×.
  percobaan int not null default 0,
  galat text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint berkas_periode_check check (periode_akhir >= periode_awal)
);

comment on table berkas_pengajuan is
  'Dokumen premium "Berkas Pengajuan" (6/12 bulan). PDF di bucket privat '
  '`berkas`; sha256 byte PDF dinotarisasi ke ReportAttestation (hash saja). '
  'Lihat migrasi 0035 dan PERINTAH-AGEN-PREMIUM §1.5.';

do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'trg_berkas_pengajuan_updated' and tgrelid = 'berkas_pengajuan'::regclass
  ) then
    create trigger trg_berkas_pengajuan_updated before update on berkas_pengajuan
      for each row execute function set_updated_at();
  end if;
end $$;

create index if not exists idx_berkas_user_waktu
  on berkas_pengajuan (user_id, created_at desc);
-- Cron: render gagal yang masih boleh dicoba, dan segel yang menggantung.
create index if not exists idx_berkas_status_tindak
  on berkas_pengajuan (status, updated_at)
  where status in ('gagal', 'pending_segel', 'dibuat');

alter table berkas_pengajuan enable row level security;

/* ── 2. premium_events ───────────────────────────────────────────────────── */
create table if not exists premium_events (
  id bigint generated always as identity primary key,
  -- cascade: jejak klik bukan catatan keuangan; ikut hilang bersama akun (PDP).
  user_id uuid references users(id) on delete cascade,
  earner_type text,
  kode text not null check (kode in ('plus', 'berkas6', 'berkas12', 'pajak')),
  aksi text not null check (aksi in ('lihat_pratinjau', 'klik_beli', 'bayar_sukses')),
  harga_idr integer not null check (harga_idr >= 0),
  created_at timestamptz not null default now()
);

comment on table premium_events is
  'Jejak pratinjau/klik/bayar per peran. Harga adalah inferensi pasar yang '
  'belum diuji; tabel ini membuat konversi per earner_type terbaca sebelum '
  'harga diubah (PERINTAH-AGEN-PREMIUM §1.1). 0035.';

create index if not exists idx_premium_events_kode_aksi
  on premium_events (kode, aksi, created_at desc);

alter table premium_events enable row level security;

/* ── 3. subscription_orders.kode ─────────────────────────────────────────── */
alter table subscription_orders add column if not exists kode text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subscription_orders_kode_check'
  ) then
    alter table subscription_orders add constraint subscription_orders_kode_check
      check (kode is null or kode in ('plus', 'berkas6', 'berkas12', 'pajak'));
  end if;
end $$;

comment on column subscription_orders.kode is
  'Produk yang dibeli (katalog lib/langganan/katalog.ts). NULL = pesanan lama '
  '30 hari sebelum 0035; perilakunya tidak berubah.';

/* ── 4. Bucket privat `berkas` (hanya di Supabase) ───────────────────────── */
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage')
     and exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'buckets') then
    insert into storage.buckets (id, name, public)
    values ('berkas', 'berkas', false)
    on conflict (id) do nothing;
  end if;
end $$;
