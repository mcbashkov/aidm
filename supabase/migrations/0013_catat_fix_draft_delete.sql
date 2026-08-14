-- 0013 · Perbaikan temuan review Tahap 1.
--
-- (1) BUG: draft tanpa nominal tidak bisa dihapus.
--     Constraint 0012 berbunyi `(amount not null and amount > 0) or status = 'draft'`.
--     Soft delete mengubah status draft → 'deleted', sehingga KEDUA sisi OR
--     jadi false dan UPDATE ditolak Postgres — DELETE /api/transaksi/:id
--     selalu 500 untuk entri draft. Melanggar AC §7.2 ("entri bisa diedit dan
--     dihapus dari kartu konfirmasi").
--     Maksud sebenarnya: HANYA baris `confirmed` yang wajib bernominal.
--     Dirumuskan ulang secara positif supaya tidak bergantung pada daftar
--     status — status baru di masa depan tidak akan mengunci baris lagi.

alter table transactions drop constraint if exists transactions_amount_check;
alter table transactions add constraint transactions_amount_check
  check (
    (amount is null or amount > 0)                       -- nominal, bila ada, wajib positif
    and (status <> 'confirmed' or amount is not null)    -- confirmed wajib bernominal
  );

-- (2) Batas anti-abuse §7.2 yang tahan penyalahgunaan biaya LLM.
--     Kuota lama dihitung dari jumlah baris `transactions` hari ini. Lubangnya:
--     kalimat yang TIDAK menghasilkan entri (sapaan, teks acak) tidak menambah
--     baris apa pun, sehingga pemanggilan parser LLM berbayar tidak pernah
--     mentok batas. Penghitung ini mencatat SETIAP percakapan masuk.
--     Kenaikannya atomik (INSERT .. ON CONFLICT .. RETURNING) sehingga bebas
--     dari race check-then-act pada request paralel.

create table if not exists catat_kuota (
  user_id uuid not null references users(id) on delete cascade,
  tanggal date not null,                      -- hari WIB
  jml_request int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, tanggal)
);

create or replace function catat_kuota_inc(p_user uuid, p_tanggal date)
returns int language plpgsql as $$
declare v int;
begin
  insert into catat_kuota (user_id, tanggal, jml_request)
  values (p_user, p_tanggal, 1)
  on conflict (user_id, tanggal) do update
    set jml_request = catat_kuota.jml_request + 1, updated_at = now()
  returning jml_request into v;
  return v;
end $$;

alter table catat_kuota enable row level security;
