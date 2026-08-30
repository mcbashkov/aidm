-- 0029 · Hitungan offtopic harian di jalur Catat (§P1-5 guardrail)
--
-- Dipakai untuk SATU hal: memendekkan kalimat penolakan setelah beberapa kali.
-- Mengulang kalimat panjang yang sama terbaca seperti dimarahi, dan audiens
-- produk ini banyak yang baru pertama kali memakai AI — mencoba mengobrol
-- dengannya adalah rasa ingin tahu yang wajar, bukan pelanggaran.
--
-- TIDAK dipakai untuk menangguhkan, membatasi, atau menghukum apa pun.
-- Kalau suatu hari ada yang tergoda memakainya sebagai dasar pemblokiran,
-- baris ini yang harus dibaca lebih dulu: itu bukan tujuannya dibuat.
--
-- Menumpang `catat_kuota` (0013) yang sudah punya kunci (user, hari WIB) dan
-- sudah ditulis pada setiap permintaan catat — bukan tabel baru untuk satu
-- integer.

alter table catat_kuota add column if not exists offtopic int not null default 0;

create or replace function catat_offtopic_inc(p_user uuid, p_tanggal date)
returns int
language plpgsql as $$
declare v int;
begin
  insert into catat_kuota (user_id, tanggal, jml_request, offtopic)
  values (p_user, p_tanggal, 0, 1)
  on conflict (user_id, tanggal) do update
    set offtopic = catat_kuota.offtopic + 1, updated_at = now()
  returning catat_kuota.offtopic into v;
  return v;
end $$;

revoke all on function catat_offtopic_inc(uuid, date) from public;
grant execute on function catat_offtopic_inc(uuid, date) to service_role;
