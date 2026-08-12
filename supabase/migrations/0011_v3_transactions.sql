-- 0011 · v3.0 — Pencatatan keuangan: transaksi, rollup harian, segel laporan (§10)
--
-- Pivot v3.0: jantung produk pindah dari riset pasar ke pencatatan keuangan.
-- Migrasi ini HANYA menambah; tabel v2.0 (0001–0010) tidak disentuh sama sekali
-- supaya build lama tetap jalan (§0 "build frontend yang sudah ada dipertahankan").

/* ── users: peran penghasilan + nama usaha (§7.1 / §10) ──────────────────── */
-- Kolom lama `role` ('calon','umkm') sengaja DIPERTAHANKAN untuk kompatibilitas
-- data v2.0; tidak dipakai lagi di UI, digantikan earner_type.
alter table users add column if not exists earner_type text;
alter table users add column if not exists nama_usaha text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_earner_type_check'
  ) then
    alter table users add constraint users_earner_type_check
      check (earner_type in ('dagang','ojol','freelance','online','lainnya'));
  end if;
end $$;

/* ── transactions — tabel INTI v3.0 (§10) ────────────────────────────────── */
-- amount = rupiah INTEGER (bigint). DILARANG float untuk uang (§12 integritas
-- angka): float memperkenalkan galat pembulatan yang merusak laporan keuangan.
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  jenis text not null check (jenis in ('masuk','keluar')),
  amount bigint not null check (amount > 0),
  kategori_id uuid references categories(id) on delete set null,
  sub_kategori text,
  payment_method text not null default 'tunai'
    check (payment_method in ('tunai','qris','transfer','ewallet')),
  catatan text,                              -- potongan teks yang jadi entri ini
  occurred_at timestamptz not null default now(),  -- kapan transaksi terjadi
  source text not null default 'chat'
    check (source in ('chat','voice','manual','import','ocr')),
  parsed_by text not null default 'llm'
    check (parsed_by in ('llm','fallback','manual')),
  raw_input text,                            -- kalimat utuh pengguna (audit parser)
  status text not null default 'confirmed'
    check (status in ('confirmed','draft','deleted')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_transactions_updated on transactions;
create trigger trg_transactions_updated before update on transactions
  for each row execute function set_updated_at();

/* ── daily_rollups — mempercepat laporan (§9.3 / §10) ────────────────────── */
-- Agregat harian per user supaya layar Laporan tidak memindai seluruh baris
-- transaksi (target §12: p90 ≤ 1,5 dtk pada 5.000 transaksi).
create table if not exists daily_rollups (
  user_id uuid not null references users(id) on delete cascade,
  tanggal date not null,
  total_masuk bigint not null default 0,
  total_keluar bigint not null default 0,
  jml_transaksi int not null default 0,
  masuk_terverifikasi bigint not null default 0,  -- nilai masuk via qris/transfer/ewallet
  updated_at timestamptz not null default now(),
  primary key (user_id, tanggal)
);

/* ── report_seals — segel laporan on-chain (§7.5 / §10) ──────────────────── */
-- HANYA hash yang ditulis ke opBNB. canonical_json disimpan di sini (bukan di
-- chain) supaya laporan bisa diverifikasi ulang tanpa membocorkan angka ke
-- rantai publik yang permanen (§7.5 alasan mengikat).
create table if not exists report_seals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  period_key text not null,                  -- '2026-08' | '2026-Q3' | rentang khusus
  report_hash text not null,                 -- hex sha256
  canonical_json jsonb,
  tx_hash text,
  sealed_at timestamptz,
  is_latest boolean not null default true,
  status text not null default 'pending'
    check (status in ('pending','confirmed','failed')),
  created_at timestamptz not null default now()
);

/* ── Indeks (§10 "indeks penting") ───────────────────────────────────────── */
create index if not exists idx_transactions_user_time
  on transactions (user_id, occurred_at desc);
create index if not exists idx_transactions_user_jenis_time
  on transactions (user_id, jenis, occurred_at);
create index if not exists idx_transactions_user_kategori
  on transactions (user_id, kategori_id);
-- Daftar & laporan selalu menyaring baris terhapus; indeks parsial jauh lebih
-- kecil daripada indeks penuh karena hanya memuat baris yang benar-benar dibaca.
create index if not exists idx_transactions_user_aktif
  on transactions (user_id, occurred_at desc)
  where status <> 'deleted';

create index if not exists idx_daily_rollups_user_tanggal
  on daily_rollups (user_id, tanggal desc);

create index if not exists idx_report_seals_user_period
  on report_seals (user_id, period_key, is_latest);

/* ── RLS — strategi sama seperti 0008 ────────────────────────────────────── */
-- Tulis/baca dilakukan server memakai service-role dengan otorisasi identitas
-- Privy di lapisan API; klien anon/authenticated ditolak default. Data keuangan
-- adalah data pribadi bernilai tinggi (§12 privasi diperketat).
alter table transactions enable row level security;
alter table daily_rollups enable row level security;
alter table report_seals enable row level security;
