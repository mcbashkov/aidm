-- 0033 · Fungsi `public` hanya untuk service_role — maksud yang tak pernah tercapai
--
-- Sejak 0013, setiap migrasi yang membuat fungsi menutupnya dengan pola
--   revoke all on function … from public;
--   grant execute on function … to service_role;
-- dengan niat: hanya server (klien service-role) yang boleh memanggil RPC,
-- karena otorisasi identitas Privy ditegakkan di lapisan API, bukan di
-- database (lihat 0011 "RLS — strategi"). Niat itu TIDAK PERNAH tercapai.
--
-- Temuan 2026-10-22, saat verifikasi 0031/0032 di produksi: 139 dari 139
-- fungsi di skema `public` bisa dieksekusi `anon` — termasuk semua fungsi
-- lama. Sebabnya ada di `pg_default_acl`: Supabase menyetel
--   alter default privileges for role postgres in schema public
--     grant execute on functions to anon, authenticated, service_role;
-- sehingga setiap fungsi baru lahir dengan GRANT EKSPLISIT ke `anon` dan
-- `authenticated`. `revoke … from public` hanya mencabut hak PUBLIC; grant
-- eksplisit per-role tidak tersentuh. Pola yang diulang di dua puluh migrasi
-- itu, secara efektif, tidak melakukan apa-apa.
--
-- Kenapa ini BUKAN lubang hari ini, dan diperiksa, bukan diasumsikan:
--   · tidak ada satu pun fungsi SECURITY DEFINER (grep migrasi + pg_proc.prosecdef
--     di produksi), jadi RPC berjalan sebagai pemanggilnya;
--   · setiap tabel `public` ber-RLS tanpa policy, kecuali dua policy baca untuk
--     `categories` dan `missions` (0008) dan tabel `schema_migrations` milik
--     runner — jadi panggilan `anon` ke RPC mana pun berakhir di nol baris
--     atau galat izin, bukan di data orang;
--   · tidak ada klien Supabase berkunci anon yang dipakai aplikasi
--     (`lib/supabase/client.ts` dan `server.ts` tidak diimpor di mana pun);
--     ke-17 pemanggil `.rpc(` memakai `createSupabaseAdminClient`.
-- Yang hilang adalah LAPISAN KEDUA: bila suatu hari ada fungsi SECURITY
-- DEFINER, atau policy RLS yang lebih longgar, pintunya sudah terbuka lebih
-- dulu. Migrasi ini menutupnya sekarang, selagi tidak ada yang lewat.
--
-- Cakupan — hanya fungsi MILIK PROYEK (21 di produksi):
--   · anggota ekstensi (`vector`, 118 fungsi di `public`) TIDAK disentuh:
--     fungsi operator vektor dipanggil implisit di dalam query, dan niat pola
--     revoke proyek memang tak pernah menyasarnya;
--   · fungsi milik role internal Supabase (supabase_admin dkk.) tidak disentuh.
-- Fungsi trigger (set_updated_at, trg_transactions_rollup, rollup_delta) ikut
-- dirapikan dengan aman: hak EXECUTE fungsi trigger diperiksa saat CREATE
-- TRIGGER, bukan saat trigger menyala.
--
-- Default privileges diubah hanya untuk role `postgres` — role yang menjalankan
-- migrasi lewat SUPABASE_DB_URL — supaya fungsi di migrasi berikutnya tidak
-- lagi mewarisi grant itu. Ada DUA tingkat, dan keduanya perlu (dokumentasi
-- ALTER DEFAULT PRIVILEGES, "Notes"): entri GLOBAL menggantikan default
-- bawaan PostgreSQL, sedangkan entri PER-SKEMA ditambahkan di atasnya dan
-- hanya bisa membalik grant per-skema. Default bawaan memberi EXECUTE ke
-- PUBLIC — dan anon adalah anggota PUBLIC — jadi PUBLIC hanya bisa dicabut
-- di tingkat global. Produksi (diperiksa 2026-10-22) tidak punya entri
-- global untuk `postgres`; yang ada entri per-skema `public` dan `storage`
-- dengan grant ke anon/authenticated/service_role. Entri milik
-- `supabase_admin` dan entri skema `storage` dibiarkan: bukan milik proyek.
--
-- Idempoten (revoke pada grant yang tidak ada = no-op), tanpa DROP, dan
-- GAGAL KERAS di akhir bila masih ada fungsi proyek yang bisa dieksekusi
-- anon/authenticated — lebih baik migrasi berhenti daripada diam-diam separuh.

/* ── 1. Cabut grant eksplisit dari fungsi milik proyek ──────────────────── */
do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select p.oid::regprocedure as fn
      from pg_proc p
      join pg_namespace ns on ns.oid = p.pronamespace
     where ns.nspname = 'public'
       and not exists (
         select 1 from pg_depend d
          where d.classid = 'pg_proc'::regclass
            and d.objid = p.oid
            and d.deptype = 'e')                       -- bukan anggota ekstensi
       and pg_get_userbyid(p.proowner) not in
         ('supabase_admin', 'supabase_auth_admin', 'supabase_storage_admin',
          'supabase_functions_admin')                 -- bukan internal Supabase
  loop
    execute format('revoke all on routine %s from public, anon, authenticated', r.fn);
    execute format('grant execute on routine %s to service_role', r.fn);
    n := n + 1;
  end loop;
  raise notice '0033: % fungsi milik proyek kini hanya untuk service_role', n;
end $$;

/* ── 2. Fungsi berikutnya tidak mewarisi grant ke PUBLIC/anon/authenticated ─ */
-- (a) Tingkat GLOBAL: satu-satunya tempat PUBLIC bisa dicabut. Entri ini
--     belum ada di produksi dan lahir dari baris ini: default bawaan minus
--     PUBLIC. Mencabut dari entri yang sudah tanpa PUBLIC adalah no-op.
alter default privileges for role postgres
  revoke execute on functions from public;
-- (b) Tingkat skema `public`: entri yang Supabase pasang dengan grant ke
--     anon/authenticated. service_role dan postgres tetap di situ.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

/* ── 3. Verifikasi — gagal keras bila masih ada yang bocor ──────────────── */
do $$
declare
  bocor text;
begin
  select string_agg(p.oid::regprocedure::text, ', ' order by p.proname)
    into bocor
    from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
   where ns.nspname = 'public'
     and not exists (
       select 1 from pg_depend d
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e')
     and pg_get_userbyid(p.proowner) not in
       ('supabase_admin', 'supabase_auth_admin', 'supabase_storage_admin',
        'supabase_functions_admin')
     and (has_function_privilege('anon', p.oid, 'execute')
       or has_function_privilege('authenticated', p.oid, 'execute'));
  if bocor is not null then
    raise exception '0033: masih bisa dieksekusi anon/authenticated: %', bocor;
  end if;
end $$;
