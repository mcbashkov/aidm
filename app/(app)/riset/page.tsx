import type { Metadata } from "next";
import { RisetView } from "@/components/research/riset-view";

export const metadata: Metadata = { title: "Riset" };

export default function RisetPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  return <RisetView initialQuery={searchParams.q ?? ""} />;
}
