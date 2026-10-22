-- 0039 · Rekap ojol per platform & biaya kendaraan (PERINTAH-AGEN-PREMIUM §Batch 10)
--
-- Dua fungsi baca-saja di atas `transactions` (confirmed, tanggal WIB), untuk
-- Laporan peran ojol dan tabel per platform di Berkas Pengajuan:
--
--   laporan_ojol_platform  — pemasukan kategori `ojek` per bulan per platform
--                            (`sub_kategori`: gojek|grab|maxim|indrive|
--                            shopeefood|lainnya; NULL = platform tidak disebut).
--   laporan_ojol_kendaraan — pengeluaran kendaraan per bulan per sub
--                            (bbm|servis|cicilan|sewa|kuota|parkir).
--
-- TANPA kolom/tabel baru: `transactions.sub_kategori` sudah ada (0011).
-- Pola grant mengikuti 0028/0033: hanya service_role.

create or replace function laporan_ojol_platform(
  p_user uuid,
  p_start timestamptz default null,
  p_end timestamptz default null
) returns table (bulan text, platform text, total bigint, jml int)
language sql stable as $$
  select to_char(t.occurred_at at time zone 'Asia/Jakarta', 'YYYY-MM') as bulan,
         t.sub_kategori as platform,
         sum(t.amount)::bigint as total,
         count(*)::int as jml
  from transactions t
  join categories c on c.id = t.kategori_id
  where t.user_id = p_user
    and t.status = 'confirmed'
    and t.amount is not null
    and t.jenis = 'masuk'
    and c.slug = 'ojek'
    and (p_start is null or t.occurred_at >= p_start)
    and (p_end is null or t.occurred_at < p_end)
  group by 1, 2
  order by 1, 2
$$;

create or replace function laporan_ojol_kendaraan(
  p_user uuid,
  p_start timestamptz default null,
  p_end timestamptz default null
) returns table (bulan text, sub text, total bigint, jml int)
language sql stable as $$
  select to_char(t.occurred_at at time zone 'Asia/Jakarta', 'YYYY-MM') as bulan,
         t.sub_kategori as sub,
         sum(t.amount)::bigint as total,
         count(*)::int as jml
  from transactions t
  where t.user_id = p_user
    and t.status = 'confirmed'
    and t.amount is not null
    and t.jenis = 'keluar'
    and t.sub_kategori in ('bbm', 'servis', 'cicilan', 'sewa', 'kuota', 'parkir')
    and (p_start is null or t.occurred_at >= p_start)
    and (p_end is null or t.occurred_at < p_end)
  group by 1, 2
  order by 1, 2
$$;

revoke all on function laporan_ojol_platform(uuid, timestamptz, timestamptz) from public;
grant execute on function laporan_ojol_platform(uuid, timestamptz, timestamptz) to service_role;
revoke all on function laporan_ojol_kendaraan(uuid, timestamptz, timestamptz) from public;
grant execute on function laporan_ojol_kendaraan(uuid, timestamptz, timestamptz) to service_role;
