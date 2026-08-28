import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { Splash } from "@/components/auth/splash";

// Membaca cookie = rute ini tidak bisa dibekukan saat build.
export const dynamic = "force-dynamic";

/**
 * Akar situs: splash pembuka, lalu /masuk.
 *
 * Splash HANYA untuk yang belum punya sesi. Pengguna yang sudah masuk
 * dilewatkan langsung ke Beranda seperti sebelumnya — memaksa mereka menonton
 * dua detik logo lalu mendarat di layar masuk (yang akan memantulkannya lagi)
 * adalah kemunduran, bukan sambutan. Cookie sesi dibaca di server, jadi
 * keputusannya sudah selesai sebelum satu piksel pun dikirim.
 */
export default function RootPage() {
  if (cookies().has(SESSION_COOKIE)) redirect("/beranda");
  return <Splash />;
}
