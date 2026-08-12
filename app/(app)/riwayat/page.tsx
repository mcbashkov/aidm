import type { Metadata } from "next";
import { RiwayatView } from "@/components/transaksi/riwayat-view";

export const metadata: Metadata = { title: "Riwayat" };

export default function RiwayatPage() {
  return <RiwayatView />;
}
