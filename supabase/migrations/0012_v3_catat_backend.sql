-- 0012 · v3.0 Tahap 1 — backend pencatatan: taksonomi transaksi, draft tanpa
-- nominal, dan rollup harian via TRIGGER (§7.2, §9.2, §10).

/* ── Taksonomi kategori transaksi (§10 "perluasan dari 9 kategori v2.0") ─── */
-- `transactions.kategori_id` menunjuk `categories`; tabel itu baru berisi 9
-- kategori USAHA v2.0 (kuliner, fashion, …). Slug taksonomi TRANSAKSI §10
-- ditambahkan di sini. `jasa` dan `lainnya` sudah ada dari seed v2.0 dan
-- sengaja DIPAKAI ULANG (slug unik); makna barisnya kompatibel di kedua peran.
insert into categories (nama, slug) values
  ('Penjualan','penjualan'),
  ('Ojek','ojek'),
  ('Komisi','komisi'),
  ('Bahan baku','bahan_baku'),
  ('Operasional','operasional'),
  ('Gaji','gaji'),
  ('Transportasi','transportasi'),
  ('Peralatan','peralatan'),
  ('Pemasaran','pemasaran'),
  ('Pribadi','pribadi')
on conflict (slug) do nothing;

/* ── Draft tanpa nominal (§7.2 alur #6) ──────────────────────────────────── */
-- "beli beras" (tanpa angka) harus tersimpan sebagai draft sampai pertanyaan
-- nominal terjawab. Constraint lama `amount > 0 NOT NULL` menolak baris itu.
-- Aturan baru: amount boleh NULL HANYA saat status='draft'; baris confirmed
-- tetap wajib punya nominal positif — laporan tidak pernah menjumlah NULL.
alter table transactions alter column amount drop not null;
alter table transactions drop constraint if exists transactions_amount_check;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_amount_check'
  ) then
    alter table transactions add constraint transactions_amount_check
      check ((amount is not null and amount > 0) or status = 'draft');
  end if;
end $$;

/* ── daily_rollups via TRIGGER, bukan job (§10 "trigger atau job") ───────── */
-- KEPUTUSAN: trigger. Alasan:
--   1. Stack ini tidak punya worker/cron (Next.js route serverless saja) —
--      job terjadwal berarti infrastruktur baru + jendela data basi.
--   2. Jalur tulis transaksi ada BANYAK (catat, konfirmasi draft, edit, hapus,
--      sinkron offline). Satu trigger di tabel menjamin rollup tidak pernah
--      tertinggal oleh jalur API yang lupa memanggil update — kebenaran
--      laporan (§12 integritas angka) tidak boleh bergantung pada disiplin
--      pemanggil.
--   3. Beban tulisnya O(1) upsert per mutasi — jauh di bawah target §12.
-- Delta-based: hanya baris status='confirmed' yang dihitung. Draft masuk
-- hitungan SAAT dikonfirmasi (transisi status ditangani cabang UPDATE).
-- Tanggal rollup = tanggal WIB dari occurred_at (§17.2 timezone WIB).

create or replace function rollup_delta(
  p_user uuid, p_occurred timestamptz, p_jenis text,
  p_amount bigint, p_method text, p_sign int
) returns void language plpgsql as $$
declare
  d date := (p_occurred at time zone 'Asia/Jakarta')::date;
  v_masuk bigint := case when p_jenis = 'masuk' then p_amount else 0 end;
  v_keluar bigint := case when p_jenis = 'keluar' then p_amount else 0 end;
  v_verif bigint := case
    when p_jenis = 'masuk' and p_method <> 'tunai' then p_amount else 0 end;
begin
  insert into daily_rollups
    (user_id, tanggal, total_masuk, total_keluar, jml_transaksi,
     masuk_terverifikasi, updated_at)
  values
    (p_user, d, p_sign * v_masuk, p_sign * v_keluar, p_sign,
     p_sign * v_verif, now())
  on conflict (user_id, tanggal) do update set
    total_masuk = daily_rollups.total_masuk + excluded.total_masuk,
    total_keluar = daily_rollups.total_keluar + excluded.total_keluar,
    jml_transaksi = daily_rollups.jml_transaksi + excluded.jml_transaksi,
    masuk_terverifikasi =
      daily_rollups.masuk_terverifikasi + excluded.masuk_terverifikasi,
    updated_at = now();
end $$;

create or replace function trg_transactions_rollup() returns trigger
language plpgsql as $$
begin
  -- Baris dihitung bila confirmed DAN bernominal (draft/deleted tidak).
  if tg_op in ('UPDATE','DELETE')
     and old.status = 'confirmed' and old.amount is not null then
    perform rollup_delta(old.user_id, old.occurred_at, old.jenis,
                         old.amount, old.payment_method, -1);
  end if;
  if tg_op in ('INSERT','UPDATE')
     and new.status = 'confirmed' and new.amount is not null then
    perform rollup_delta(new.user_id, new.occurred_at, new.jenis,
                         new.amount, new.payment_method, +1);
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_transactions_rollup on transactions;
create trigger trg_transactions_rollup
  after insert or update or delete on transactions
  for each row execute function trg_transactions_rollup();
