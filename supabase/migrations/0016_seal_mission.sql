-- 0016 · M4 — misi v3.0 & pemicu misi segel (§7.6 / §7.5 alur #6).
--
-- Tabel misi (0005) lahir di era v2.0: CHECK tipe hanya kenal
-- daily/weekly/once, dan seed 0009 berisi misi riset. v3.0 menggeser pemicu
-- ke pencatatan (§7.6) dan menambah misi BULANAN "Segel laporan bulanan".

/* ── Tipe 'monthly' (§7.6 — misi bulanan, cap terpisah dari cap harian) ──── */
alter table missions drop constraint if exists missions_tipe_check;
alter table missions add constraint missions_tipe_check
  check (tipe in ('daily','weekly','monthly','once'));

/* ── Misi v3.0 (angka default §7.6 — dikonfirmasi PO 2026-08-14, §16 #7) ─── */
-- Kode & angka sinkron dengan lib/missions.ts (sumber tampilan M0).
insert into missions (code, judul, deskripsi, reward_idmx, tipe) values
  ('first_tx_today','Catat transaksi pertama hari ini','Catat 1 transaksi hari ini',20,'daily'),
  ('five_tx_today','Catat 5 transaksi dalam sehari','Selesaikan 5 catatan hari ini',50,'daily'),
  ('streak_7_days','Catat 7 hari beruntun','Mencatat setiap hari selama seminggu',100,'weekly'),
  ('seal_monthly_report','Segel laporan bulanan','Segel laporan bulan lalu ke opBNB',150,'monthly'),
  ('complete_profile','Lengkapi profil usaha','Isi nama usaha, kategori, dan kota',50,'once')
on conflict (code) do update set
  judul = excluded.judul,
  deskripsi = excluded.deskripsi,
  reward_idmx = excluded.reward_idmx,
  tipe = excluded.tipe,
  aktif = true;

-- Misi riset v2.0 dinonaktifkan, BUKAN dihapus: mission_events lama tetap
-- merujuk barisnya, dan riwayat reward user tidak boleh kehilangan induk.
update missions set aktif = false
  where code in ('first_research_today','three_research_today','share_result_card','login_streak_7');

/* ── Idempoten: satu event segel per user per periode ────────────────────── */
-- Segel ulang (boleh, §7.5) TIDAK boleh memicu reward kedua untuk periode
-- yang sama. Indeks parsial hanya menyentuh event yang membawa period_key —
-- event misi harian (progress tanpa period_key) tidak terpengaruh.
create unique index if not exists uq_mission_events_period
  on mission_events (user_id, mission_id, (progress->>'period_key'))
  where progress->>'period_key' is not null;
