"use client";

import { useEffect, useState } from "react";
import { useGerakBerkurang } from "@/lib/ui/gerak";

/**
 * Carousel verba kinetik di layar masuk — Catat → Lapor → Segel → Unduh.
 *
 * Empat kata itu adalah seluruh janji produk dalam empat ketukan, dan
 * urutannya bukan hiasan: ia persis urutan yang dialami pengguna. Karena itu
 * yang berputar adalah KATA KERJA, bukan tangkapan layar fitur.
 *
 * TEKNIK LOOP (disalin dari mockup docs/mockups/aidm-onboarding-fuse.html).
 * Daftar dicetak TIGA KALI lalu digulir dari salinan tengah. Saat penunjuk
 * mencapai kata pertama salinan ketiga, ia dikembalikan ke kata pertama
 * salinan kedua TANPA animasi. Karena keduanya kata yang sama persis di posisi
 * layar yang sama persis, lompatan itu tidak terlihat — dan gulirannya tidak
 * pernah "mundur cepat" seperti carousel yang me-reset ke indeks nol.
 *
 * Tiga angka di bawah saling terikat dengan CSS di globals.css:
 *   BARIS   tinggi satu kata (.ob-word height)
 *   PENANDA jarak kata aktif dari tepi atas carousel — harus jatuh di dalam
 *           jendela mask (24%–70%), kalau tidak kata aktif ikut memudar
 * Ubah salah satu, periksa ketiganya.
 */

const BARIS = 74;
const PENANDA = 128;
const SALINAN = 3;
const DIAM_MS = 1500;
const GESER_MS = 600;

interface Verba {
  teks: string;
  ikon: React.ReactNode;
}

/** Ikon garis, mewarisi `currentColor` supaya emasnya diatur CSS. */
const sifatGaris = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.1,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const VERBA: Verba[] = [
  {
    teks: "Catat",
    ikon: (
      <svg {...sifatGaris}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    teks: "Lapor",
    ikon: (
      <svg {...sifatGaris}>
        <path d="M3 3v18h18" />
        <rect x="7" y="11" width="3" height="6" rx="1" />
        <rect x="12.5" y="7" width="3" height="10" rx="1" />
        <rect x="18" y="13" width="3" height="4" rx="1" />
      </svg>
    ),
  },
  {
    teks: "Segel",
    ikon: (
      <svg {...sifatGaris}>
        <path d="M12 2 4 5v6c0 5 3.4 8.3 8 11 4.6-2.7 8-6 8-11V5Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    teks: "Unduh",
    ikon: (
      <svg {...sifatGaris}>
        <path d="M12 3v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    ),
  },
];

const N = VERBA.length;
/** Awal salinan tengah — titik jangkar seluruh perhitungan. */
const AWAL = N;

export function CarouselVerba() {
  const gerakBerkurang = useGerakBerkurang();
  const [pos, setPos] = useState({ indeks: AWAL, animasi: false });

  // Satu detak per DIAM_MS. Interval sengaja TIDAK dihentikan saat menyentuh
  // batas: pengembalian senyap di bawah sudah selesai jauh sebelum detak
  // berikutnya (630 ms < 1500 ms), jadi detak itu berangkat dari salinan
  // tengah yang benar.
  useEffect(() => {
    if (gerakBerkurang) return;
    const detak = setInterval(() => {
      setPos((p) => ({ indeks: p.indeks + 1, animasi: true }));
    }, DIAM_MS);
    return () => clearInterval(detak);
  }, [gerakBerkurang]);

  // Pengembalian senyap: begitu geseran ke kata pertama salinan KETIGA selesai,
  // penunjuk dipindah ke kata identik di salinan kedua dengan transisi mati.
  useEffect(() => {
    if (pos.indeks < AWAL + N) return;
    const t = setTimeout(
      () => setPos({ indeks: AWAL, animasi: false }),
      GESER_MS + 30,
    );
    return () => clearTimeout(t);
  }, [pos.indeks]);

  const geser = PENANDA - (pos.indeks * BARIS + BARIS / 2);
  const kata = Array.from({ length: SALINAN * N }, (_, i) => ({
    ...VERBA[i % N],
    kunci: i,
  }));

  return (
    <div className="ob-carousel">
      {/*
        Pembaca layar tidak boleh mendengar "Catat Lapor Segel Unduh" tiga kali
        — tiga salinan itu murni siasat visual. Satu kalimat ringkas yang
        menyampaikan maksudnya menggantikan seluruh daftar.
      */}
      <span className="sr-only">
        Catat, lapor, segel, unduh — empat langkah di AIDM.
      </span>
      <div
        aria-hidden
        className="ob-track"
        style={{
          transform: `translateY(${geser}px)`,
          transition: pos.animasi
            ? `transform ${GESER_MS}ms cubic-bezier(.5,0,.15,1)`
            : "none",
        }}
      >
        {kata.map((v, i) => (
          <div
            key={v.kunci}
            className={`ob-word${i === pos.indeks ? " ob-word--aktif" : ""}`}
          >
            <span className="ob-word__ico">{v.ikon}</span>
            <span>{v.teks}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
