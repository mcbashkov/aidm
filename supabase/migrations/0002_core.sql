-- 0002 · Pengguna, profil, wallet, kategori (§10)

-- Taksonomi tetap 9 kategori + sub (§7.1)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  slug text not null unique,
  parent_id uuid references categories(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Pengguna & profil. Identitas dari Privy (privy_did).
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  privy_did text unique,                       -- did:privy:...
  auth_provider text,                          -- email | sms | google
  email text,
  phone text,
  role text check (role in ('calon','umkm')),
  kategori_id uuid references categories(id) on delete set null,
  sub_kategori text,
  kota text,
  provinsi text,
  status text not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_users_updated on users;
create trigger trg_users_updated before update on users
  for each row execute function set_updated_at();

-- Wallet embedded (Privy) — punya akun = punya wallet (§7.1).
-- chain_default = 'opbnb': jaringan default AIDM sudah difinalkan ke opBNB (§16 #9).
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  address text not null unique,
  provider text not null default 'privy',
  chain_default text not null default 'opbnb',
  external_address text,
  external_linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_wallets_updated on wallets;
create trigger trg_wallets_updated before update on wallets
  for each row execute function set_updated_at();
