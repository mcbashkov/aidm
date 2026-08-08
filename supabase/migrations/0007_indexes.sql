-- 0007 · Indeks (§10)

create index if not exists idx_credit_ledger_user_created
  on credit_ledger (user_id, created_at desc);
create index if not exists idx_orders_status on orders (status);
create index if not exists idx_research_queries_user_created
  on research_queries (user_id, created_at desc);
create index if not exists idx_trend_corpus_kat_kota_created
  on trend_corpus (kategori_id, kota, created_at desc);
create index if not exists idx_swaps_user_created
  on swaps (user_id, created_at desc);
create index if not exists idx_withdrawals_user_created
  on withdrawals (user_id, created_at desc);
create index if not exists idx_content_user_created
  on content_generations (user_id, created_at desc);
create unique index if not exists uq_mission_claims_nonce
  on mission_claims (user_id, mission_id, nonce);

-- Pencarian vektor (cosine). Untuk dataset besar, tuning `lists` sesuai jumlah baris.
create index if not exists idx_research_results_embedding
  on research_results using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_trend_corpus_embedding
  on trend_corpus using ivfflat (embedding vector_cosine_ops) with (lists = 100);
