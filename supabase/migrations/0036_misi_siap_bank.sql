-- 0036 · Misi rantai "Siap Bank" (PERINTAH-AGEN-PREMIUM §Batch 7)
--
-- Tiga misi tipe `once`: 30 / 90 / 180 hari aktif kumulatif dalam 365 hari
-- terakhir. "Hari aktif" mengikuti definisi §1.4 (baris daily_rollups dengan
-- jml_transaksi > 0) dan dihitung di lib/missions/server.ts, bukan di SQL.
--
-- Imbalan 100 / 150 / 250 IDMX (total 500 ≈ 9% dari 12 × CAP_BULANAN 450).
-- FINAL §0.1 tidak menetapkan angka untuk misi once; CAP harian/bulanan dan
-- kontrak tidak diubah — misi once tetap tunduk pada cap harian seperti
-- complete_profile.
--
-- Idempoten (upsert berdasarkan code), tanpa DROP.

insert into missions (code, judul, deskripsi, reward_idmx, tipe) values
  ('aktif_30',  '30 hari aktif',  'Mencatat di 30 hari berbeda dalam setahun terakhir',  100, 'once'),
  ('aktif_90',  '90 hari aktif',  'Mencatat di 90 hari berbeda dalam setahun terakhir',  150, 'once'),
  ('aktif_180', '180 hari aktif', 'Mencatat di 180 hari berbeda dalam setahun terakhir — cukup untuk Berkas Pengajuan', 250, 'once')
on conflict (code) do update set
  judul       = excluded.judul,
  deskripsi   = excluded.deskripsi,
  reward_idmx = excluded.reward_idmx,
  tipe        = excluded.tipe,
  aktif       = true;
