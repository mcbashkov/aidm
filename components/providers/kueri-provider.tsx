"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { ApiHasil } from "@/lib/api/panggil";
import type { HasilKueri } from "@/lib/api/keadaan";

/**
 * Cache pembacaan sisi klien — satu mekanisme untuk seluruh tab.
 *
 * Masalah yang diselesaikannya: setiap layar memegang `useState` sendiri, jadi
 * berpindah tab meng-unmount komponennya dan seluruh datanya hilang. Kembali ke
 * Beranda berarti skeleton dari nol; kembali ke Catat berarti "Belum ada
 * catatan hari ini" untuk hari yang jelas-jelas sudah ada catatannya. Cache
 * ini hidup di `AppLayout`, DI ATAS halaman, sehingga ia bertahan melintasi
 * navigasi antar tab (navigasi klien `next/link` hanya mengganti `children`).
 *
 * Kenapa ditulis sendiri, bukan SWR (diputuskan PO 2026-08-26): SWR
 * mempertahankan `data` lama sambil menyalakan `error`, dan konsumennya bebas
 * menampilkan keduanya sekaligus tanpa mengatakan apa-apa kepada pengguna.
 * Di aplikasi pembukuan itu persis pola yang baru saja kita berantas di P0-1.
 * Di sini "data lama" hanya bisa keluar lewat satu pintu — `tersinkron: false`
 * — sehingga layar tidak bisa diam-diam menampilkannya sebagai kabar terbaru.
 *
 * Yang WAJIB ada karena PWA ini sering dibuka-tutup:
 *   · revalidate-on-focus — kembali ke tab/aplikasi, periksa diam-diam
 *   · revalidate-on-reconnect — online lagi, periksa diam-diam
 * Keduanya SELALU di belakang layar: fase "memuat" tidak pernah muncul selama
 * masih ada salinan yang bisa ditampilkan.
 */

type Entri =
  | { jenis: "data"; data: unknown; pada: number; tersinkron: boolean }
  | { jenis: "gagal"; offline: boolean };

/** Umur maksimum sebelum sebuah salinan dianggap layak diperiksa ulang. */
const STALE_BAWAAN_MS = 30_000;

class Toko {
  private peta = new Map<string, Entri>();
  private pendengar = new Map<string, Set<() => void>>();
  /** Permintaan yang sedang mengudara — penjaga dedupe. Dua komponen yang
   *  meminta kunci sama pada saat yang sama menembak server SEKALI. */
  private berjalan = new Map<string, Promise<void>>();
  /** Pengambil terbaru per kunci, supaya revalidasi dari fokus/online tahu
   *  cara mengambil ulang tanpa komponennya ikut campur. */
  private pengambil = new Map<string, () => Promise<ApiHasil<unknown>>>();

  langgan(kunci: string, fn: () => void): () => void {
    const set = this.pendengar.get(kunci) ?? new Set();
    set.add(fn);
    this.pendengar.set(kunci, set);
    return () => {
      set.delete(fn);
      if (set.size === 0) this.pendengar.delete(kunci);
    };
  }

  baca(kunci: string): Entri | undefined {
    return this.peta.get(kunci);
  }

  private siarkan(kunci: string) {
    for (const fn of this.pendengar.get(kunci) ?? []) fn();
  }

  private tulis(kunci: string, entri: Entri) {
    this.peta.set(kunci, entri);
    this.siarkan(kunci);
  }

  daftarkan(kunci: string, ambil: () => Promise<ApiHasil<unknown>>) {
    this.pengambil.set(kunci, ambil);
  }

  /** Kunci yang sedang ditonton komponen mana pun. Revalidasi latar hanya
   *  menyentuh ini — tab yang tidak sedang dilihat tidak perlu ditembak. */
  kunciAktif(): string[] {
    return [...this.pendengar.keys()];
  }

  /**
   * Pastikan ada data untuk `kunci`. Mengambil hanya bila belum ada salinan,
   * salinannya sudah lewat `staleMs`, atau `paksa`. Tidak pernah mengubah
   * keadaan menjadi "memuat" saat salinan lama masih ada.
   */
  async pastikan(kunci: string, staleMs: number, paksa = false): Promise<void> {
    const ada = this.peta.get(kunci);
    if (!paksa && ada?.jenis === "data" && Date.now() - ada.pada < staleMs) {
      return;
    }
    const sedang = this.berjalan.get(kunci);
    if (sedang) return sedang;

    const ambil = this.pengambil.get(kunci);
    if (!ambil) return;

    const tugas = (async () => {
      const res = await ambil();
      if (res.ok) {
        this.tulis(kunci, {
          jenis: "data",
          data: res.data,
          pada: Date.now(),
          tersinkron: true,
        });
        return;
      }
      const lama = this.peta.get(kunci);
      if (lama?.jenis === "data") {
        // INILAH pengecualian yang disengaja: catatan pengguna yang sudah
        // pernah tampil TIDAK dikosongkan hanya karena satu pembacaan gagal.
        // Ia ditahan dan ditandai belum tersinkron — layar tetap berguna, dan
        // tetap jujur. Mengosongkannya justru akan mengulang bug P0-1:
        // kegagalan jaringan terbaca sebagai "catatanmu tidak ada".
        this.tulis(kunci, { ...lama, tersinkron: false });
        return;
      }
      this.tulis(kunci, { jenis: "gagal", offline: res.offline });
    })().finally(() => {
      this.berjalan.delete(kunci);
    });

    this.berjalan.set(kunci, tugas);
    return tugas;
  }

  /** Buang satu kunci sehingga pembacaan berikutnya benar-benar segar. */
  batalkan(kunci: string) {
    this.peta.delete(kunci);
    this.siarkan(kunci);
  }
}

const KueriCtx = createContext<Toko | null>(null);

export function KueriProvider({ children }: { children: ReactNode }) {
  const toko = useMemo(() => new Toko(), []);

  useEffect(() => {
    // Revalidasi diam-diam saat pengguna kembali. `visibilitychange` menangkap
    // kembalinya dari aplikasi lain di ponsel; `focus` menangkap perpindahan
    // jendela di desktop. Keduanya dipasang karena tidak satu pun menutupi
    // seluruh kasus, dan `pastikan` sudah menjaga agar keduanya tidak menembak
    // dua kali (dedupe permintaan berjalan + ambang stale).
    const saatKembali = () => {
      if (document.visibilityState === "hidden") return;
      for (const k of toko.kunciAktif()) void toko.pastikan(k, STALE_BAWAAN_MS);
    };
    // Online lagi = paksa, tanpa memandang umur salinan: yang paling mungkin
    // terjadi selama offline justru perubahan yang belum kita lihat, dan
    // salinan bertanda "belum tersinkron" harus lekas kehilangan tandanya.
    const saatOnline = () => {
      for (const k of toko.kunciAktif()) void toko.pastikan(k, 0, true);
    };

    document.addEventListener("visibilitychange", saatKembali);
    window.addEventListener("focus", saatKembali);
    window.addEventListener("online", saatOnline);
    return () => {
      document.removeEventListener("visibilitychange", saatKembali);
      window.removeEventListener("focus", saatKembali);
      window.removeEventListener("online", saatOnline);
    };
  }, [toko]);

  return <KueriCtx.Provider value={toko}>{children}</KueriCtx.Provider>;
}

/**
 * Baca sebuah kunci lewat cache bersama.
 *
 * `ambil` boleh berganti identitas tiap render — yang dipakai selalu versi
 * terakhir, dan ia TIDAK menjadi dependensi efek. Kalau ia jadi dependensi,
 * setiap render induk akan memicu pengambilan baru, yaitu persis kelas bug yang
 * membuat orang menaruh `useCallback` di mana-mana lalu tetap kebocoran.
 */
export function useKueri<T>(
  kunci: string,
  ambil: () => Promise<ApiHasil<T>>,
  opsi?: { staleMs?: number },
): HasilKueri<T> {
  const toko = useContext(KueriCtx);
  if (!toko) {
    throw new Error("useKueri harus dipakai di dalam <KueriProvider>.");
  }
  const staleMs = opsi?.staleMs ?? STALE_BAWAAN_MS;

  const ambilRef = useRef(ambil);

  // Pendaftaran & penyegaran ref dilakukan di EFEK, bukan saat render: menulis
  // ke toko bersama selama render adalah efek samping yang bisa dijalankan dua
  // kali oleh React (Strict Mode, render yang dibuang). Urutan efek di bawah
  // yang menjamin pengambil sudah terdaftar sebelum `pastikan` memakainya.
  useEffect(() => {
    ambilRef.current = ambil;
    toko.daftarkan(kunci, () => ambilRef.current() as Promise<ApiHasil<unknown>>);
  });

  const entri = useSyncExternalStore(
    useCallback((cb) => toko.langgan(kunci, cb), [toko, kunci]),
    useCallback(() => toko.baca(kunci), [toko, kunci]),
    // Snapshot server: selalu kosong. Cache ini murni milik browser.
    () => undefined,
  );

  useEffect(() => {
    void toko.pastikan(kunci, staleMs);
  }, [toko, kunci, staleMs]);

  const muatUlang = useCallback(() => {
    void toko.pastikan(kunci, 0, true);
  }, [toko, kunci]);

  if (!entri) return { keadaan: "memuat" };
  if (entri.jenis === "gagal") {
    return { keadaan: "gagal", offline: entri.offline, muatUlang };
  }
  return {
    keadaan: "terbaca",
    data: entri.data as T,
    tersinkron: entri.tersinkron,
    pada: entri.pada,
    muatUlang,
  };
}

/** Buang cache sebuah kunci — dipakai setelah menulis, supaya pembacaan
 *  berikutnya benar-benar dari server. */
export function useBatalkanKueri(): (kunci: string) => void {
  const toko = useContext(KueriCtx);
  return useCallback(
    (kunci: string) => toko?.batalkan(kunci),
    [toko],
  );
}
