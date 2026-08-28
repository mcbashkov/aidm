-- 0023 · Empat misi baru — menghidupkan tab Misi setiap hari (§7.6).
--
-- Masalah yang diperbaiki: di hari biasa hanya DUA misi yang bisa diklaim.
-- Setelah keduanya selesai, tab Misi jadi layar mati sampai besok. Empat misi
-- di bawah dipilih bukan untuk menambah hadiah, tapi karena masing-masing
-- MEMBAYAR PERILAKU yang memang kita inginkan (disepakati PO 2026-08-15):
--
--   both_sides_today   laporan hanya berguna kalau dua sisi tercatat; sekarang
--                      orang bisa hanya mencatat pemasukan dan laporannya timpang
--   voice_tx_today     suara adalah pembeda utama vs BukuWarung, tapi tidak ada
--                      apa pun yang mendorong orang mencobanya
--   open_report_weekly kebiasaan MEMBACA laporan — inti bankability, bukan
--                      sekadar menimbun data
--   streak_30_days     runtun 7 hari terlalu cepat selesai lalu tidak ada
--                      tangga berikutnya
--
-- Ekonomi: 70 → 105 IDMX/hari. Cap harian 250 TIDAK diubah — hari terpadat
-- (seluruh harian + runtun 7 + baca laporan) = 235, masih di bawahnya.
-- `streak_30_days` masuk ember BULANAN bersama segel: 150 + 300 = 450, persis
-- `CAP_BULANAN_IDMX` yang sudah ada.

insert into missions (code, judul, deskripsi, reward_idmx, tipe) values
  ('both_sides_today','Catat pemasukan dan pengeluaran','Catat kedua sisi hari ini',20,'daily'),
  ('voice_tx_today','Catat pakai suara','Catat 1 transaksi lewat suara hari ini',15,'daily'),
  ('open_report_weekly','Buka Laporan minggu ini','Baca laporanmu sekali dalam sepekan',30,'weekly'),
  ('streak_30_days','Catat 30 hari beruntun','Mencatat setiap hari selama sebulan',300,'monthly')
on conflict (code) do update set
  judul = excluded.judul,
  deskripsi = excluded.deskripsi,
  reward_idmx = excluded.reward_idmx,
  tipe = excluded.tipe,
  aktif = true;

/* ── Sinyal harian: satu pemindaian untuk seluruh misi pencatatan ────────── */
-- Menggantikan `misi_hitung_harian` (0017) yang hanya mengembalikan jumlah.
-- Tiga misi harian sekarang butuh sinyal berbeda dari hari yang sama, dan
-- memindai tabel yang sama tiga kali untuk pertanyaan yang bisa dijawab
-- sekali adalah pemborosan yang akan terasa saat riwayat pengguna panjang.
--
-- Definisi "unik-valid" TIDAK berubah dari 0017: nominal > 0, bukan duplikat
-- persis dalam 60 detik, hari di-bucket dari `created_at` WIB. Yang bertambah
-- hanya kolom yang dilaporkan — dan `jml` tetap dihitung dengan cara yang
-- sama persis, supaya progres misi lama tidak bergeser satu pun.
--
-- `misi_hitung_harian` sengaja BELUM dihapus: deploy aplikasi dan migrasi
-- tidak pernah benar-benar serentak, dan versi lama yang masih berjalan
-- beberapa detik tidak boleh kehilangan progres misinya. Dicabut di migrasi
-- berikutnya setelah rilis ini mengendap.
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
