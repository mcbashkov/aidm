# Runbook Admin AIDM

Operasi administratif dijalankan lewat **SQL langsung**, bukan panel.

**Kenapa tidak ada panel.** Panel admin adalah permukaan paling berhak-istimewa
di seluruh produk: ia butuh autentikasi sendiri, otorisasi sendiri, dan jejak
audit sendiri. Membangunnya untuk audiens satu orang, sebelum ada satu pun
pelanggan berbayar, memindahkan risiko besar ke tempat yang belum punya
imbalannya. Panel menyusul setelah ada pengguna berbayar — sampai saat itu,
berkas ini yang jadi antarmukanya.

**Cara menjalankan.** Supabase Dashboard → SQL Editor, atau:

```bash
psql "$SUPABASE_DB_URL" -c "<query>"
```

**Aturan yang tidak boleh dilanggar:**

1. **Jalankan `SELECT` pemeriksa lebih dulu.** Setiap tindakan di bawah punya
   pasangan "lihat sebelum ubah". Lewati itu dan Anda mengubah sesuatu yang
   tidak Anda lihat.
2. **Satu pengguna per perintah.** Jangan pernah menjalankan `UPDATE` tanpa
   `WHERE user_id = ...` di berkas ini.
3. **Catat apa yang Anda jalankan** — tanggal, query, alasan. Tidak ada jejak
   audit otomatis untuk tindakan manual.

---

## 1 · Melihat keadaan seorang pengguna

Selalu mulai dari sini. Tidak destruktif.

```sql
select u.id, u.email, u.nama_usaha, u.kota, u.created_at,
       s.status, s.berakhir_at, s.sumber, s.coba_dipakai,
       (select count(*) from transactions t where t.user_id = u.id) as transaksi
  from users u
  left join subscriptions s on s.user_id = u.id
 where u.email = 'alamat@contoh.id';
```

Pemakaian premium bulan berjalan:

```sql
select bulan_wib, riset, konten
  from premium_usage
 where user_id = '<uuid>'
 order by bulan_wib desc limit 6;
```

---

## 2 · Memberi / memperpanjang Premium manual

**Kapan dipakai:** kompensasi gangguan, pengguna uji, kemitraan.

**Dampak:** pengguna langsung bisa membuka Riset Tren & Generator Konten.
Menambah hari **dari sisa yang masih berjalan**, jadi aman dipanggil pada
pelanggan yang masih aktif — harinya bertambah, tidak tertimpa.

```sql
-- Lihat dulu
select status, berakhir_at, sumber from subscriptions where user_id = '<uuid>';

-- Beri 30 hari
select langganan_perpanjang('<uuid>'::uuid, 30, 'manual');
```

**Membatalkan.** Kembalikan ke tanggal sebelumnya (salin dari `SELECT` di
atas), atau matikan sama sekali:

```sql
update subscriptions
   set status = 'tidak_aktif', berakhir_at = null
 where user_id = '<uuid>';
```

---

## 3 · Mengulang masa coba

**Dampak:** memberi 7 hari dan mengizinkan masa coba dipakai lagi. Normalnya
masa coba **sekali seumur akun** — kolom `coba_dipakai` yang menjaganya.

> ⚠️ **Hati-hati.** Mereset `coba_dipakai` membuka pintu bagi masa coba
> berulang. Lakukan hanya untuk akun uji, atau saat masa coba seseorang hangus
> karena kesalahan kita.

```sql
-- Lihat dulu
select status, berakhir_at, coba_dipakai, coba_mulai_at
  from subscriptions where user_id = '<uuid>';

-- Buka lagi
update subscriptions
   set coba_dipakai = false, coba_mulai_at = null
 where user_id = '<uuid>';
```

**Membatalkan:** `update subscriptions set coba_dipakai = true where user_id = '<uuid>';`

---

## 4 · Mengembalikan kuota bulanan

**Kapan dipakai:** pengguna kehilangan jatah karena kegagalan di sisi kita
(riset gagal tapi jatahnya terlanjur tercatat).

**Dampak:** hanya menggeser angka pemakaian; tidak menyentuh hak akses.

```sql
-- Lihat dulu
select * from premium_usage where user_id = '<uuid>' and bulan_wib = to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM');

-- Kembalikan 1 jatah riset
update premium_usage
   set riset = greatest(riset - 1, 0), updated_at = now()
 where user_id = '<uuid>'
   and bulan_wib = to_char(now() at time zone 'Asia/Jakarta', 'YYYY-MM');
```

**Membatalkan:** naikkan kembali angkanya dengan `riset = riset + 1`.

---

## 5 · Mengubah parameter agen riset

Harga dan kuota langganan **tidak** ada di database — keduanya konstanta di
`lib/langganan/index.ts`, dan mengubahnya adalah rilis kode, bukan query.
Yang masih hidup di `app_config` hanya parameter agen:

```sql
-- Lihat dulu
select key, value from app_config where key = 'agent';

-- Ubah (contoh: perpanjang tenggat riset)
update app_config
   set value = jsonb_set(value, '{research_timeout_s}', '180')
 where key = 'agent';
```

**Membatalkan:** setel kembali ke nilai lama dari `SELECT` di atas. Default
kode ada di `lib/config.ts` (`DEFAULT_AGENT`) dan tetap dipakai bila barisnya
hilang.

---

## 6 · Menaikkan batas Catat untuk satu pengguna

Batasnya konstanta kode (`CATAT_DAILY_LIMIT` 200 · `CATAT_REQUEST_LIMIT` 400 ·
`CATAT_RATE_PER_MENIT` 10), jadi tidak bisa dinaikkan per pengguna lewat SQL.
Yang bisa dilakukan: **mereset penghitung hari ini** supaya pengguna yang
mentok bisa lanjut mencatat.

```sql
-- Lihat dulu
select * from catat_kuota
 where user_id = '<uuid>'
   and tanggal = (now() at time zone 'Asia/Jakarta')::date;

-- Reset penghitung hari ini
update catat_kuota
   set jml_request = 0, jml_menit = 0, menit_mulai = null, updated_at = now()
 where user_id = '<uuid>'
   and tanggal = (now() at time zone 'Asia/Jakarta')::date;
```

**Dampak:** batas 200 entri/hari **tetap** berlaku — ia dihitung dari tabel
`transactions`, bukan dari penghitung ini. Yang terbuka hanya jatah percakapan.

**Membatalkan:** tidak perlu; penghitungnya berganti hari sendiri.

---

## 7 · Membaca arsip Kredit AI

`credit_ledger` dan `orders` **beku sejak migrasi 0027**. Tidak ada kode produk
yang menulis ke sana lagi; keduanya dipertahankan sebagai riwayat keuangan
sembilan pengguna pertama.

```sql
-- Saldo kredit historis per pengguna (keadaan saat model dibekukan)
select user_id, sum(amount) as saldo_beku, max(created_at) as terakhir
  from credit_ledger
 group by user_id
 order by saldo_beku desc;
```

> ⚠️ **Jangan menulis ke `credit_ledger`.** Angka di sana adalah catatan sejarah.
> Menambahnya sekarang berarti mengarang riwayat yang tidak pernah terjadi, dan
> tidak ada satu pun bagian aplikasi yang akan membacanya.

---

## 8 · Menjalankan pemeliharaan lebih awal

Cron harian 01.15 WIB. Untuk memicunya manual:

```bash
curl -s -H "authorization: Bearer $CRON_SECRET" \
  https://ai.idmtoken.com/api/pemeliharaan/purge
```

**Dampak:** memusnahkan `raw_input` yang lewat 90 hari **(tidak bisa
dibatalkan)** dan menurunkan langganan yang lewat tanggal ke `tidak_aktif`.

> 🔴 **DESTRUKTIF DAN PERMANEN.** Pemusnahan `raw_input` tidak punya jalan
> pulang — kalimat aslinya hilang, entri terstrukturnya tetap. Itu memang
> kewajiban retensi (§16 #10), tapi jangan pernah menjalankannya "sekadar
> mencoba". Untuk melihat berapa yang akan dimusnahkan tanpa memusnahkannya:

```sql
select count(*) from transactions
 where raw_input is not null
   and created_at < now() - interval '90 days';
```

---

## 9 · Menghapus akun atas permintaan pengguna

Pengguna bisa melakukannya sendiri di layar Akun. Lakukan manual hanya bila ia
tidak bisa masuk.

> 🔴 **DESTRUKTIF DAN PERMANEN.** Satu perintah menghapus transaksi, rollup,
> segel, klaim misi, dompet, langganan, dan seluruh riwayatnya. **Tidak ada
> pembatalan.** Backup Supabase adalah satu-satunya jalan pulang, dan ia
> mengembalikan SELURUH database, bukan satu akun.

```sql
-- WAJIB dilihat dulu — pastikan uuid-nya benar
select id, email, nama_usaha, created_at,
       (select count(*) from transactions t where t.user_id = u.id) as transaksi
  from users u where id = '<uuid>';

-- Baru hapus
delete from users where id = '<uuid>';
```

---

## 10 · Pemeriksaan kesehatan rutin

Tidak destruktif. Jalankan sesekali.

```sql
select 'pengguna'                as cek, count(*)::text from users
union all select 'tanpa dompet', count(*)::text from users u
  where not exists (select 1 from wallets w where w.user_id = u.id)
union all select 'premium aktif', count(*)::text from subscriptions
  where status <> 'tidak_aktif' and berakhir_at > now()
union all select 'masa coba berjalan', count(*)::text from subscriptions
  where status = 'masa_coba' and berakhir_at > now()
union all select 'pesanan menggantung >24 jam', count(*)::text
  from subscription_orders
 where status = 'pending' and created_at < now() - interval '24 hours'
union all select 'klaim misi menggantung', count(*)::text from mission_claims
  where status in ('queued','sending','submitted')
    and created_at < now() - interval '1 hour';
```

**Pesanan menggantung** berarti pengguna membuka pembayaran lalu tidak
menyelesaikannya — normal, dan tidak perlu disentuh. Yang perlu ditelusuri
adalah pesanan `pending` yang **sudah dibayar** menurut dashboard Midtrans:
itu berarti webhook tidak sampai. Perbaikannya:

```sql
-- Setelah MEMASTIKAN di dashboard Midtrans bahwa order_id ini benar lunas
select langganan_perpanjang(
  (select user_id from subscription_orders where midtrans_order_id = '<order_id>'),
  (select periode_hari from subscription_orders where midtrans_order_id = '<order_id>'),
  'manual');

update subscription_orders
   set status = 'paid', paid_at = now(), midtrans_status = 'settlement-manual'
 where midtrans_order_id = '<order_id>' and status <> 'paid';
```

> ⚠️ Jalankan **hanya sekali** per `order_id`. Menjalankannya dua kali
> memberi 60 hari untuk satu pembayaran. Pemeriksa `status <> 'paid'` di baris
> terakhir ada supaya kesalahan itu terlihat — kalau `UPDATE` mengubah 0 baris,
> berarti pesanan sudah pernah diproses dan **jangan** jalankan `SELECT
> langganan_perpanjang` di atasnya.
