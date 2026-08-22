-- 0020 · Preferensi pengguna yang bisa diubah dari layar Pengaturan (§13).
--
-- Sebelum ini empat baris di /akun adalah tombol tanpa aksi. Yang pertama
-- dihidupkan adalah gaya bahasa jawaban AI, dan ia butuh tempat menetap.
--
-- Kenapa kolom sendiri, bukan `prefs jsonb`: nilai ini MASUK KE PROMPT model.
-- Kolom bertipe teks bebas berarti apa pun yang lolos ke database ikut
-- tersuntik ke instruksi sistem — persis bentuk prompt injection yang paling
-- mudah dicegah di lapisan skema. CHECK constraint di bawah membuat nilai
-- asing ditolak Postgres, bukan bergantung pada setiap penulis kode di masa
-- depan ingat memvalidasinya.

alter table users
  add column if not exists gaya_bahasa text not null default 'santai';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_gaya_bahasa_check'
  ) then
    alter table users
      add constraint users_gaya_bahasa_check
      check (gaya_bahasa in ('santai', 'netral', 'formal'));
  end if;
end $$;

comment on column users.gaya_bahasa is
  'Gaya bahasa jawaban AI. Nilainya dipetakan ke kalimat instruksi di lib/agent/system-prompt.ts — JANGAN pernah menyisipkan nilai kolom ini mentah-mentah ke prompt.';
