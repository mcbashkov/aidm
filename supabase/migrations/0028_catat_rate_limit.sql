-- 0028 · Batas 10 permintaan/menit di jalur Catat (§7.2 anti-abuse)
--
-- MASALAH YANG DITUTUP. Batas yang ada semuanya HARIAN: 400 percakapan dan 200
-- entri per hari. Tanpa batas per menit, keempat ratus percakapan itu bisa
-- dihabiskan skrip dalam satu menit. Biayanya terukur, bukan ditaksir: satu
-- panggilan parser terburuk (masukan 1.000 karakter, keluaran menyentuh plafon
-- 1.024 token) = 1.590 token masuk + 1.024 keluar = Rp109. Dikali 400 →
-- Rp43.750 per akun per hari, dan pada 10.000 pengguna, satu persen penyalah-
-- guna saja sudah Rp131 juta sebulan — lima sampai tiga belas kali seluruh
-- biaya pengguna yang jujur.
--
-- KENAPA INI BUKAN MENJATAH PENCATATAN. Pedagang tidak pernah mengetik sepuluh
-- kalimat dalam satu menit; produksi mencatat rata-rata 2,82 permintaan per
-- pengguna-HARI, tertinggi 7. Yang terhalang batas ini hanya skrip. Mencatat
-- tetap nol biaya, tanpa kuota, termasuk lewat suara.
--
-- BENTUKNYA JENDELA TETAP, BUKAN GESER. Jendela geser menuntut tabel log satu
-- baris per permintaan; jendela tetap cukup dua kolom. Konsekuensi yang
-- disengaja dan diterima: seseorang bisa mengirim 10 di detik ke-59 dan 10
-- lagi di detik ke-61. Untuk pagar anti-abuse itu tidak penting — yang penting
-- adalah 400 permintaan tidak lagi bisa dihabiskan dalam hitungan detik.
--
-- Menumpang tabel `catat_kuota` yang sudah ada (0013), bukan tabel baru:
-- kuncinya sama persis (user + hari WIB) dan ia sudah ditulis pada setiap
-- permintaan catat. Tabel kedua hanya akan menambah satu perjalanan ke
-- database di jalur terpanas aplikasi.

alter table catat_kuota add column if not exists menit_mulai timestamptz;
alter table catat_kuota add column if not exists jml_menit int not null default 0;

/**
 * Naikkan penghitung jendela-menit dan kembalikan nilainya SETELAH kenaikan.
 * Jendela yang sudah lewat direset di dalam UPSERT yang sama — satu perjalanan,
 * satu baris terkunci, tidak ada celah baca-lalu-tulis.
 */
create or replace function catat_rate_inc(
  p_user uuid,
  p_tanggal date,
  p_jendela_detik int
) returns int
language plpgsql as $$
declare v int;
begin
  insert into catat_kuota (user_id, tanggal, jml_request, menit_mulai, jml_menit)
  values (p_user, p_tanggal, 0, now(), 1)
  on conflict (user_id, tanggal) do update
    set menit_mulai = case
          when catat_kuota.menit_mulai is null
            or catat_kuota.menit_mulai
               < now() - make_interval(secs => p_jendela_detik)
          then now()
          else catat_kuota.menit_mulai
        end,
        jml_menit = case
          when catat_kuota.menit_mulai is null
            or catat_kuota.menit_mulai
               < now() - make_interval(secs => p_jendela_detik)
          then 1
          else catat_kuota.jml_menit + 1
        end,
        updated_at = now()
  returning catat_kuota.jml_menit into v;
  return v;
end $$;

revoke all on function catat_rate_inc(uuid, date, int) from public;
grant execute on function catat_rate_inc(uuid, date, int) to service_role;
