-- 0017 · M4 lanjutan — progres misi pencatatan & idempotensi klaim (§7.6).
--
-- Prinsip yang menentukan bentuk migrasi ini: **progres misi DITURUNKAN dari
-- data sumber, bukan disimpan sebagai penghitung.** Penghitung terpisah akan
-- melanggar AC §7.6 "menghapus transaksi mengurangi progres misi terkait" —
-- setiap jalur hapus/edit/sinkron-offline harus ingat mengoreksinya, dan yang
-- lupa satu saja membuat reward dibayar atas catatan yang sudah tidak ada.
-- Dengan menurunkannya, penghapusan otomatis menurunkan progres tanpa satu
-- baris pemeliharaan pun.

/* ── Transaksi "unik yang valid" per hari (§7.6 anti-abuse) ─────────────── */
-- Definisi §7.6: nominal > 0, BUKAN duplikat persis dalam 60 detik.
-- Duplikat diukur dari `created_at` (kapan DICATAT), bukan `occurred_at`,
-- karena yang sedang dijaga adalah spam pencatatan — mencatat lima transaksi
-- kemarin hari ini tetap sah dan memang layak dihitung.
-- Hari juga di-bucket dari `created_at` WIB: misinya berbunyi "catat hari ini".
create or replace function misi_hitung_harian(
  p_user uuid,
  p_start date default null,
  p_end date default null
) returns table (tanggal date, jml int)
language sql stable as $$
  with valid as (
    select
      (t.created_at at time zone 'Asia/Jakarta')::date as tanggal,
      t.created_at,
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
  select tanggal, count(*)::int
  from valid
  where (kembar_sebelumnya is null
         or created_at - kembar_sebelumnya > interval '60 seconds')
    and (p_start is null or tanggal >= p_start)
    and (p_end is null or tanggal < p_end)
  group by tanggal
  order by tanggal
$$;

/* ── Idempotensi klaim per periode (§7.6) ───────────────────────────────── */
-- `unique (user_id, mission_id, nonce)` dari 0005 hanya mencegah nonce dipakai
-- ulang; ia TIDAK mencegah misi harian yang sama diklaim dua kali di hari yang
-- sama dengan nonce berbeda. Kunci periode-lah yang menegakkan "satu klaim per
-- misi per periode" — harian '2026-08-15', mingguan '2026-W33', bulanan
-- '2026-07', sekali seumur hidup 'once'.
alter table mission_claims add column if not exists period_key text;

create unique index if not exists uq_mission_claims_period
  on mission_claims (user_id, mission_id, period_key)
  where period_key is not null and status <> 'failed';

-- Klaim yang GAGAL sengaja dikecualikan dari indeks unik di atas: transaksi
-- on-chain yang revert tidak boleh mengunci misi itu selamanya bagi user.

create index if not exists idx_mission_claims_user_time
  on mission_claims (user_id, created_at desc);
