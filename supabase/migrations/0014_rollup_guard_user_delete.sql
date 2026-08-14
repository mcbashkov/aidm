-- 0014 · Perbaikan: penghapusan akun gagal karena trigger rollup.
--
-- BUG (ditemukan integration test `pnpm test:api`):
--   DELETE FROM users → cascade menghapus baris `transactions` → AFTER DELETE
--   trigger `trg_transactions_rollup` memanggil rollup_delta(..., -1) → UPSERT
--   ke `daily_rollups` memakai user_id yang barisnya SUDAH hilang →
--     ERROR: violates foreign key constraint "daily_rollups_user_id_fkey"
--   Akibatnya penghapusan akun SELALU gagal untuk user yang punya transaksi
--   confirmed. Tombol "Hapus akun" sudah ada di layar Akun, dan penghapusan
--   data pengguna adalah kewajiban PDP (§12) — jadi ini menutup jalan keluar.
--
-- PERBAIKAN: lewati pemeliharaan rollup bila baris `users` sudah tidak ada.
--   Saat user dihapus, seluruh daily_rollups miliknya ikut terhapus oleh
--   cascade-nya sendiri, jadi tidak ada angka yang perlu dikoreksi lagi.
--   Guard ini HANYA aktif pada kasus itu: hapus/ubah transaksi biasa (user
--   masih ada) tetap memperbarui rollup seperti semula.

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
  -- User sedang/sudah dihapus (cascade): rollup-nya ikut terhapus, tidak ada
  -- yang perlu dikoreksi. Tanpa penjaga ini, UPSERT di bawah melanggar FK.
  if not exists (select 1 from users where id = p_user) then
    return;
  end if;

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
    updated_at = now()
;
end $$;
