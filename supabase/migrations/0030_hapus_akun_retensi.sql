-- 0030 · Retensi catatan pembayaran saat akun dihapus (UU PDP × UU KUP)
--
-- Dua kewajiban yang saling tarik-menarik, dan sebelum migrasi ini kita hanya
-- memenuhi satu:
--
--   · UU PDP memberi pengguna hak menghapus data pribadinya.
--   · UU KUP menuntut catatan pembukuan disimpan sepuluh tahun.
--
-- `subscription_orders` memuat catatan keuangan sungguhan — nominal rupiah,
-- id pesanan Midtrans, waktu pembayaran. Sampai sekarang ia `on delete
-- cascade`, jadi menghapus akun ikut memusnahkan bukti pembayaran yang secara
-- hukum wajib kita simpan.
--
-- Jalan keluarnya bukan memilih salah satu, melainkan memisahkan CATATAN dari
-- ORANGNYA. Yang wajib disimpan adalah transaksi keuangannya; identitas
-- pembayarnya tidak pernah termasuk. Karena itu `user_id` menjadi NULL saat
-- akunnya hilang, dan barisnya bertahan sebagai catatan yang tidak bisa lagi
-- dikaitkan ke siapa pun.
--
-- Kenapa yang tersisa benar-benar anonim, dan bukan sekadar "disamarkan":
-- kolom di tabel ini hanya `periode_hari`, `harga_idr`, `status`,
-- `midtrans_order_id`, `midtrans_status`, `paid_at`, dan stempel waktu. Tidak
-- ada nama, email, telepon, maupun alamat dompet. `midtrans_order_id`
-- berbentuk `aidm-<uuid v4 acak>` (app/api/langganan/bayar/route.ts) — ia
-- TIDAK menurunkan apa pun dari identitas pengguna, jadi tidak ada yang bisa
-- dibalik darinya di sisi kita. Ini diperiksa, bukan diasumsikan: seandainya
-- id itu dulu dibentuk dari user_id, migrasi ini akan menyisakan pengenal
-- yang masih menunjuk orang dan justru menciptakan pelanggaran baru.
--
-- `subscriptions` (hak akses premium) sengaja TETAP cascade. Ia bukan catatan
-- keuangan melainkan keadaan langganan seseorang — tidak ada kewajiban
-- menyimpannya, jadi ia ikut terhapus bersama akunnya.

begin;

alter table subscription_orders
  drop constraint if exists subscription_orders_user_id_fkey;

alter table subscription_orders
  alter column user_id drop not null;

alter table subscription_orders
  add constraint subscription_orders_user_id_fkey
  foreign key (user_id) references users(id) on delete set null;

comment on table subscription_orders is
  'Catatan pembayaran langganan. Disimpan untuk kewajiban pembukuan (UU KUP); '
  'user_id menjadi NULL saat akun dihapus (UU PDP) sehingga barisnya tidak '
  'lagi bisa dikaitkan ke orang. Lihat migrasi 0030.';

comment on column subscription_orders.user_id is
  'NULL = pemiliknya sudah menghapus akun. Barisnya tetap ada sebagai catatan '
  'keuangan anonim — jangan pernah diisi ulang dari sumber lain.';

commit;
