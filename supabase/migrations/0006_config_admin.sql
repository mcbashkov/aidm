-- 0006 · Konfigurasi & admin (§10)

-- Semua parameter §8 disimpan di sini (dapat diubah admin tanpa deploy).
create table if not exists app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_app_config_updated on app_config;
create trigger trg_app_config_updated before update on app_config
  for each row execute function set_updated_at();

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  level text not null default 'admin',
  created_at timestamptz not null default now()
);
