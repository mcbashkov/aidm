-- 0032 · Misi tidak menghitung transaksi pelunasan kasbon (Batch 2)
--
-- Batas yang disepakati untuk Batch 2: tidak ada misi atau reward IDMX untuk
-- tindakan kasbon. Klaim misi berakhir di rantai, dan jejak apa pun yang
-- diturunkan dari pola kasbon seseorang tidak boleh sampai ke sana.
--
-- Celahnya bukan di tabel kasbon — `misi_sinyal_harian` tidak pernah
-- membacanya — melainkan di baris transaksi yang dibuat `kasbon_lunasi`
-- (0031) saat pengguna memilih "Catat pembayarannya sekarang". Baris itu
-- transaksi `confirmed` biasa, jadi tanpa migrasi ini setiap ketukan "Tandai
-- lunas" menambah satu ke progres misi harian: hadiah untuk satu ketukan,
-- tanpa satu kalimat pun dicatat.
--
-- Pelunasan yang DIUCAPKAN di Catat ("Bu Ani bayar kasbon 45rb") tetap
-- dihitung — itu kalimat yang dicatat pengguna, persis seperti sebelum kasbon
-- ada. Yang dikecualikan hanya baris yang ditunjuk `kasbon.transaction_id`.
--
-- Isi fungsi SAMA PERSIS dengan 0023 kecuali satu predikat `not exists` di
-- CTE `valid`. Tanpa baris kasbon (seluruh data hari ini), hasilnya identik —
-- progres misi lama tidak bergeser satu pun. Butuh 0031 (tabel kasbon).

create or replace function misi_sinyal_harian(
  p_user uuid,
  p_start date default null,
  p_end date default null
) returns table (tanggal date, jml int, ada_masuk boolean, ada_keluar boolean, jml_suara int)
language sql stable as $$
  with valid as (
    select
      (t.created_at at time zone 'Asia/Jakarta')::date as tanggal,
      t.created_at,
      t.jenis,
      t.source,
      lag(t.created_at) over (
        partition by
          t.amount, t.jenis,
          coalesce(t.kategori_id, '00000000-0000-0000-0000-000000000000'::uuid)
        order by t.created_at
      ) as kembar_sebelumnya
    from transactions t
    where t.user_id = p_user
      and t.status = 'confirmed'
      and t.amount is not null
      and t.amount > 0
      -- 0032: transaksi pelunasan dari "Tandai lunas" bukan kalimat yang
      -- dicatat pengguna, jadi bukan bahan misi.
      and not exists (
        select 1 from kasbon k where k.transaction_id = t.id
      )
  )
  select
    tanggal,
    count(*)::int as jml,
    bool_or(jenis = 'masuk') as ada_masuk,
    bool_or(jenis = 'keluar') as ada_keluar,
    count(*) filter (where source = 'voice')::int as jml_suara
  from valid
  where (kembar_sebelumnya is null
         or created_at - kembar_sebelumnya > interval '60 seconds')
    and (p_start is null or tanggal >= p_start)
    and (p_end is null or tanggal < p_end)
  group by tanggal
  order by tanggal
$$;
