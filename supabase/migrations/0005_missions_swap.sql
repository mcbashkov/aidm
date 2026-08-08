-- 0005 · Misi & reward IDMX, tukar IDMX→IDM, withdraw (§7.6 / §7.7 / §7.9 / §10)

create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  judul text not null,
  deskripsi text,
  reward_idmx numeric not null default 0,
  tipe text not null check (tipe in ('daily','weekly','once')),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists mission_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  mission_id uuid not null references missions(id) on delete cascade,
  progress jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Klaim misi: pola voucher signed (user, missionId, amount, nonce, deadline).
create table if not exists mission_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  mission_id uuid not null references missions(id) on delete cascade,
  amount_idmx numeric not null,
  nonce bigint not null,
  signature text,
  tx_hash text,
  status text not null default 'signed'
    check (status in ('signed','submitted','confirmed','failed')),
  created_at timestamptz not null default now(),
  unique (user_id, mission_id, nonce)
);

-- Tukar IDMX → IDM Reborn (satu arah, kurs sistem) (§7.7).
create table if not exists swaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount_idmx numeric not null,
  amount_idm numeric not null,
  rate numeric not null,
  tx_hash text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','failed')),
  created_at timestamptz not null default now()
);

-- Kirim IDM Reborn ke wallet eksternal tertaut (gas dibayar user, cap harian) (§7.9).
create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  to_address text not null,
  amount_idm numeric not null,
  tx_hash text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','failed')),
  created_at timestamptz not null default now()
);
