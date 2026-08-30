"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useKueri } from "@/components/providers/kueri-provider";
import { panggil } from "@/lib/api/panggil";
import type { HasilKueri } from "@/lib/api/keadaan";
import type { SaldoIdmx, SaldoResponse } from "@/lib/token/tipe";
import type { Langganan } from "@/lib/langganan";

export interface Me {
  authenticated: boolean;
  user?: {
    role?: string;
    earner_type?: string;
    nama_usaha?: string;
    kategori_slug?: string;
    kota?: string;
    gaya_bahasa?: string;
  } | null;
  wallet?: { address?: string } | null;
  langganan?: Langganan;
}

const MeContext = createContext<HasilKueri<Me>>({ keadaan: "memuat" });
const SaldoContext = createContext<SaldoIdmx>({ keadaan: "memuat" });

/** Kunci cache identitas — satu untuk seluruh aplikasi. */
export const KUNCI_ME = "me";

/**
 * Sumber data shell aplikasi — DUA jalur yang sengaja tidak saling menunggu.
 *
 *   /api/me            Postgres. Nama usaha, peran, langganan. Selalu tersedia,
 *                      selesai dalam milidetik.
 *   /api/wallet/saldo  RPC opBNB. Bisa lambat sampai 2,5 detik, bisa gagal.
 *
 * Dulu keduanya satu permintaan, dan akibatnya terlihat di layar: sapaan
 * pengguna tertahan menunggu pembacaan rantai, padahal namanya sudah ada di
 * database sejak awal. Memisahkannya berarti kegagalan RPC hanya menyentuh
 * satu angka — nama, langganan, dan sisa layar tidak ikut terseret.
 *
 * Keduanya dibaca sekali di sini, bukan di tiap komponen. Header selalu
 * ter-mount lewat app layout, jadi hook per-komponen akan menembak endpoint
 * yang sama dua kali begitu halaman Akun terbuka.
 *
 * IDENTITAS KINI LEWAT CACHE (`KueriProvider`), dan itu memperbaiki dua hal
 * yang terlihat di produksi:
 *
 *   1. Sapaan "Halo 👋" tanpa nama selama beberapa detik SETIAP kali halaman
 *      dimuat, lalu berubah jadi "Halo, Warung Abadi 👋". Dulu identitas
 *      diambil ulang dari nol pada tiap perpindahan tab (`[pathname]`) dan
 *      disimpan di `useState` yang ikut hilang saat unmount. Sekarang salinan
 *      terakhir tersaji seketika, dan pemeriksaan ke server jalan di belakang.
 *   2. `/api/me` ditembak TIGA kali per muat halaman Akun — dari sini, dari
 *      halaman Akun sendiri, dan dari daftar Pengaturan. Log produksi
 *      menunjukkannya berulang beberapa kali dalam detik yang sama. Kini satu
 *      kunci cache melayani ketiganya.
 *
 * Yang TIDAK ikut cache: saldo on-chain. Ia sengaja kembali ke "memuat" pada
 * tiap navigasi — angka rantai yang lama tidak boleh sempat terbaca sebagai
 * angka halaman baru.
 */
export function MeProvider({ children }: { children: ReactNode }) {
  const [saldo, setSaldo] = useState<SaldoIdmx>({ keadaan: "memuat" });
  const pathname = usePathname();

  const ambilMe = useCallback(() => panggil<Me>("/api/me"), []);
  const me = useKueri<Me>(KUNCI_ME, ambilMe);

  useEffect(() => {
    let active = true;
    // Kembali ke "memuat" tiap navigasi supaya angka lama tidak sempat
    // terbaca sebagai angka halaman baru sebelum permintaannya selesai.
    setSaldo({ keadaan: "memuat" });
    fetch("/api/wallet/saldo")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
      .then((d: SaldoResponse) => {
        if (!active) return;
        // `null` dari server berarti rantai tidak bisa dipastikan — itu
        // kegagalan, bukan saldo nol.
        setSaldo(
          typeof d.idmx === "number"
            ? { keadaan: "terbaca", nilai: d.idmx }
            : { keadaan: "gagal" },
        );
      })
      .catch(() => {
        // Sengaja ditelan di sini, tidak dilempar ulang: melemparnya akan
        // menaikkan error ke error boundary terdekat dan menjatuhkan seluruh
        // shell aplikasi hanya karena satu angka tidak terbaca.
        if (active) setSaldo({ keadaan: "gagal" });
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <MeContext.Provider value={me}>
      <SaldoContext.Provider value={saldo}>{children}</SaldoContext.Provider>
    </MeContext.Provider>
  );
}

/**
 * Profil pengguna dalam TIGA keadaan — memuat · terbaca · gagal.
 *
 * Layar yang membedakan "belum terbaca" dari "tidak ada" wajib memakai ini.
 * Kartu Wallet contohnya: dulu ia menyimpulkan "sedang memuat" dari
 * `me === null`, dan karena `null` juga berarti "gagal", satu permintaan yang
 * tersendat membuat layarnya menunggu tanpa akhir.
 */
export function useMeKeadaan(): HasilKueri<Me> {
  return useContext(MeContext);
}

/**
 * Bentuk ringkas: data bila sudah terbaca, `null` bila belum.
 *
 * Dipakai layar yang memang tidak perlu membedakan gagal dari memuat — header,
 * misalnya, yang cukup menampilkan shimmer pada keduanya. Layar yang PERLU
 * membedakannya harus memakai `useMeKeadaan()`.
 */
export function useMe(): Me | null {
  const k = useContext(MeContext);
  return k.keadaan === "terbaca" ? k.data : null;
}

/** Saldo IDMX on-chain dalam tiga keadaan: memuat · terbaca · gagal. */
export function useSaldoIdmx(): SaldoIdmx {
  return useContext(SaldoContext);
}
