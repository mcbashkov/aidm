-- 0015 · M3 — agregasi laporan di sisi server (§7.3 / §9.3).
--
-- §7.3 mewajibkan "semua agregasi server-side; tidak mengirim seluruh
-- transaksi ke klien untuk dihitung di browser". Ringkasan & grafik harian
-- sudah terpenuhi lewat `daily_rollups` (0011/0012). Yang belum: rincian
-- KATEGORI — rollup harian sengaja tidak menyimpan dimensi kategori (kalau
-- disimpan, satu baris per user/hari/kategori membuat tabelnya berlipat dan
-- kehilangan sifat O(1)-nya). Jadi kategori dihitung on-demand dengan GROUP BY
-- di Postgres, bukan dengan menarik ribuan baris ke Node.
--
-- Fungsi di sini dipanggil lewat service-role dari route API (pola RLS proyek:
-- otorisasi identitas ditegakkan di lapisan API, lihat 0011). `p_user` selalu
-- diisi dari cookie sesi, tidak pernah dari input klien.

/* ── Rincian kategori per jenis (§7.3 #4) ────────────────────────────────── */
-- Batas periode boleh NULL supaya satu fungsi melayani "bulan ini" (start+end),
-- "30 hari" (start saja), dan "semua" (tanpa batas) — tanpa cabang SQL di API.
create or replace function laporan_kategori(
  p_user uuid,
  p_start timestamptz default null,
  p_end timestamptz default null
) returns table (jenis text, kategori_id uuid, total bigint, jml int)
language sql stable as $$
  select t.jenis,
         t.kategori_id,
         sum(t.amount)::bigint as total,
         count(*)::int as jml
  from transactions t
  where t.user_id = p_user
    and t.status = 'confirmed'
    and t.amount is not null
    and (p_start is null or t.occurred_at >= p_start)
    and (p_end is null or t.occurred_at < p_end)
  group by t.jenis, t.kategori_id
$$;

/* ── Arus kas per BULAN untuk PDF (§7.3 "tabel arus kas per bulan") ──────── */
-- Sumbernya rollup harian, bukan tabel transaksi: laporan 12 bulan berarti
-- ~365 baris rollup vs puluhan ribu baris transaksi. Bulan dipotong di zona
-- WIB — `tanggal` di daily_rollups memang sudah tanggal WIB (0012).
create or replace function laporan_bulanan(
  p_user uuid,
  p_start date default null,
  p_end date default null
) returns table (
  bulan text,
  total_masuk bigint,
  total_keluar bigint,
  jml_transaksi int,
  hari_aktif int
) language sql stable as $$
  select to_char(r.tanggal, 'YYYY-MM') as bulan,
         sum(r.total_masuk)::bigint,
         sum(r.total_keluar)::bigint,
         sum(r.jml_transaksi)::int,
         -- Hari "aktif" = hari yang benar-benar punya transaksi. Baris rollup
         -- bisa tersisa dengan jml_transaksi = 0 setelah entri dihapus, dan
         -- menghitungnya sebagai hari aktif membuat metrik disiplin mencatat
         -- di PDF bank jadi lebih bagus daripada kenyataan.
         count(*) filter (where r.jml_transaksi > 0)::int
  from daily_rollups r
  where r.user_id = p_user
    and (p_start is null or r.tanggal >= p_start)
    and (p_end is null or r.tanggal < p_end)
  group by 1
  order by 1
$$;
