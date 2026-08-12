import { redirect } from "next/navigation";

/**
 * Rute lama v2.0. Riset menjadi fitur premium di v3.0 (§7.8) — tautan lama,
 * shortcut PWA yang sudah terpasang, dan bookmark pengguna tetap sampai.
 */
export default function RisetLegacyPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q;
  redirect(q ? `/premium/riset?q=${encodeURIComponent(q)}` : "/premium/riset");
}
