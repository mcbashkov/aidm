-- 0010 · Fungsi pencarian vektor untuk cache & korpus (§7.2 / §9.2)
-- Dipanggil server via RPC (service-role). Cosine distance (<=>).

-- Cek cache: hasil riset serupa < max_age_days (lintas user; hanya body yang
-- disajikan — identitas penanya tidak pernah ikut).
create or replace function match_research_results(
  query_embedding vector(1536),
  match_count int default 1,
  max_age_days int default 7,
  min_similarity float default 0.85
)
returns table (
  id uuid,
  summary text,
  body jsonb,
  sources jsonb,
  confidence smallint,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select r.id, r.summary, r.body, r.sources, r.confidence, r.created_at,
         1 - (r.embedding <=> query_embedding) as similarity
  from research_results r
  where r.embedding is not null
    and r.created_at > now() - make_interval(days => max_age_days)
    and 1 - (r.embedding <=> query_embedding) >= min_similarity
  order by r.embedding <=> query_embedding
  limit match_count;
$$;

-- Tool corpus_search milik agen (§9.3 #5): cari korpus tren internal.
create or replace function match_trend_corpus(
  query_embedding vector(1536),
  match_count int default 5,
  max_age_days int default 7
)
returns table (
  id uuid,
  topik text,
  ringkas text,
  kota text,
  sub_kategori text,
  confidence smallint,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select c.id, c.topik, c.ringkas, c.kota, c.sub_kategori, c.confidence,
         c.created_at, 1 - (c.embedding <=> query_embedding) as similarity
  from trend_corpus c
  where c.embedding is not null
    and c.created_at > now() - make_interval(days => max_age_days)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
