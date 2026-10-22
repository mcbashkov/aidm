-- 0034 · Tonggak Kesiapan Catatan yang sudah ditampilkan (Batch 4, §1.3 poin 4)
--
-- Toast "Catatanmu sudah 3 bulan rutin — cukup untuk Berkas Pengajuan" tampil
-- SEKALI seumur akun per tingkat (siap3, siap6). Statusnya disimpan di
-- database, bukan localStorage: pengguna mikro berganti HP dan membersihkan
-- data browser, dan toast yang muncul lagi di tiap perangkat bukan "sekali
-- seumur akun".
--
-- Tabel kecil sendiri, bukan kolom di `users`: baris lahir hanya saat tonggak
-- dicapai (sebagian besar akun tidak punya satu pun), kunci primer (user,
-- tingkat) membuat penandaan idempoten lewat `on conflict do nothing`, dan
-- `users` tidak perlu disentuh. Aditif, idempoten, tanpa DROP.
--
-- Tingkat itu sendiri TIDAK disimpan di sini — ia dihitung ulang dari
-- daily_rollups setiap kali dibutuhkan (lib/kesiapan/hitung.ts). Yang disimpan
-- hanya fakta "toast untuk tingkat ini sudah pernah tampil".

create table if not exists kesiapan_tonggak (
  user_id uuid not null references users(id) on delete cascade,
  tingkat text not null check (tingkat in ('siap3', 'siap6')),
  tampil_at timestamptz not null default now(),
  primary key (user_id, tingkat)
);

comment on table kesiapan_tonggak is
  'Tonggak Kesiapan Catatan yang toast-nya sudah tampil (sekali seumur akun '
  'per tingkat). Tingkatnya sendiri dihitung ulang dari daily_rollups. 0034.';

-- RLS: strategi 0011 — tanpa policy, hanya service-role lewat lapisan API.
alter table kesiapan_tonggak enable row level security;
