-- 0025 · Pemusnahan `raw_input` setelah 90 hari (§12 privasi / §16 #10)
--
-- Kebijakan retensi sudah diputuskan 2026-08-14: kalimat asli pengguna hidup
-- 90 hari, lalu dianonimkan — `raw_input` dihapus, entri transaksi terstruktur
-- dipertahankan. Halaman Kebijakan Privasi SUDAH memberi tahu pengguna bahwa
-- ini terjadi. Sampai migrasi ini, kodenya tidak melakukannya: itu janji yang
-- tidak ditepati, dan pada data keuangan janji privasi yang tidak ditepati
-- adalah kelas kerusakan tersendiri.
--
-- Belum ada data yang telat. Produksi hari ini: 96 transaksi, semuanya
-- ber-`raw_input`, yang tertua 14 hari (14 Agustus). Baris pertama jatuh tempo
-- sekitar 12 November 2026. Dipasang SEKARANG justru karena masih kosong —
-- pemusnah yang pertama kali berjalan pada hari ia benar-benar dibutuhkan
-- adalah pemusnah yang belum pernah diuji.
--
-- Yang TIDAK ikut dihapus: `catatan` (potongan teks yang menjadi entri ini)
-- adalah bagian dari entri terstruktur — ia tampil di Riwayat dan dipakai
-- pengguna mengenali transaksinya sendiri. Yang dimusnahkan hanya kalimat utuh
-- mentah yang kita simpan untuk memperbaiki parser.

/* ── 1. Trigger rollup tidak lagi bekerja untuk update yang tidak berdampak ─ */
-- `update transactions set raw_input = null` menyentuh kolom yang sama sekali
-- tidak masuk hitungan rollup, tapi trigger tetap memanggil rollup_delta dua
-- kali (−1 lalu +1) dengan argumen yang identik. Netonya nol — angkanya tidak
-- pernah salah — tetapi satu batch 5.000 baris menjadi 10.000 UPSERT ke
-- `daily_rollups` yang tidak mengubah apa pun selain `updated_at`.
--
-- Penjaga di bawah melewatkan pasangan itu HANYA bila seluruh masukan
-- rollup_delta tidak berubah sedikit pun. Kalau salah satu berubah, jalurnya
-- persis seperti semula. Ini bukan pelonggaran aturan, melainkan penulisan
-- ulang identitas "x − x = 0" supaya tidak dikerjakan.
create or replace function trg_transactions_rollup() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE'
     and (old.user_id, old.occurred_at, old.jenis, old.amount,
          old.payment_method, old.status)
         is not distinct from
         (new.user_id, new.occurred_at, new.jenis, new.amount,
          new.payment_method, new.status) then
    return new;
  end if;

  -- Baris dihitung bila confirmed DAN bernominal (draft/deleted tidak).
  if tg_op in ('UPDATE','DELETE')
     and old.status = 'confirmed' and old.amount is not null then
    perform rollup_delta(old.user_id, old.occurred_at, old.jenis,
                         old.amount, old.payment_method, -1);
  end if;
  if tg_op in ('INSERT','UPDATE')
     and new.status = 'confirmed' and new.amount is not null then
    perform rollup_delta(new.user_id, new.occurred_at, new.jenis,
                         new.amount, new.payment_method, +1);
  end if;
  return coalesce(new, old);
end $$;

/* ── 2. Indeks yang membuat pemindaian harian murah ──────────────────────── */
-- Parsial: hanya baris yang MASIH punya kalimat asli. Ia menyusut sendiri
-- setiap kali pemusnah berjalan, jadi biayanya tidak tumbuh bersama riwayat.
create index if not exists idx_transactions_raw_input_umur
  on transactions (created_at)
  where raw_input is not null;

/* ── 3. Pemusnah ─────────────────────────────────────────────────────────── */
-- Berbatas (`p_batas`) supaya satu jalannya tidak pernah menjadi transaksi
-- panjang yang mengunci tabel catat di jam sibuk. Sisanya diambil jalan
-- berikutnya; penjadwalnya harian, jadi tumpukan sebesar apa pun akan habis
-- dalam hitungan hari, bukan menahan satu permintaan selama menit.
--
-- `for update skip locked` membuat dua jalan yang tumpang tindih (cron telat +
-- pemanggilan manual) mengerjakan baris yang berbeda, bukan saling menunggu.
--
-- Umur dihitung dari `created_at` — kapan AIDM MENERIMA kalimat itu — bukan
-- `occurred_at` yang bisa dimundurkan pengguna. Retensi adalah janji tentang
-- berapa lama kami menyimpan, bukan tentang kapan transaksinya terjadi.
create or replace function purge_raw_input(
  p_hari int default 90,
  p_batas int default 5000
) returns int
language plpgsql as $$
declare
  v_jml int;
begin
  with sasaran as (
    select id
      from transactions
     where raw_input is not null
       and created_at < now() - make_interval(days => p_hari)
     order by created_at
     limit p_batas
     for update skip locked
  )
  update transactions t
     set raw_input = null
    from sasaran s
   where t.id = s.id;

  get diagnostics v_jml = row_count;
  return v_jml;
end $$;

revoke all on function purge_raw_input(int, int) from public;
grant execute on function purge_raw_input(int, int) to service_role;
