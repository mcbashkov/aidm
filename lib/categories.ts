/**
 * Taksonomi tetap 9 kategori usaha (§7.1 / tabel `categories` §10). Dipakai di
 * onboarding, profil, dan konteks agen. Sinkron dengan seed migrasi.
 */
export interface Category {
  slug: string;
  nama: string;
  sub: string[];
}

export const CATEGORIES: Category[] = [
  {
    slug: "kuliner",
    nama: "Kuliner",
    sub: ["Makanan siap saji", "Minuman", "Frozen food", "Kue & bakery", "Bumbu & sambal"],
  },
  {
    slug: "fashion",
    nama: "Fashion",
    sub: ["Pakaian wanita", "Pakaian pria", "Hijab", "Aksesori", "Sepatu & tas"],
  },
  {
    slug: "kecantikan",
    nama: "Kecantikan",
    sub: ["Skincare", "Makeup", "Parfum", "Perawatan rambut"],
  },
  {
    slug: "kriya",
    nama: "Kriya",
    sub: ["Kerajinan tangan", "Dekorasi rumah", "Hampers", "Custom gift"],
  },
  {
    slug: "agri-fresh",
    nama: "Agri/Fresh",
    sub: ["Sayur & buah", "Hasil tani", "Tanaman hias", "Produk segar"],
  },
  {
    slug: "jasa",
    nama: "Jasa",
    sub: ["Kecantikan & spa", "Reparasi", "Desain & digital", "Les & pelatihan"],
  },
  {
    slug: "digital",
    nama: "Digital",
    sub: ["Produk digital", "Aplikasi & tools", "Konten & kelas online"],
  },
  {
    slug: "kelontong-retail",
    nama: "Kelontong/Retail",
    sub: ["Sembako", "Toko kelontong", "Grosir", "ATK"],
  },
  {
    slug: "lainnya",
    nama: "Lainnya",
    sub: ["Lainnya"],
  },
];
