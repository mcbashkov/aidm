/**
 * Peran penghasilan (§7.1 layar peran, kolom `users.earner_type`).
 *
 * Menggantikan `role` v2.0 ('calon'|'umkm'). Ojol berdiri sebagai perannya
 * sendiri, bukan diselipkan ke "jasa": bentuk penghasilan dan potongannya
 * (setoran, bensin, servis, pulsa) berbeda dari dagang maupun jasa, dan
 * Perpres 27/2026 (Pelindungan Ekosistem Transportasi Berbasis Platform
 * Digital) mengakui mereka sebagai mitra yang berhak atas catatan pendapatan
 * per layanan dari aplikator — bukan kewajiban pencatatan bagi UMKM.
 */

import {
  Store,
  Bike,
  Laptop,
  ShoppingBag,
  CircleEllipsis,
  type LucideIcon,
} from "lucide-react";

export type EarnerType = "dagang" | "ojol" | "freelance" | "online" | "lainnya";

export interface EarnerOption {
  value: EarnerType;
  title: string;
  desc: string;
  icon: LucideIcon;
}

export const EARNER_OPTIONS: EarnerOption[] = [
  {
    value: "dagang",
    title: "Dagang / warung",
    desc: "Jualan makanan, minuman, sembako, atau toko.",
    icon: Store,
  },
  {
    value: "ojol",
    title: "Ojek online",
    desc: "Narik motor atau mobil, penghasilan harian.",
    icon: Bike,
  },
  {
    value: "freelance",
    title: "Freelance / jasa",
    desc: "Kerja lepas, jasa desain, servis, atau les.",
    icon: Laptop,
  },
  {
    value: "online",
    title: "Jualan online",
    desc: "Marketplace, media sosial, atau reseller.",
    icon: ShoppingBag,
  },
  {
    value: "lainnya",
    title: "Lainnya",
    desc: "Belum masuk kategori di atas.",
    icon: CircleEllipsis,
  },
];

export function earnerLabel(value?: string | null): string {
  return (
    EARNER_OPTIONS.find((o) => o.value === value)?.title ?? "Belum diatur"
  );
}

/**
 * Chip saran kontekstual di tab Catat (§7.2 alur #7). Kalimat ditulis persis
 * seperti yang akan diucapkan pengguna, supaya ketukan chip = contoh cara
 * memakai fitur, bukan sekadar tombol pintas.
 */
export const CATAT_CHIPS: Record<EarnerType, string[]> = {
  dagang: [
    "Penjualan hari ini 350rb",
    "Belanja stok 120rb",
    "Bayar listrik 85rb",
    "Jual 3 nasi goreng 45rb bayar QRIS",
  ],
  ojol: [
    "Narik hari ini dapet 180rb",
    "Isi bensin 25rb",
    "Servis motor 150rb",
    "Beli pulsa 20rb",
  ],
  freelance: [
    "Dibayar klien 2,5jt transfer",
    "Beli lisensi software 300rb",
    "Ongkos meeting 50rb",
    "Termin kedua proyek 1,5jt",
  ],
  online: [
    "Penjualan Shopee hari ini 450rb",
    "Bayar iklan 100rb",
    "Ongkir 35rb",
    "Restock barang 800rb",
  ],
  lainnya: [
    "Pemasukan hari ini 200rb",
    "Pengeluaran 50rb",
    "Terima transfer 1jt",
    "Beli keperluan 75rb",
  ],
};

/**
 * Chip per peran × bidang usaha (slug `lib/categories.ts`).
 *
 * Peran menentukan BENTUK penghasilan, bidang usaha menentukan BARANGNYA —
 * dan keduanya dipilih terpisah di onboarding. "Freelance / jasa" yang
 * bidangnya Kuliner menjual katering, bukan lisensi software; "Dagang" yang
 * bidangnya Fashion menjual gamis, bukan nasi goreng. Hanya pasangan yang
 * kalimatnya benar-benar berbeda yang ditulis; sisanya jatuh ke chip peran.
 * Ojol sengaja tidak punya baris: bidang usaha tidak mengubah apa pun di sana.
 *
 * Setiap kalimat ditulis supaya parser (LLM maupun fallback) membacanya
 * dengan benar: nominal dalam format Indonesia, kata metode bayar bila ada,
 * tanpa peristiwa yang belum didukung (kasbon, stok) — chip adalah contoh
 * pemakaian, dan contoh yang menghasilkan kartu salah lebih buruk daripada
 * tidak ada contoh.
 */
const CATAT_CHIPS_BIDANG: Partial<
  Record<EarnerType, Record<string, string[]>>
> = {
  dagang: {
    kuliner: [
      "Jual 3 nasi goreng 45rb bayar QRIS",
      "Belanja bahan 120rb",
      "Penjualan hari ini 350rb",
      "Bayar gas 25rb",
    ],
    "kelontong-retail": [
      "Penjualan hari ini 500rb",
      "Kulakan sembako 1,2jt",
      "Bayar listrik 85rb",
      "Ambil uang untuk dapur 50rb",
    ],
    fashion: [
      "Jual 2 gamis 300rb transfer",
      "Beli bahan kain 500rb",
      "Ongkir ke pembeli 20rb",
      "Penjualan hari ini 450rb",
    ],
    kecantikan: [
      "Jual skincare 250rb QRIS",
      "Restock produk 1,5jt",
      "Penjualan hari ini 400rb",
      "Bayar iklan 50rb",
    ],
    kriya: [
      "Jual 5 hampers 750rb transfer",
      "Beli bahan kerajinan 200rb",
      "DP pesanan 500rb",
      "Ongkir 35rb",
    ],
    "agri-fresh": [
      "Jual sayur hari ini 300rb",
      "Beli bibit 150rb",
      "Ongkos angkut 50rb",
      "Jual ke pengepul 1,2jt transfer",
    ],
  },
  freelance: {
    kuliner: [
      "Katering 50 porsi 1,5jt transfer",
      "Belanja bahan 600rb",
      "Bayar tenaga bantu 150rb",
      "DP pesanan 500rb",
    ],
    jasa: [
      "Dibayar klien 2,5jt transfer",
      "DP servis 300rb",
      "Beli sparepart 150rb",
      "Ongkos ke lokasi 50rb",
    ],
    kecantikan: [
      "Jasa makeup 500rb transfer",
      "Beli alat makeup 300rb",
      "DP rias pengantin 1jt",
      "Ongkos ke klien 50rb",
    ],
    kriya: [
      "Pesanan custom 800rb transfer",
      "Beli bahan 250rb",
      "DP pesanan 400rb",
      "Ongkir 35rb",
    ],
    fashion: [
      "Jahit 2 baju 400rb",
      "Beli kain 300rb",
      "DP jahitan 200rb",
      "Bayar listrik 85rb",
    ],
    digital: [
      "Dibayar klien 2,5jt transfer",
      "Beli lisensi software 300rb",
      "Ongkos meeting 50rb",
      "Termin kedua proyek 1,5jt",
    ],
  },
  online: {
    kuliner: [
      "Pesanan GoFood hari ini 400rb",
      "Belanja bahan 150rb",
      "Biaya admin GoFood 40rb",
      "Beli kemasan 60rb",
    ],
    fashion: [
      "Penjualan Shopee hari ini 450rb",
      "Restock barang 800rb",
      "Bayar iklan 100rb",
      "Ongkir 35rb",
    ],
    kecantikan: [
      "Penjualan TikTok Shop 600rb",
      "Restock produk 1,5jt",
      "Bayar iklan 100rb",
      "Ongkir 35rb",
    ],
    kriya: [
      "Pesanan Tokopedia 350rb",
      "Beli bahan 200rb",
      "Ongkir 35rb",
      "Bayar iklan 50rb",
    ],
    "agri-fresh": [
      "Pesanan sayur online 250rb",
      "Beli dari petani 150rb",
      "Ongkir 25rb",
      "Beli kemasan 30rb",
    ],
    "kelontong-retail": [
      "Penjualan Shopee hari ini 500rb",
      "Kulakan 1,2jt",
      "Ongkir 35rb",
      "Bayar iklan 50rb",
    ],
    digital: [
      "Jual produk digital 150rb transfer",
      "Bayar langganan tools 100rb",
      "Bayar iklan 100rb",
      "Komisi afiliasi 75rb",
    ],
  },
};

/**
 * Chip contoh untuk pengguna: pasangan peran × bidang bila ada, kalau tidak
 * chip peran. `kategori` adalah `kategori_slug` dari profil; boleh kosong
 * (profil lama / belum lengkap) dan hasilnya sama seperti sebelum perluasan.
 */
export function catatChips(
  earner?: string | null,
  kategori?: string | null,
): string[] {
  const key = (earner ?? "lainnya") as EarnerType;
  const perBidang = kategori ? CATAT_CHIPS_BIDANG[key]?.[kategori] : undefined;
  return perBidang ?? CATAT_CHIPS[key] ?? CATAT_CHIPS.lainnya;
}
