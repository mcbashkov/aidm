"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquarePlus,
  Target,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { TransactionRow } from "@/components/transaksi/transaction-row";
import { useMe } from "@/components/providers/me-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { GagalMuat } from "@/components/ui/gagal-muat";
import type { Keadaan } from "@/lib/api/keadaan";
import { DEFAULT_MISSIONS } from "@/lib/missions";
import { ringkasHariIni, transaksiTerakhir } from "@/lib/mock/finance";
import { daftarTransaksi } from "@/lib/catat/client";
import {
  formatRupiah,
  formatRupiahCompact,
  formatTanggalPanjangID,
  type Transaction,
} from "@/lib/transactions";
import { cn } from "@/lib/utils";

interface DataBeranda {
  masuk: number;
  keluar: number;
  sisa: number;
  terakhir: Transaction[];
}

/** Tanggal hari ini menurut WIB. Tidak bergantung jaringan sama sekali —
 *  jam perangkat sudah cukup, jadi tidak ada alasan menundanya. */
function tanggalHariIniWib(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

/**
 * Beranda v3.0 (§13 layar 2). Maksimal 4 blok (aturan hierarki v2.0):
 * kartu hari ini · tombol Catat · misi hari ini · transaksi terakhir.
 *
 * ATURAN YANG MENGIKAT LAYAR INI: **nilai uang tidak pernah dirender sebelum
 * data aslinya tiba.** Sebelumnya `useState` diisi dataset mock, sehingga
 * render pertama menampilkan angka dan tanggal karangan (12 Agustus,
 * Rp614.000) yang sedetik kemudian berganti jadi angka asli. Untuk aplikasi
 * pembukuan itu bukan kekurangan kosmetik — pengguna sempat membaca saldo yang
 * bukan miliknya, dan angka yang salah selama satu detik tetap angka yang
 * salah. Mock sekarang HANYA dipakai bila server memang belum dikonfigurasi
 * (401/501), meniru pola yang sudah benar di `laporan-view.tsx`.
 */
export default function BerandaPage() {
  const me = useMe();

  const [keadaan, setKeadaan] = useState<Keadaan<DataBeranda>>({
    keadaan: "memuat",
  });
  const [percobaan, setPercobaan] = useState(0);

  // Tanggal dihitung langsung, tidak menunggu apa pun. Dulu ia ikut menunggu
  // hasil fetch, dan itulah kenapa header sempat menulis tanggal yang salah.
  const [tanggal] = useState(tanggalHariIniWib);

  const muat = useCallback(async () => {
    setKeadaan({ keadaan: "memuat" });
    const res = await daftarTransaksi({ pageSize: 3, ringkas: true });
    if (res.ok) {
      const r = res.data.ringkas_hari_ini;
      setKeadaan({
        keadaan: "terbaca",
        data: {
          masuk: r?.masuk ?? 0,
          keluar: r?.keluar ?? 0,
          sisa: r?.sisa ?? 0,
          terakhir: res.data.items,
        },
      });
    } else if (res.demo) {
      // Server memang belum dikonfigurasi (401/501) → dataset contoh, supaya
      // demo UI tetap hidup. Ini SATU-SATUNYA jalur yang boleh memakai mock.
      const mock = ringkasHariIni();
      setKeadaan({
        keadaan: "terbaca",
        data: {
          masuk: mock.masuk,
          keluar: mock.keluar,
          sisa: mock.sisa,
          terakhir: transaksiTerakhir(3),
        },
      });
    } else {
      // TIDAK menyetel nol. Nol adalah pernyataan tentang uang pengguna, dan
      // kita sedang tidak tahu apa-apa tentang uangnya.
      setKeadaan({ keadaan: "gagal", offline: res.offline });
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat, percobaan]);

  const data = keadaan.keadaan === "terbaca" ? keadaan.data : null;
  const surplus = (data?.sisa ?? 0) >= 0;

  /**
   * Sapaan sengaja TIDAK menunggu `useMe()` resolve, tapi juga tidak boleh
   * bergeser saat nama datang. Caranya: "Halo" dan emoji tetap di tempatnya,
   * dan nama disisipkan sebagai potongan tersendiri yang lebarnya tumbuh dari
   * nol. Yang berubah hanya sisipan itu — bukan seluruh baris ditulis ulang
   * dari "Halo 👋" menjadi "Halo, Bester 👋", yang membuat emoji melompat.
   */
  const nama = me?.user?.nama_usaha?.trim();

  return (
    <div className="space-y-section">
      <header>
        <p className="text-[13px] font-medium text-ink-subtle">
          {formatTanggalPanjangID(tanggal)}
        </p>
        <h1 className="mt-1">
          Halo
          {/* Nama muncul di sela "Halo" dan emoji. Emoji tidak pernah pindah
              baris atau melompat karena posisinya relatif terhadap potongan
              ini, bukan terhadap seluruh kalimat yang ditulis ulang. */}
          {nama ? <span>, {nama}</span> : null} 👋
        </h1>
      </header>

      {keadaan.keadaan === "gagal" ? (
        /* Keadaan gagal menggantikan SELURUH blok berdata: kartu hari ini,
           misi, dan transaksi terakhir. Tidak ada satu digit rupiah pun di
           sini, dan tidak ada kalimat "belum ada" — keduanya akan terbaca
           sebagai pernyataan tentang uang pengguna, padahal kita sedang tidak
           tahu apa-apa tentangnya. Tombol Catat tetap ditampilkan di bawah:
           mencatat tidak butuh jaringan. */
        <GagalMuat
          offline={keadaan.offline}
          onCobaLagi={() => setPercobaan((n) => n + 1)}
        />
      ) : (
      <>
      {/* Blok 1 — kartu hari ini */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-medium text-ink-subtle">
            Sisa hari ini
          </p>
          <Link
            href="/laporan"
            className="shrink-0 text-[12px] font-semibold text-gold-deep"
          >
            Lihat laporan
          </Link>
        </div>
        {data ? (
          <p
            className={cn(
              "num-display mt-1 text-[38px] leading-none",
              surplus ? "text-ink" : "text-danger",
            )}
          >
            {formatRupiah(data.sisa)}
          </p>
        ) : (
          // Tingginya dikunci setara baris angka 38px supaya kartu tidak
          // berubah tinggi saat angka tiba — skeleton yang menggeser tata
          // letak hanya memindahkan kejutan, bukan menghapusnya.
          <Skeleton className="mt-1 h-[38px] w-48" />
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-surface-warm p-2.5 sm:gap-2.5 sm:p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-success-tint sm:h-9 sm:w-9">
              <ArrowDownLeft className="h-4 w-4 text-success sm:h-5 sm:w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-ink-subtle">Masuk</p>
              {data ? (
                <p className="tnum truncate whitespace-nowrap text-[clamp(0.625rem,3.4vw,0.9375rem)] font-bold text-ink">
                  {formatRupiahCompact(data.masuk)}
                </p>
              ) : (
                <Skeleton className="mt-0.5 h-4 w-16" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-surface-warm p-2.5 sm:gap-2.5 sm:p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-danger-tint sm:h-9 sm:w-9">
              <ArrowUpRight className="h-4 w-4 text-danger sm:h-5 sm:w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-ink-subtle">Keluar</p>
              {data ? (
                <p className="tnum truncate whitespace-nowrap text-[clamp(0.625rem,3.4vw,0.9375rem)] font-bold text-ink">
                  {formatRupiahCompact(data.keluar)}
                </p>
              ) : (
                <Skeleton className="mt-0.5 h-4 w-16" />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Blok 3 — misi hari ini. Ikut disembunyikan saat gagal: judulnya
          menjanjikan keadaan HARI INI, dan kita tidak sedang bisa memastikan
          apa pun tentang hari ini. */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2>Misi hari ini</h2>
          <Link href="/misi" className="text-[13px] font-medium text-gold-deep">
            Lihat semua
          </Link>
        </div>
        <div className="space-y-2">
          {DEFAULT_MISSIONS.filter((m) => m.tipe === "daily")
            .slice(0, 2)
            .map((m) => (
              <div key={m.code} className="card flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-tint">
                  <Target className="h-5 w-5 text-gold-deep" aria-hidden />
                </span>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-ink">
                    {m.judul}
                  </p>
                  <p className="text-[12px] text-ink-subtle">{m.deskripsi}</p>
                </div>
                <span className="tnum rounded-pill bg-gold-tint px-2.5 py-1 text-[12px] font-bold text-gold-deep">
                  +{m.reward}
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* Blok 4 — transaksi terakhir */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2>Transaksi terakhir</h2>
          <Link
            href="/riwayat"
            className="flex items-center gap-0.5 text-[13px] font-medium text-gold-deep"
          >
            Riwayat
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        {data === null ? (
          // Tiga baris skeleton, sebanyak transaksi yang memang diminta —
          // supaya blok ini tidak menyusut lalu memanjang saat data tiba.
          <div className="card divide-y divide-line overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </div>
        ) : data.terakhir.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-tint">
              <Sparkles className="h-5 w-5 text-gold-deep" aria-hidden />
            </span>
            <p className="text-[14px] font-semibold text-ink">
              Belum ada transaksi
            </p>
            <p className="max-w-xs text-[13px] leading-relaxed text-ink-muted">
              Ceritakan penjualan atau pengeluaran pertamamu di tab Catat.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {data.terakhir.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </section>
      </>
      )}

      {/* Aksi utama — di luar cabang keadaan. Mencatat tidak butuh jaringan
          (antrean IndexedDB), jadi tombol ini justru paling berguna persis
          saat data gagal dimuat. */}
      <Link href="/catat" className="btn-primary">
        <MessageSquarePlus className="h-5 w-5" aria-hidden />
        Catat transaksi
      </Link>
    </div>
  );
}
