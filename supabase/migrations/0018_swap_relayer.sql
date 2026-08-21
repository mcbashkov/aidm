-- 0018 · Relayer swap IDMX → IDM Reborn (§7.7 / §10 langkah 6).
--
-- Latar yang menentukan seluruh bentuk migrasi ini: **burn tidak bisa
-- dibatalkan.** User membakar IDMX di opBNB (`SwapInitiator`), lalu menebus
-- IDM Reborn di BSC (`SwapClaim`) memakai voucher bertanda tangan. Di antara
-- keduanya berdiri relayer, dan tabel di sini adalah ingatannya.
--
-- Konsekuensinya: baris voucher BUKAN sekadar cache yang boleh hilang. Selama
-- sebuah `SwapRequested` belum tertebus, baris inilah satu-satunya jalan user
-- mendapatkan IDM-nya. Karena itu dua keputusan di bawah sengaja diambil
-- berbeda dari tabel lain di repo ini.

/* ── Kursor relayer ──────────────────────────────────────────────────────── */
-- Kursor hidup DI DATABASE, bukan di env. Env `SWAP_RELAYER_CURSOR_BLOCK`
-- hanya nilai bootstrap saat baris ini belum ada — sesudahnya env tidak
-- pernah dibaca lagi. Alasannya: relayer berjalan di Vercel (serverless),
-- tiap tick adalah proses baru tanpa memori, dan env yang di-redeploy akan
-- memundurkan kursor ke masa lalu (memproses ulang) atau memajukannya
-- (melewatkan burn = burn tanpa voucher).
create table if not exists relayer_state (
  id text primary key,
  cursor_block bigint not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_relayer_state_updated on relayer_state;
create trigger trg_relayer_state_updated before update on relayer_state
  for each row execute function set_updated_at();

/* ── Voucher swap ────────────────────────────────────────────────────────── */
-- `nonce` = primary key, bukan kolom biasa: nonce berasal dari penghitung
-- global SwapInitiator, dan kontrak SwapClaim menolak nonce yang sudah
-- terpakai. Menjadikannya kunci utama membuat idempotensi relayer ditegakkan
-- DATABASE, bukan oleh kehati-hatian kode — dua tick yang berjalan bersamaan
-- (cron menumpuk, retry) secara struktural tidak bisa menerbitkan dua voucher
-- untuk satu burn.
--
-- numeric(78,0) menampung uint256 penuh. Nilai IDMX disimpan dalam wei
-- (satuan terkecil), sama seperti on-chain — dikonversi hanya saat ditampilkan.
create table if not exists swap_vouchers (
  nonce numeric(78,0) primary key,

  -- Alamat dompet yang membakar, APA ADANYA dari event on-chain. Ini yang
  -- ditandatangani dan yang dibayar kontrak — bukan hasil lookup ke tabel
  -- users, yang bisa saja berubah.
  user_address text not null,

  -- Tautan ke akun HANYA untuk kenyamanan UI (menampilkan riwayat di aplikasi).
  -- `on delete set null` — BUKAN cascade: bila user menghapus akunnya
  -- sementara voucher belum ditebus, IDMX-nya sudah terlanjur terbakar di
  -- opBNB. Menghapus baris ini berarti menghapus satu-satunya jalan
  -- penebusannya. Akun boleh hilang; hak tebus tidak.
  user_id uuid references users(id) on delete set null,

  idmx_burned numeric(78,0) not null,

  -- Jejak burn di opBNB — sumber kebenaran yang bisa diaudit ulang kapan saja.
  burn_tx_hash text not null,
  burn_block bigint not null,

  -- Voucher kedaluwarsa TIDAK mematikan hak tebus: relayer menandatangani
  -- ulang dengan nonce yang SAMA dan deadline baru. Yang mencegah klaim ganda
  -- adalah nonce di kontrak, bukan deadline. Karena itu kolom ini boleh
  -- berubah sepanjang umur baris.
  deadline timestamptz not null,
  signature text not null,

  -- 'signed'  = voucher siap ditebus user
  -- 'claimed' = nonce sudah terpakai on-chain (dibaca balik dari SwapClaim)
  status text not null default 'signed' check (status in ('signed', 'claimed')),
  claim_tx_hash text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_swap_vouchers_updated on swap_vouchers;
create trigger trg_swap_vouchers_updated before update on swap_vouchers
  for each row execute function set_updated_at();

-- Daftar voucher milik satu dompet, terbaru dulu (jalur baca utama UI).
create index if not exists idx_swap_vouchers_address
  on swap_vouchers (lower(user_address), created_at desc);

-- Jalur "voucher mana yang perlu ditandatangani ulang": hanya yang belum
-- tertebus yang pernah kedaluwarsa, jadi indeks parsial sudah memadai.
create index if not exists idx_swap_vouchers_signed_deadline
  on swap_vouchers (deadline)
  where status = 'signed';

/* ── RLS ─────────────────────────────────────────────────────────────────── */
-- Sama seperti tabel lain (0008): klien anon/authenticated ditolak default;
-- akses berjalan lewat service-role di API yang sudah mengotorisasi identitas
-- Privy. Voucher berisi tanda tangan yang bernilai uang — tidak boleh terbaca
-- dompet lain.
alter table relayer_state enable row level security;
alter table swap_vouchers enable row level security;
