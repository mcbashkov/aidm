-- 0008 · Row Level Security (§10 / §12)
--
-- Strategi M0: tulis/baca data user dilakukan server memakai service-role
-- (bypass RLS) dengan otorisasi identitas Privy di lapisan API. Klien anon/
-- authenticated DITOLAK default, kecuali data publik (categories, missions).
-- Saat bridging Privy→Supabase JWT diterapkan, tambahkan policy berbasis
-- (auth.jwt()->>'sub' = users.privy_did).

alter table users enable row level security;
alter table wallets enable row level security;
alter table categories enable row level security;
alter table credit_ledger enable row level security;
alter table orders enable row level security;
alter table research_queries enable row level security;
alter table research_results enable row level security;
alter table trend_corpus enable row level security;
alter table content_generations enable row level security;
alter table missions enable row level security;
alter table mission_events enable row level security;
alter table mission_claims enable row level security;
alter table swaps enable row level security;
alter table withdrawals enable row level security;
alter table app_config enable row level security;
alter table admin_users enable row level security;

-- Data publik (boleh dibaca tanpa login)
drop policy if exists categories_public_read on categories;
create policy categories_public_read on categories
  for select to anon, authenticated using (true);

drop policy if exists missions_public_read on missions;
create policy missions_public_read on missions
  for select to anon, authenticated using (aktif = true);
