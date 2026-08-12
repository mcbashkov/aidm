/**
 * Peran penghasilan (§7.1 layar peran, kolom `users.earner_type`).
 *
 * Menggantikan `role` v2.0 ('calon'|'umkm'). Definisi mengikuti perluasan
 * negara atas pelaku mikro (Perpres 27/2026) — karena itu ojol berdiri
 * sebagai perannya sendiri, bukan diselipkan ke "jasa".
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

export function catatChips(earner?: string | null): string[] {
  const key = (earner ?? "lainnya") as EarnerType;
  return CATAT_CHIPS[key] ?? CATAT_CHIPS.lainnya;
}
