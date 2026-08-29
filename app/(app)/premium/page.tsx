import type { Metadata } from "next";
import { PremiumView } from "@/components/premium/premium-view";

export const metadata: Metadata = { title: "Premium" };

/** Etalase Premium (§13 layar 10). Isinya klien karena status langganan
 *  hanya bisa dijawab setelah sesi diketahui. */
export default function PremiumPage() {
  return <PremiumView />;
}
