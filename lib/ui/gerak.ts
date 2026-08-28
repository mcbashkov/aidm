"use client";

import { useSyncExternalStore } from "react";

/**
 * Apakah pengguna meminta gerak dikurangi (`prefers-reduced-motion: reduce`).
 *
 * CSS sudah menangani animasi yang murni dekoratif lewat media query. Hook ini
 * untuk gerak yang digerakkan JAVASCRIPT — carousel yang berdetak sendiri,
 * penundaan splash — yang tidak bisa dimatikan dari stylesheet. Mematikan
 * animasinya di CSS tapi membiarkan timernya jalan menghasilkan yang terburuk
 * dari keduanya: layar berpindah isi tanpa peralihan yang menjelaskan.
 *
 * Nilainya DIPANTAU, bukan dibaca sekali: preferensi ini bisa diubah pengguna
 * saat aplikasi terbuka (mis. lewat pengaturan aksesibilitas sistem).
 */

const KUERI = "(prefers-reduced-motion: reduce)";

function langgan(ubah: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(KUERI);
  mq.addEventListener("change", ubah);
  return () => mq.removeEventListener("change", ubah);
}

function baca(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(KUERI).matches;
}

/** Di server preferensinya tidak bisa diketahui. Jawaban `false` dipilih
 *  karena ia hanya berlaku sampai hidrasi, dan React langsung menggambar ulang
 *  dengan nilai asli begitu klien menyala. */
const diServer = () => false;

export function useGerakBerkurang(): boolean {
  return useSyncExternalStore(langgan, baca, diServer);
}
