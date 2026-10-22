-- 0040 · Freelance/jasa: invoice, kuitansi, bukti potong (PERINTAH-AGEN-PREMIUM §Batch 11)
--
-- Tiga hal, aditif & idempoten, tanpa DROP:
--
--   1. `invoices` — invoice sederhana (GRATIS): nomor INV-YYYYMM-xxxxx, klien,
--      uraian, nominal, jatuh tempo, status terbit|lunas|batal. PDF invoice &
--      kuitansi dirender saat diminta (tidak disimpan, tidak dinotarisasi —
--      ini dokumen kerja, bukan dokumen untuk bank/pejabat).
--   2. `kasbon.invoice_id` (nullable) — piutang per klien MEMAKAI tabel kasbon
--      yang ada: setiap invoice terbit melahirkan satu kasbon `piutang` dengan
--      pihak = klien; pelunasan kasbon = invoice lunas (transaksi pemasukan
--      `jasa` lahir dari alur pelunasan kasbon yang sudah ada, bukan jalur
--      baru).
--   3. `bukti_potong` — tracker bukti potong PPh per klien per pembayaran
--      (PREMIUM, bagian paket `pajak`/Plus): status nihil|terpotong, nominal
--      potongan, nomor bukti potong (nomor DOKUMEN, bukan identitas — boleh
--      disimpan), tahun pajak. Rekap tahunannya masuk PDF Rincian Peredaran
--      Bruto (Batch 9). Tanpa NPWP/NIK klien.
--
-- DP/deposit TIDAK butuh kolom: transaksi masuk `jasa` dengan
-- `sub_kategori = 'uang_muka'`. Tanpa e-Meterai, tanpa Coretax.

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  nomor text not null unique,                      -- INV-YYYYMM-xxxxx (per pengguna urut)
  klien text not null check (char_length(klien) between 1 and 80),
  uraian text not null check (char_length(uraian) between 1 and 300),
  nominal bigint not null check (nominal > 0),
  jatuh_tempo date,
  status text not null default 'terbit'
    check (status in ('terbit', 'lunas', 'batal')),
  lunas_at timestamptz,
  -- Baris transaksi pemasukan saat lunas (lewat pelunasan kasbon). set null:
  -- menghapus transaksi tidak boleh ikut menghapus invoice.
  transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table invoices is
  'Invoice & kuitansi sederhana untuk peran freelance/jasa (gratis). PDF '
  'dirender saat diminta, tidak disimpan. Piutangnya baris `kasbon` dengan '
  'invoice_id. Lihat 0040 dan PERINTAH-AGEN-PREMIUM §Batch 11.';

do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'trg_invoices_updated' and tgrelid = 'invoices'::regclass
  ) then
    create trigger trg_invoices_updated before update on invoices
      for each row execute function set_updated_at();
  end if;
end $$;

create index if not exists idx_invoices_user_waktu on invoices (user_id, created_at desc);

alter table invoices enable row level security;

-- 2. kasbon.invoice_id
alter table kasbon add column if not exists invoice_id uuid references invoices(id) on delete set null;
create index if not exists idx_kasbon_invoice on kasbon (invoice_id) where invoice_id is not null;

-- 3. bukti_potong
create table if not exists bukti_potong (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete set null,
  klien text not null check (char_length(klien) between 1 and 80),
  tanggal date not null,
  tahun_pajak int not null check (tahun_pajak between 2020 and 2100),
  bruto bigint not null check (bruto > 0),
  status text not null check (status in ('nihil', 'terpotong')),
  nominal_potongan bigint not null default 0 check (nominal_potongan >= 0),
  -- Nomor bukti potong = nomor dokumen (boleh disimpan). BUKAN NPWP/NIK.
  nomor_bukti text check (nomor_bukti is null or char_length(nomor_bukti) <= 60),
  catatan text check (catatan is null or char_length(catatan) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bukti_potong_konsisten check (
    (status = 'nihil' and nominal_potongan = 0) or (status = 'terpotong' and nominal_potongan > 0)
  )
);

comment on table bukti_potong is
  'Tracker bukti potong PPh per klien per pembayaran (premium pajak/Plus). '
  'Nomor bukti = nomor dokumen, bukan identitas. Tanpa NPWP/NIK. 0040.';

do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'trg_bukti_potong_updated' and tgrelid = 'bukti_potong'::regclass
  ) then
    create trigger trg_bukti_potong_updated before update on bukti_potong
      for each row execute function set_updated_at();
  end if;
end $$;

create index if not exists idx_bukti_potong_user_tahun on bukti_potong (user_id, tahun_pajak, tanggal desc);

alter table bukti_potong enable row level security;
