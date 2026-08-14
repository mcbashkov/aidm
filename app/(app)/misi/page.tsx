import type { Metadata } from "next";
import { MisiView } from "@/components/misi/misi-view";

export const metadata: Metadata = { title: "Misi & Reward" };

export default function MisiPage() {
  return <MisiView />;
}
