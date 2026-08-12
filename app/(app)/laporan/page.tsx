import type { Metadata } from "next";
import { LaporanView } from "@/components/laporan/laporan-view";

export const metadata: Metadata = { title: "Laporan" };

export default function LaporanPage() {
  return <LaporanView />;
}
