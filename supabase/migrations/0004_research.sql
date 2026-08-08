-- 0004 · Riset, hasil, korpus tren, konten (§7.2 / §7.8 / §10)

create table if not exists research_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  mode text not null check (mode in ('chat','wizard')),
  input_text text,
  kategori_id uuid references categories(id) on delete set null,
  kota text,
  status text not null default 'queued'
    check (status in ('queued','running','done','failed','refunded')),
  credits_charged int not null default 0,
  cache_hit boolean not null default false,
  latency_ms int,
  created_at timestamptz not null default now()
);

create table if not exists research_results (
  id uuid primary key default gen_random_uuid(),
  query_id uuid not null references research_queries(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  summary text,
  body jsonb,                          -- skema §17
  sources jsonb,                       -- [{tool, url?, fetched_at, note}]
  confidence smallint check (confidence between 1 and 3),
  embedding vector(768),               -- Gemini text-embedding-004 (§9.1)
  created_at timestamptz not null default now()
);

-- Korpus tren: ANONIM (tanpa user_id) — aset data jangka panjang (§7.8 / §12 privasi).
create table if not exists trend_corpus (
  id uuid primary key default gen_random_uuid(),
  result_id uuid references research_results(id) on delete set null,
  kategori_id uuid references categories(id) on delete set null,
  sub_kategori text,
  kota text,
  topik text,
  ringkas text,
  sources jsonb,
  confidence smallint check (confidence between 1 and 3),
  embedding vector(768),               -- Gemini text-embedding-004 (§9.1)
  expires_hint date,
  created_at timestamptz not null default now()
);

create table if not exists content_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source_result_id uuid references research_results(id) on delete set null,
  format text not null
    check (format in ('tiktok_script','ig_caption','promo_copy','calendar7')),
  input jsonb,
  output jsonb,
  credits_charged int not null default 0,
  created_at timestamptz not null default now()
);
