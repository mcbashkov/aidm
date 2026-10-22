-- 0037 · Batas laju proxy RPC same-origin (PERINTAH-AGEN-PREMIUM §Batch 8)
--
-- POST /api/rpc/<chain> meneruskan JSON-RPC browser ke penyedia RPC, dengan
-- kunci penyedia berbayar yang tidak pernah sampai ke klien. Tanpa batas laju,
-- rute itu adalah RPC gratis untuk siapa saja. Polanya mengikuti
-- `catat_rate_inc` (0028): jendela TETAP, satu baris per kunci, reset di dalam
-- UPSERT yang sama — satu perjalanan, satu baris terkunci, tanpa celah
-- baca-lalu-tulis.
--
-- Kunci = 'uid:<uuid>' untuk pemanggil bersesi, 'ip:<alamat>' untuk yang
-- tidak (dompet Privy memanggil RPC sebelum/selepas sesi aplikasi terbentuk).
-- Satu permintaan batch bernilai sebanyak isinya (`p_tambah`), bukan 1.
--
-- Tabel sendiri, bukan menumpang `catat_kuota`: kuncinya bukan (user, hari),
-- dan pemanggil tanpa sesi tidak punya user_id.
--
-- Idempoten, tanpa DROP pada objek yang ada.

create table if not exists rpc_rate (
  kunci         text primary key,
  jendela_mulai timestamptz not null default now(),
  jml           int not null default 0,
  updated_at    timestamptz not null default now()
);

alter table rpc_rate enable row level security;

create index if not exists rpc_rate_updated_idx on rpc_rate (updated_at);

/**
 * Naikkan penghitung jendela untuk satu kunci dan kembalikan nilainya SETELAH
 * kenaikan. Jendela yang sudah lewat direset di dalam UPSERT yang sama.
 */
create or replace function rpc_rate_inc(
  p_kunci text,
  p_jendela_detik int,
  p_tambah int
) returns int
language plpgsql as $$
declare v int;
begin
  insert into rpc_rate (kunci, jendela_mulai, jml, updated_at)
  values (p_kunci, now(), greatest(p_tambah, 1), now())
  on conflict (kunci) do update
    set jendela_mulai = case
          when rpc_rate.jendela_mulai
               < now() - make_interval(secs => p_jendela_detik)
          then now()
          else rpc_rate.jendela_mulai
        end,
        jml = case
          when rpc_rate.jendela_mulai
               < now() - make_interval(secs => p_jendela_detik)
          then greatest(p_tambah, 1)
          else rpc_rate.jml + greatest(p_tambah, 1)
        end,
        updated_at = now()
  returning rpc_rate.jml into v;
  return v;
end $$;

revoke all on function rpc_rate_inc(text, int, int) from public;
grant execute on function rpc_rate_inc(text, int, int) to service_role;

/** Sapu baris yang tidak tersentuh selama p_umur_detik (cron pemeliharaan). */
create or replace function rpc_rate_sapu(p_umur_detik int) returns int
language plpgsql as $$
declare n int;
begin
  delete from rpc_rate
   where updated_at < now() - make_interval(secs => p_umur_detik);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function rpc_rate_sapu(int) from public;
grant execute on function rpc_rate_sapu(int) to service_role;
