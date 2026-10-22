import type { Metadata } from "next";
import { VerifikasiView } from "@/components/publik/verifikasi-view";

export const metadata: Metadata = {
  title: "Verifikasi dokumen",
  description: "Periksa keaslian Berkas Pengajuan yang diterbitkan lewat AIDM.",
  robots: { index: false, follow: false },
};

/** /verifikasi/<kode> — publik, tanpa sesi, tanpa data keuangan (§1.5). */
export default function VerifikasiPage({ params }: { params: { kode: string } }) {
  return <VerifikasiView kode={params.kode} />;
}
