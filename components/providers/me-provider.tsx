"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
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
  } | null;
  wallet?: { address?: string } | null;
  langganan?: Langganan;
}

const MeContext = createContext<Me | null>(null);
const SaldoContext = createContext<SaldoIdmx>({ keadaan: "memuat" });

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
 */
export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [saldo, setSaldo] = useState<SaldoIdmx>({ keadaan: "memuat" });
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: Me) => {
        if (active) setMe(d);
      })
      .catch(() => {
        if (active) setMe({ authenticated: false });
      });
    return () => {
      active = false;
    };
  }, [pathname]);

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

/** Profil pengguna saat ini; `null` selama fetch pertama. */
export function useMe(): Me | null {
  return useContext(MeContext);
}

/** Saldo IDMX on-chain dalam tiga keadaan: memuat · terbaca · gagal. */
export function useSaldoIdmx(): SaldoIdmx {
  return useContext(SaldoContext);
}
