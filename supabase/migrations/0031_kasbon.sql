-- 0031 · Kasbon — piutang & utang yang uangnya BELUM berpindah (Batch 2)
--
-- Kasbon disimpan di tabel SENDIRI, bukan sebagai baris `transactions` yang
-- diberi tanda. Alasannya struktural, sama dengan alasan rollup memakai
-- trigger (0012): setiap angka uang di aplikasi ini — trigger rollup, RPC
-- laporan (0015), PDF, segel on-chain, hidrasi Catat — membaca `transactions`
-- dengan `status = 'confirmed'`. Kasbon yang belum lunas bukan uang yang
-- bergerak. Kalau ia menjadi baris `transactions`, SETIAP jalur baca itu harus
-- diberi filter tambahan, dan satu yang terlewat diam-diam menggelembungkan
-- "Sisa uang" serta hash segel. Di tabel terpisah, laporan benar menurut
-- konstruksi, bukan menurut disiplin pemanggil.
--
-- Basis kas (keputusan PO 2026-10-22): kasbon tidak masuk laporan sampai
-- lunas. Saat ditandai lunas, `kasbon_lunasi` membuat satu baris
-- `transactions` biasa pada TANGGAL PELUNASAN — trigger rollup yang sudah ada
-- menghitungnya tanpa diberi tahu apa pun. Penjualan kasbon karenanya tampil
-- di laporan pada hari uangnya diterima, bukan hari barangnya diambil.
--
-- Murni menambah: tidak ada DROP, tidak ada kolom lama yang berubah, dan baris
-- lama tidak tersentuh (`transactions.items` NULL untuk seluruh riwayat).
-- Idempoten: aman dijalankan ulang.
--
-- Yang SENGAJA tidak ada di sini, dan jangan ditambahkan tanpa keputusan PO:
--   · skor/rasio apa pun yang diturunkan dari kasbon (tidak ada skoring
--     kelayakan kredit, termasuk komponen "Kasbon terkelola" PRD §7.4);
--   · jalur apa pun yang membawa kasbon ke rantai (segel, misi, reward);
--   · pembayaran sebagian — Batch 2 hanya lunas penuh.

/* ── 1. Tabel kasbon ─────────────────────────────────────────────────────── */
create table if not exists kasbon (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  -- piutang = orang lain berutang pada pengguna (uang akan MASUK);
  -- utang   = pengguna berutang pada orang lain (uang akan KELUAR).
  tipe text not null check (tipe in ('piutang','utang')),
  -- Nama pelanggan/pemasok. Data pribadi ORANG KETIGA — lihat purge di §4.
  pihak text check (pihak is null or char_length(pihak) <= 60),
  -- Rupiah integer, sama seperti transactions (DILARANG float untuk uang).
  amount bigint,
  -- Kategori yang akan dipakai baris transaksi saat lunas (penjualan,
  -- bahan_baku, …) — ditebak parser pada saat kasbon dicatat.
  kategori_id uuid references categories(id) on delete set null,
  -- [{nama, jumlah}] — hanya DISIMPAN. Tidak ada UI stok di Batch 2.
  items jsonb check (items is null or jsonb_typeof(items) = 'array'),
  catatan text,                              -- potongan teks yang jadi kasbon ini
  raw_input text,                            -- kalimat utuh (audit parser, retensi 90 hari)
  occurred_at timestamptz not null default now(),  -- kapan kasbon terjadi
  jatuh_tempo date,                          -- disiapkan; belum dipakai UI Batch 2
  source text not null default 'chat'
    check (source in ('chat','voice','manual')),
  parsed_by text not null default 'llm'
    check (parsed_by in ('llm','fallback','manual')),
  status text not null default 'aktif'
    check (status in ('draft','aktif','lunas','dihapus')),
  lunas_at timestamptz,
  -- Kapan dihapus (salah tangkap parser). Kolom sendiri, bukan updated_at:
  -- updated_at ikut bergeser setiap kali pemusnah menyentuh baris, dan jam
  -- retensi tidak boleh ikut mundur karenanya.
  deleted_at timestamptz,
  -- Baris transaksi pelunasan, bila pengguna memilih "Catat pembayarannya
  -- sekarang". NULL saat memilih "Sudah kucatat" — uangnya sudah tercatat
  -- lewat Catat, dan membuat baris kedua berarti menghitungnya dua kali.
  transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Sama dengan aturan transactions (0012): nominal boleh kosong HANYA saat
  -- draft menunggu jawaban pertanyaan nominal.
  constraint kasbon_amount_check
    check ((amount is not null and amount > 0) or status = 'draft'),
  constraint kasbon_lunas_check
    check (status <> 'lunas' or lunas_at is not null),
  constraint kasbon_dihapus_check
    check (status <> 'dihapus' or deleted_at is not null)
);

comment on table kasbon is
  'Piutang & utang yang uangnya BELUM berpindah. Tidak pernah dibaca laporan, '
  'PDF, maupun segel. Pelunasan membuat baris transactions biasa (kasbon_lunasi). '
  'Lihat migrasi 0031.';
comment on column kasbon.pihak is
  'Nama pelanggan/pemasok — data pribadi orang ketiga. Dikosongkan 90 hari '
  'setelah kasbon selesai (purge_kasbon_pribadi).';

-- Dijaga `if not exists`, bukan pola `drop … if exists` + create yang dipakai
-- 0011: migrasi Batch 2 ini sengaja tidak memuat DROP apa pun.
do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'trg_kasbon_updated' and tgrelid = 'kasbon'::regclass
  ) then
    create trigger trg_kasbon_updated before update on kasbon
      for each row execute function set_updated_at();
  end if;
end $$;

/* ── 2. transactions.items — barang dalam satu transaksi, hanya disimpan ─── */
-- Nullable dan tidak dibaca trigger rollup, RPC laporan, maupun kanonik segel
-- (§17.2 adalah daftar putih). Menambahkannya tidak mengubah satu angka pun.
alter table transactions add column if not exists items jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_items_check'
  ) then
    alter table transactions add constraint transactions_items_check
      check (items is null or jsonb_typeof(items) = 'array');
  end if;
end $$;

/* ── 3. Indeks ───────────────────────────────────────────────────────────── */
-- Kartu "Kasbon belum lunas" hanya membaca yang aktif; parsial = kecil.
create index if not exists idx_kasbon_user_aktif
  on kasbon (user_id, occurred_at desc)
  where status = 'aktif';
-- Batas 200 entri/hari dan hidrasi Catat menghitung dari created_at.
create index if not exists idx_kasbon_user_created
  on kasbon (user_id, created_at);
-- FK `on delete set null` memindai kolom ini; tanpa indeks itu sequential scan.
create index if not exists idx_kasbon_transaction
  on kasbon (transaction_id)
  where transaction_id is not null;
-- Pemusnah raw_input, pola yang sama dengan 0025.
create index if not exists idx_kasbon_raw_input_umur
  on kasbon (created_at)
  where raw_input is not null;

/* ── 4. RLS — strategi sama seperti 0011 ─────────────────────────────────── */
-- Tanpa policy = anon/authenticated ditolak. Seluruh akses lewat service-role
-- dengan otorisasi identitas Privy di lapisan API (filter user_id di SETIAP
-- query, lib/catat/server.ts).
alter table kasbon enable row level security;

/* ── 5. Pelunasan atomik ─────────────────────────────────────────────────── */
-- Satu transaksi DB: kunci barisnya, (opsional) buat transaksi pelunasan,
-- tutup kasbonnya. Tidak ada keadaan separuh — kasbon lunas tanpa uang
-- tercatat, atau uang tercatat dengan kasbon masih aktif (yang akan membuat
-- pengguna menandainya lagi dan menghitung uangnya dua kali).
--
-- `p_catat = false` adalah pilihan "Sudah kucatat": pengguna sudah
-- mengucapkan pelunasannya di Catat, jadi yang ditutup hanya kasbonnya.
--
-- Barang (`items`) TIDAK disalin ke transaksi pelunasan: barangnya berpindah
-- pada hari kasbon terjadi, dan menyalinnya berarti menghitung barang yang
-- sama dua kali bila suatu hari ada stok.
--
-- Galat dilempar dengan kode sendiri supaya API bisa membedakan "tidak ada"
-- (404) dari "sudah lunas/dihapus" (409) tanpa membaca teks pesan.
create or replace function kasbon_lunasi(
  p_user uuid,
  p_id uuid,
  p_catat boolean,
  p_metode text,
  p_tanggal date
) returns uuid
language plpgsql as $$
declare
  k kasbon%rowtype;
  v_tx uuid := null;
  v_metode text := case
    when p_metode in ('tunai','qris','transfer','ewallet') then p_metode
    else 'tunai' end;
begin
  select * into k
    from kasbon
   where id = p_id and user_id = p_user
   for update;

  if not found then
    raise exception 'kasbon tidak ditemukan' using errcode = 'KB404';
  end if;
  if k.status <> 'aktif' then
    raise exception 'kasbon tidak aktif (%)', k.status using errcode = 'KB409';
  end if;

  if p_catat then
    insert into transactions (
      user_id, jenis, amount, kategori_id, payment_method, catatan,
      occurred_at, source, parsed_by, status
    ) values (
      p_user,
      case k.tipe when 'piutang' then 'masuk' else 'keluar' end,
      k.amount,
      k.kategori_id,
      v_metode,
      'Pelunasan kasbon' || coalesce(' · ' || k.pihak, ''),
      -- Jam dipatok 12:00 WIB, sama dengan /api/catat, supaya tanggal WIB
      -- baris ini stabil dari timezone mana pun.
      (coalesce(p_tanggal, (now() at time zone 'Asia/Jakarta')::date)::text
        || ' 12:00:00+07')::timestamptz,
      'manual',
      'manual',
      'confirmed'
    )
    returning id into v_tx;
  end if;

  update kasbon
     set status = 'lunas',
         lunas_at = now(),
         transaction_id = v_tx
   where id = p_id;

  return v_tx;
end $$;

revoke all on function kasbon_lunasi(uuid, uuid, boolean, text, date) from public;
grant execute on function kasbon_lunasi(uuid, uuid, boolean, text, date) to service_role;

/* ── 6. Retensi data orang ketiga ────────────────────────────────────────── */
-- Dua aturan, dijalankan cron pemeliharaan yang sama dengan purge_raw_input:
--
--   a. `raw_input` kasbon dimusnahkan 90 hari setelah DITERIMA — janji yang
--      sama persis dengan transaksi (0025), dihitung dari created_at.
--   b. Kasbon yang SUDAH SELESAI (lunas/dihapus) kehilangan `pihak` dan
--      `catatan` 90 hari setelah selesai. Selama aktif, nama itu dibutuhkan
--      untuk tahu siapa berutang; setelah selesai, ia tidak lagi punya fungsi
--      di baris ini. Uangnya sendiri tetap tercatat di baris transaksi
--      pelunasan, yang mengikuti kebijakan retensi transaksi biasa.
--
-- Fungsi terpisah dari purge_raw_input supaya arti angka yang dilaporkan
-- fungsi itu ("baris transaksi yang raw_input-nya dimusnahkan") tidak berubah
-- diam-diam. Berbatas dan `skip locked`, alasannya sama dengan 0025.
create or replace function purge_kasbon_pribadi(
  p_hari int default 90,
  p_batas int default 5000
) returns int
language plpgsql as $$
declare
  v_a int;
  v_b int;
begin
  with sasaran as (
    select id
      from kasbon
     where raw_input is not null
       and created_at < now() - make_interval(days => p_hari)
     order by created_at
     limit p_batas
     for update skip locked
  )
  update kasbon k
     set raw_input = null
    from sasaran s
   where k.id = s.id;
  get diagnostics v_a = row_count;

  with sasaran as (
    select id
      from kasbon
     where status in ('lunas','dihapus')
       and (pihak is not null or catatan is not null)
       and coalesce(lunas_at, deleted_at) < now() - make_interval(days => p_hari)
     order by coalesce(lunas_at, deleted_at)
     limit p_batas
     for update skip locked
  )
  update kasbon k
     set pihak = null,
         catatan = null
    from sasaran s
   where k.id = s.id;
  get diagnostics v_b = row_count;

  return v_a + v_b;
end $$;

revoke all on function purge_kasbon_pribadi(int, int) from public;
grant execute on function purge_kasbon_pribadi(int, int) to service_role;
