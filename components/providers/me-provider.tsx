"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

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
  credits?: number;
  /** Saldo IDMX on-chain. `null`/undefined = belum bisa dipastikan (RPC gagal
   *  atau kontrak belum dikonfigurasi) — sengaja dibedakan dari nol. */
  idmx?: number | null;
}

const MeContext = createContext<Me | null>(null);

/**
 * Satu sumber data profil + saldo untuk shell aplikasi (header desktop &
 * mobile, sapaan Beranda). Di-fetch sekali per navigasi supaya sisa kredit
 * tetap segar setelah dipakai di layar lain.
 */
export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
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

  return <MeContext.Provider value={me}>{children}</MeContext.Provider>;
}

/** Profil pengguna saat ini; `null` selama fetch pertama. */
export function useMe(): Me | null {
  return useContext(MeContext);
}
