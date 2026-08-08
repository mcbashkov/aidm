-- 0009 · Seed data awal (kategori, parameter §8, misi §7.6)

insert into categories (nama, slug) values
  ('Kuliner','kuliner'),
  ('Fashion','fashion'),
  ('Kecantikan','kecantikan'),
  ('Kriya','kriya'),
  ('Agri/Fresh','agri-fresh'),
  ('Jasa','jasa'),
  ('Digital','digital'),
  ('Kelontong/Retail','kelontong-retail'),
  ('Lainnya','lainnya')
on conflict (slug) do nothing;

-- Parameter aplikasi (§8.2 / §8.3) — configurable admin tanpa deploy
insert into app_config (key, value) values
  ('credits', '{"daily_free":10,"research":3,"research_cache":1,"wizard":3,"content":1,"content_regen_max":3,"review_mining":5}'::jsonb),
  ('credit_packages', '[{"sku":"c50","credits":50,"price_idr":15000},{"sku":"c200","credits":200,"price_idr":49000},{"sku":"c500","credits":500,"price_idr":99000}]'::jsonb),
  ('rewards', '{"daily_cap_idmx":250}'::jsonb),
  ('swap', '{"min_idmx":1000,"daily_cap_idmx":100000,"pool_treatment":"burn"}'::jsonb),
  ('agent', '{"max_tool_calls":6,"research_timeout_s":120,"cache_max_age_days":7}'::jsonb),
  ('chain', '{"default":"opbnb","mainnet_chain_id":204,"testnet_chain_id":5611}'::jsonb)
on conflict (key) do nothing;

-- Misi default (§7.6) — angka reward configurable, total harian ≤ 250 IDMX
insert into missions (code, judul, deskripsi, reward_idmx, tipe) values
  ('first_research_today','Riset pertama hari ini','Lakukan 1 riset hari ini',20,'daily'),
  ('three_research_today','3 riset dalam sehari','Selesaikan 3 riset hari ini',50,'daily'),
  ('share_result_card','Bagikan kartu hasil','Bagikan 1 kartu hasil riset',30,'daily'),
  ('login_streak_7','Login 7 hari beruntun','Masuk 7 hari berturut-turut',100,'weekly'),
  ('complete_profile','Lengkapi profil usaha','Isi kategori & kota usaha',50,'once')
on conflict (code) do nothing;
