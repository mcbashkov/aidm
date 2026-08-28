"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useGerakBerkurang } from "@/lib/ui/gerak";

/**
 * Splash pembuka — logo IDM di atas cream, lalu masuk ke /masuk sendiri.
 *
 * Latarnya CREAM, bukan hitam. Layar hitam pembuka adalah kebiasaan aplikasi
 * hiburan; di aplikasi pembukuan ia terbaca seperti layar mati. Cream juga
 * berarti tidak ada kedipan gelap→terang saat berpindah ke layar masuk.
 *
 * Seluruh layar bisa diketuk untuk melewati. Splash yang tidak bisa dilewati
 * mengubah dua detik menjadi pajak yang dibayar setiap kali membuka aplikasi.
 */

const TAHAN_MS = 2000;
/** Tanpa animasi tidak ada yang perlu ditunggu — jeda ini hanya supaya
 *  perpindahannya tidak terasa seperti kedipan. */
const TAHAN_DIAM_MS = 700;

export function Splash() {
  const router = useRouter();
  const gerakBerkurang = useGerakBerkurang();
  const sudahJalan = useRef(false);

  const keMasuk = useCallback(() => {
    // Ketukan bisa datang tepat saat pewaktu berbunyi. Tanpa penjaga ini,
    // dua `replace` berangkat dan yang kedua bisa menimpa navigasi pertama.
    if (sudahJalan.current) return;
    sudahJalan.current = true;
    router.replace("/masuk");
  }, [router]);

  useEffect(() => {
    // Dimuat lebih awal supaya perpindahannya tidak menampilkan layar kosong
    // di jaringan lambat — inti dari splash adalah menutupi jeda ini.
    router.prefetch("/masuk");
    const t = setTimeout(keMasuk, gerakBerkurang ? TAHAN_DIAM_MS : TAHAN_MS);
    return () => clearTimeout(t);
  }, [router, keMasuk, gerakBerkurang]);

  return (
    <div
      className="onboarding ob-splash"
      onClick={keMasuk}
      // Bukan tombol, tapi tetap harus bisa dilewati dari papan ketik:
      // pengguna yang menekan Enter/Spasi mendapat hasil yang sama.
      role="button"
      tabIndex={0}
      aria-label="Lewati pembuka, lanjut ke halaman masuk"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          keMasuk();
        }
      }}
    >
      {/* `priority`: ini gambar LCP layar pertama — menunda pemuatannya
          membuat splash menampilkan cream kosong selama animasinya berjalan. */}
      <Image
        className="ob-splash__logo"
        src="/logo-idm.png"
        alt=""
        width={820}
        height={820}
        priority
      />
      <div className="ob-splash__wordmark">
        <span className="ob-splash__brand">AIDM</span>
        <span className="ob-splash__by">powered by IDM Token</span>
      </div>
    </div>
  );
}
