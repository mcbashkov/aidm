-- 0038 · Modul Pajak OP — "Paket Pajak Tahunan" (PERINTAH-AGEN-PREMIUM §Batch 9)
--
-- Dua hal, aditif dan idempoten, tanpa DROP:
--
--   1. `users.wajib_pajak_op` — bendera "Saya wajib pajak orang pribadi"
--      (default MATI). Bila mati, baris omzet tahunan tetap tampil tanpa
--      kalimat pajak. Bukan NPWP, bukan NIK: hanya ya/tidak.
--   2. `dokumen_pajak` — satu baris per dokumen premium pajak:
--      `rincian`    = "Rincian Peredaran Bruto per Bulan (bahan pengisian
--                      SPT)" satu tahun pajak; PDF disimpan di bucket privat
--                      `berkas` seperti Berkas Pengajuan, hash dinotarisasi.
--      `pernyataan` = "Surat Pernyataan Omzet di Bawah Rp500 Juta". PDF-nya
--                      memuat NPWP yang diketik pengguna saat membuat, dan
--                      §Batch 9 melarang menyimpan NPWP — maka untuk jenis ini
--                      `path_pdf` SELALU NULL: PDF dikirim langsung ke pengguna,
--                      yang disimpan hanya hash + metadata. Tidak ada kolom
--                      NPWP/NIK di tabel mana pun.
--
-- Tabel BARU, bukan memperluas CHECK `berkas_pengajuan.kode`: mengubah
-- constraint yang ada berarti DROP CONSTRAINT, yang dilarang §0.3 #6.
-- Hak akses `pajak` tidak butuh tabel: Plus aktif/masa coba, atau pesanan
-- `subscription_orders` kode 'pajak' lunas < 365 hari (kolom yang sudah ada).
-- Tidak ada fungsi baru → tidak ada grant; default privileges 0033 berlaku.

alter table users add column if not exists wajib_pajak_op boolean not null default false;

create table if not exists dokumen_pajak (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  jenis text not null check (jenis in ('rincian', 'pernyataan')),
  tahun_pajak int not null check (tahun_pajak between 2020 and 2100),
  nomor_dokumen text not null unique,        -- PJ-YYYY-xxxxx
  kode_verifikasi text not null unique
    check (char_length(kode_verifikasi) = 12),
  order_id uuid references subscription_orders(id) on delete set null,
  path_pdf text,                             -- NULL untuk `pernyataan` (lihat atas)
  sha256 text,                               -- hex, atas byte PDF
  tx_hash text,
  status text not null default 'dibuat'
    check (status in ('dibuat', 'pending_segel', 'confirmed', 'gagal')),
  percobaan int not null default 0,
  galat text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table dokumen_pajak is
  'Dokumen premium pajak OP (rincian peredaran bruto / surat pernyataan). '
  'PDF rincian di bucket privat `berkas`; pernyataan tidak disimpan (memuat '
  'NPWP). sha256 dinotarisasi ke ReportAttestation (hash saja). 0038.';

do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'trg_dokumen_pajak_updated' and tgrelid = 'dokumen_pajak'::regclass
  ) then
    create trigger trg_dokumen_pajak_updated before update on dokumen_pajak
      for each row execute function set_updated_at();
  end if;
end $$;

create index if not exists idx_dokumen_pajak_user_waktu
  on dokumen_pajak (user_id, created_at desc);
create index if not exists idx_dokumen_pajak_status_tindak
  on dokumen_pajak (status, updated_at)
  where status in ('gagal', 'pending_segel', 'dibuat');

alter table dokumen_pajak enable row level security;
