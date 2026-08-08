-- 0003 · Kredit AI (ledger append-only) & pembelian (uang saja) (§7.5 / §10)

-- Ledger kredit — saldo = SUM(amount). Tidak pernah di-update/hapus (append-only).
create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount int not null,                 -- (+) kredit masuk, (-) terpakai
  reason text not null check (reason in (
    'daily_free','purchase_fiat','purchase_iap',
    'research','research_cache','wizard','content','refund','admin_adjust'
  )),
  ref_id uuid,                         -- id order/query terkait
  balance_after int,                   -- denormalisasi untuk baca cepat
  created_at timestamptz not null default now()
);

-- Pembelian kredit dengan uang (QRIS/VA di web · IAP store di native).
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  channel text not null check (channel in ('qris','va','iap_google','iap_apple')),
  paket text,
  credits int not null,
  fiat_amount numeric,
  pg_reference text,                   -- ref payment gateway
  store_receipt text,                  -- purchase token / receipt store
  status text not null default 'pending'
    check (status in ('pending','paid','failed','expired','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_orders_updated on orders;
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();
