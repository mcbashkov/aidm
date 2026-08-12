import { redirect } from "next/navigation";

/** Rute lama v2.0 → generator konten kini fitur premium (§7.8). */
export default function KontenLegacyPage() {
  redirect("/premium/konten");
}
