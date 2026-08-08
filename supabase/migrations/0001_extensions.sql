-- 0001 · Ekstensi & util
-- pgvector untuk embedding (korpus tren & hasil riset). gen_random_uuid()
-- sudah tersedia di core PostgreSQL 13+ (Supabase PG15+), tanpa ekstensi tambahan.
create extension if not exists vector;

-- Fungsi util: set updated_at otomatis pada UPDATE.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
