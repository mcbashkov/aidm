import type { Metadata } from "next";
import { CatatView } from "@/components/catat/catat-view";

export const metadata: Metadata = { title: "Catat" };

/**
 * Tab inti v3.0 (§7.2). `earnerType` masih dipatok ke 'dagang' sampai profil
 * dibaca dari /api/me — chip saran sudah kontekstual per peran begitu nilainya
 * mengalir masuk.
 */
export default function CatatPage() {
  return <CatatView earnerType="dagang" />;
}
