"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, PenLine, Check, ChevronRight, Sparkles } from "lucide-react";
import {
  KUOTA_BULANAN,
  MASA_COBA_HARI,
  AMBANG_PERINGATAN,
  premiumAktif,
  sisaHari,
  type FiturPremium,
  type Langganan,
} from "@/lib/langganan";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GagalMuat } from "@/components/ui/gagal-muat";
import { TautanLegal } from "@/components/layout/tautan-legal";
import { useMe } from "@/components/providers/me-provider";
import { KATALOG, PLUS_BERKAS_MAKS, formatHargaIdr, labelBerkasPeran } from "@/lib/langganan/katalog";

const HARGA_PLUS = formatHargaIdr(KATALOG.plus.hargaIdr);

/**
 * Etalase Premium — satu harga, satu tombol.
 *
 * Menggantikan model Kredit AI. Yang hilang bukan cuma angkanya: hilang juga
 * matematika yang dituntut dari pengguna sebelum ia boleh memakai satu fitur
 * (berapa kredit saya, berapa harga fitur ini, kapan hangus). Yang tersisa
 * adalah satu keputusan.
 *
 * Kuota 30 riset + 60 konten SENGAJA tidak ditampilkan sebagai penghitung.
 * Ia pagar anti-abuse, dan pengguna normal tidak boleh pernah memikirkannya —
 * angkanya baru muncul ketika sisanya benar-benar menipis.
 */

interface Muatan {
  langganan: Langganan;
  pemakaian: Record<FiturPremium, number>;
}

type Keadaan =
  | { k: "memuat" }
  | { k: "terbaca"; data: Muatan }
  | { k: "gagal" };

const FITUR = [
  {
    href: "/premium/riset",
    icon: Search,
    judul: "Riset Tren",
    desc: "Tren TikTok, Google Trends, dan harga marketplace — diriset langsung.",
  },
  {
    href: "/premium/konten",
    icon: PenLine,
    judul: "Generator Konten",
    desc: "Skrip TikTok, caption IG, promo WA, kalender konten 7 hari.",
  },
] as const;

const GRATIS_SELAMANYA = [
  "Catat transaksi — ketik atau ucapkan",
  "Laporan keuangan & unduh PDF",
  "Kesiapan Catatan",
  "Misi & reward IDMX",
  "Segel laporan on-chain",
];

export function PremiumView() {
  const me = useMe();
  const earnerType = me?.user?.earner_type ?? null;
  const [keadaan, setKeadaan] = useState<Keadaan>({ k: "memuat" });
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setKeadaan({ k: "memuat" });
    try {
      const res = await fetch("/api/langganan", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setKeadaan({ k: "terbaca", data: (await res.json()) as Muatan });
    } catch {
      // Kegagalan TIDAK diterjemahkan jadi "belum berlangganan" — itu akan
      // menyodorkan ajakan bayar kepada orang yang sudah membayar.
      setKeadaan({ k: "gagal" });
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const mulaiCoba = useCallback(async () => {
    setGalat(null);
    setSibuk(true);
    try {
      const res = await fetch("/api/langganan", { method: "POST" });
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(body.message ?? body.error ?? "gagal");
      await muat();
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Belum bisa dimulai. Coba lagi ya.");
    } finally {
      setSibuk(false);
    }
  }, [muat]);

  const bayar = useCallback(async () => {
    setGalat(null);
    setSibuk(true);
    try {
      const res = await fetch("/api/langganan/bayar", { method: "POST" });
      const body = (await res.json()) as { redirectUrl?: string; error?: string };
      if (!res.ok || !body.redirectUrl) {
        throw new Error(body.error ?? "Pembayaran belum bisa dibuka.");
      }
      window.location.href = body.redirectUrl;
    } catch (e) {
      setGalat(e instanceof Error ? e.message : "Pembayaran belum bisa dibuka.");
      setSibuk(false);
    }
  }, []);

  if (keadaan.k === "memuat") {
    return (
      <div className="space-y-section">
        <Kepala />
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-24 w-full rounded-card" />
      </div>
    );
  }

  if (keadaan.k === "gagal") {
    return (
      <div className="space-y-section">
        <Kepala />
        <GagalMuat
          offline={typeof navigator !== "undefined" && !navigator.onLine}
          onCobaLagi={() => void muat()}
        />
      </div>
    );
  }

  const { langganan, pemakaian } = keadaan.data;
  const aktif = premiumAktif(langganan);
  const sisa = sisaHari(langganan);

  return (
    <div className="space-y-section">
      <Kepala />

      {/* Urutan §1.3 poin 6: Berkas (label peran) → Plus → Pajak (Fase B) →
          "Termasuk dalam Plus" → yang tetap gratis. */}
      <KartuBerkas earnerType={earnerType} />

      {aktif ? (
        <KartuAktif langganan={langganan} sisa={sisa} onBayar={() => void bayar()} sibuk={sibuk} />
      ) : (
        <KartuTawaran
          cobaDipakai={langganan.cobaDipakai}
          sibuk={sibuk}
          onCoba={() => void mulaiCoba()}
          onBayar={() => void bayar()}
        />
      )}

      {KATALOG.pajak.tersedia ? <KartuPajak /> : null}

      {galat ? (
        <p role="alert" className="rounded-card bg-gold-tint px-4 py-3 text-center text-[13px] text-ink-muted">
          {galat}
        </p>
      ) : null}

      <div className="space-y-2">
        <h2 className="px-1">Termasuk dalam Plus</h2>
        {FITUR.map(({ href, icon: Icon, judul, desc }) => (
          <Link
            key={href}
            href={href}
            className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-float"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-tint">
              <Icon className="h-6 w-6 text-gold-deep" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block font-serif text-card-title font-semibold text-ink">
                {judul}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">
                {desc}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
          </Link>
        ))}
      </div>

      {aktif ? <Pagar pemakaian={pemakaian} /> : null}

      <div className="card space-y-3 p-5">
        <h3>Yang tetap gratis, selamanya</h3>
        <ul className="space-y-2">
          {GRATIS_SELAMANYA.map((t) => (
            <li key={t} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-muted">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
        <p className="text-[12px] leading-relaxed text-ink-subtle">
          Yang berbayar hanya dokumen untuk pihak luar dan Plus. Mencatat,
          laporan, dan Kesiapan Catatan tidak pernah dipungut biaya.
        </p>
      </div>
    </div>
  );
}

function Kepala() {
  return (
    <header>
      <h1>Premium</h1>
      <p className="mt-1 text-[13px] text-ink-subtle">
        Berkas untuk pengajuan ke bank, dan Plus setahun untuk semuanya.
      </p>
    </header>
  );
}

/**
 * Berkas Pengajuan di etalase (§1.3 poin 6). Dibuat lewat pintu Laporan —
 * di sana pratinjaunya dari data nyata; di sini hanya harga dan tautan.
 */
function KartuBerkas({ earnerType }: { earnerType: string | null }) {
  return (
    <div className="card space-y-3 p-5">
      <h3>{labelBerkasPeran(earnerType, 6)} · {labelBerkasPeran(earnerType, 12).replace(/^.*?(\d+ Bulan)$/, "$1")}</h3>
      <p className="text-[13px] leading-relaxed text-ink-muted">
        Rekap bulanan, rincian harian, dan halaman notarisasi dalam satu PDF
        yang bisa langsung dibaca bank. Sekali bayar per dokumen:{" "}
        <span className="tnum font-semibold text-ink">{formatHargaIdr(KATALOG.berkas6.hargaIdr)}</span> (6 bulan) ·{" "}
        <span className="tnum font-semibold text-ink">{formatHargaIdr(KATALOG.berkas12.hargaIdr)}</span> (12 bulan).
        Termasuk dalam Plus (maks {PLUS_BERKAS_MAKS} dokumen setahun).
      </p>
      <Link href="/laporan#kesiapan" className="btn-primary">
        Lihat pratinjau di Laporan
      </Link>
    </div>
  );
}

/** Paket Pajak Tahunan (Fase B, Batch 9) — termasuk dalam Plus. */
function KartuPajak() {
  return (
    <Link href="/laporan#pajak" className="card block space-y-2 p-5 transition-shadow hover:shadow-float">
      <div className="flex items-center justify-between gap-3">
        <h3>{KATALOG.pajak.nama}</h3>
        <span className="tnum shrink-0 rounded-pill bg-gold-tint px-3 py-1 text-[12px] font-semibold text-gold-deep">
          {formatHargaIdr(KATALOG.pajak.hargaIdr)}/tahun pajak
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-muted">
        Untuk wajib pajak orang pribadi: kalkulator setoran PPh Final 0,5% setelah omzet melewati Rp500 juta, pengingat
        tanggal 15, PDF Rincian Peredaran Bruto per Bulan (bahan pengisian SPT), dan Surat Pernyataan Omzet di Bawah
        Rp500 Juta — keduanya ter-notarisasi. Termasuk dalam Plus. Baris omzet tahun ini di Laporan tetap gratis.
      </p>
      <p className="text-[12px] text-ink-subtle">Bukan nasihat pajak. Cocokkan dengan Coretax atau konsultan pajak.</p>
    </Link>
  );
}

function KartuAktif({
  langganan,
  sisa,
  onBayar,
  sibuk,
}: {
  langganan: Langganan;
  sisa: number | null;
  onBayar: () => void;
  sibuk: boolean;
}) {
  const coba = langganan.status === "masa_coba";
  const tanggal = langganan.berakhirAt
    ? new Date(langganan.berakhirAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold-deep" aria-hidden />
        <h3>{coba ? "Masa coba berjalan" : "AIDM Plus aktif"}</h3>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-muted">
        {coba
          ? `Kamu sedang mencoba Plus gratis. ${sisa !== null ? `Sisa ${sisa} hari` : ""}${tanggal ? ` — sampai ${tanggal}` : ""}.`
          : `Aktif sampai ${tanggal ?? "—"}${sisa !== null ? ` (${sisa} hari lagi)` : ""}.`}
      </p>
      <Button size="lg" fullWidth onClick={onBayar} disabled={sibuk}>
        {sibuk ? "Membuka pembayaran…" : coba ? `Lanjut Plus ${HARGA_PLUS}/tahun` : `Perpanjang ${HARGA_PLUS}/tahun`}
      </Button>
      <p className="text-center text-[12px] text-ink-subtle">
        {coba
          ? "Masa coba berhenti sendiri. Tidak ada tagihan otomatis."
          : "Perpanjangan menambah 365 hari dari sisa yang masih berjalan."}
      </p>
    </div>
  );
}

function KartuTawaran({
  cobaDipakai,
  sibuk,
  onCoba,
  onBayar,
}: {
  cobaDipakai: boolean;
  sibuk: boolean;
  onCoba: () => void;
  onBayar: () => void;
}) {
  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-[32px] font-semibold leading-none text-ink">
          {HARGA_PLUS}
        </span>
        <span className="text-[14px] text-ink-muted">/tahun</span>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-muted">
        AIDM Plus: Berkas Pengajuan tanpa bayar per dokumen (maks {PLUS_BERKAS_MAKS} setahun),
        Riset Tren, dan Generator Konten. Sekali bayar untuk satu tahun — tidak
        ada tagihan otomatis, tidak ada kontrak.
      </p>

      {cobaDipakai ? (
        <Button size="lg" fullWidth onClick={onBayar} disabled={sibuk}>
          {sibuk ? "Membuka pembayaran…" : `Plus ${HARGA_PLUS}/tahun`}
        </Button>
      ) : (
        <>
          <Button size="lg" fullWidth onClick={onCoba} disabled={sibuk}>
            {sibuk ? "Menyiapkan…" : `Coba gratis ${MASA_COBA_HARI} hari`}
          </Button>
          <button
            type="button"
            onClick={onBayar}
            disabled={sibuk}
            className="w-full py-1 text-center text-[13px] font-semibold text-gold-deep disabled:opacity-40"
          >
            Langsung Plus {HARGA_PLUS}/tahun
          </button>
        </>
      )}

      <p className="text-center text-[12px] text-ink-subtle">
        {cobaDipakai
          ? "Sekali bayar untuk 365 hari. Tidak ada tagihan otomatis."
          : "Tanpa kartu kredit. Masa coba berhenti sendiri."}
      </p>

      {/* Tepat di bawah tombol bayar, bukan di kaki halaman: syarat dan
          kebijakan pengembalian dana paling relevan justru pada detik
          seseorang memutuskan membayar. */}
      <TautanLegal ringkas className="pt-1" />
    </div>
  );
}

/**
 * Pagar wajar. Ditampilkan sebagai KETERANGAN, bukan penghitung — dan hanya
 * menonjol ketika sisanya benar-benar menipis.
 */
function Pagar({ pemakaian }: { pemakaian: Record<FiturPremium, number> }) {
  const sisaRiset = KUOTA_BULANAN.riset - (pemakaian.riset ?? 0);
  const sisaKonten = KUOTA_BULANAN.konten - (pemakaian.konten ?? 0);
  const menipis =
    sisaRiset <= AMBANG_PERINGATAN || sisaKonten <= AMBANG_PERINGATAN;

  if (menipis) {
    return (
      <p className="rounded-card bg-gold-tint px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
        Bulan ini tersisa <strong className="text-ink">{sisaRiset} riset</strong> dan{" "}
        <strong className="text-ink">{sisaKonten} konten</strong>. Kuotanya pulih
        awal bulan depan.
      </p>
    );
  }
  return (
    <p className="px-1 text-[12px] leading-relaxed text-ink-subtle">
      Batas wajar {KUOTA_BULANAN.riset} riset dan {KUOTA_BULANAN.konten} konten
      per bulan — jauh di atas pemakaian normal.
    </p>
  );
}
