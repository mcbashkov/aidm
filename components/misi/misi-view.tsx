"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Target,
  Info,
  Check,
  ExternalLink,
  LoaderCircle,
  WifiOff,
} from "lucide-react";
import {
  DEFAULT_MISSIONS,
  CAP_HARIAN_IDMX,
  CAP_BULANAN_IDMX,
  type MisiProgress,
  type MisiResponse,
} from "@/lib/missions";
import { ambilMisi, klaimMisi } from "@/lib/missions/client";
import { cn } from "@/lib/utils";

const TIPE_LABEL: Record<string, string> = {
  daily: "harian",
  weekly: "mingguan",
  monthly: "bulanan",
  once: "sekali",
};

/** Bentuk demo: seluruh misi tampil dengan progres nol, klaim mati. */
function misiDemo(): MisiResponse {
  return {
    misi: DEFAULT_MISSIONS.map((d) => ({
      ...d,
      progress: 0,
      selesai: false,
      periodKey: "demo",
      diklaim: false,
    })),
    capHarian: { terpakai: 0, batas: CAP_HARIAN_IDMX },
    capBulanan: { terpakai: 0, batas: CAP_BULANAN_IDMX },
    klaimSiap: false,
  };
}

function KartuMisi({
  m,
  memproses,
  onKlaim,
}: {
  m: MisiProgress;
  memproses: boolean;
  onKlaim: () => void;
}) {
  const rasio = m.target > 0 ? Math.min(1, m.progress / m.target) : 0;
  const bisaKlaim = m.selesai && !m.diklaim && !m.alasanTerkunci && !memproses;

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            m.diklaim ? "bg-success/15" : "bg-gold-tint",
          )}
        >
          {m.diklaim ? (
            <Check className="h-6 w-6 text-success" aria-hidden />
          ) : (
            <Target className="h-6 w-6 text-gold-deep" aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-ink">{m.judul}</p>
            <span className="rounded-pill bg-surface-warm px-2.5 py-1 text-[10px] uppercase tracking-wide text-ink-muted">
              {TIPE_LABEL[m.tipe] ?? m.tipe}
            </span>
          </div>
          <p className="text-[12px] text-ink-subtle">{m.deskripsi}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="tnum text-[13px] font-bold text-gold-deep">
            +{m.reward}
          </span>
          {m.diklaim ? (
            <span className="rounded-pill bg-success/15 px-3 py-1.5 text-[11px] font-semibold text-success">
              {m.statusKlaim === "confirmed" ? "Diklaim" : "Diproses…"}
            </span>
          ) : (
            <button
              type="button"
              onClick={onKlaim}
              disabled={!bisaKlaim}
              title={m.alasanTerkunci}
              className="flex min-h-[32px] items-center gap-1.5 rounded-pill bg-cta px-3.5 py-1.5 text-[11px] font-semibold text-ink-invert disabled:opacity-40"
            >
              {memproses ? (
                <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden />
              ) : null}
              Klaim
            </button>
          )}
        </div>
      </div>

      {/* Bar progres hanya untuk misi yang punya hitungan bertahap. */}
      {m.target > 1 && !m.diklaim ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-warm">
            <div
              className={cn(
                "h-full rounded-pill",
                m.selesai ? "bg-success" : "bg-gold-gradient",
              )}
              style={{ width: `${Math.round(rasio * 100)}%` }}
            />
          </div>
          <span className="tnum shrink-0 text-[11px] text-ink-subtle">
            {m.progress}/{m.target}
          </span>
        </div>
      ) : null}

      {m.explorerTx ? (
        <a
          href={m.explorerTx}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold-deep"
        >
          Lihat transaksi di opBNBScan
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      ) : null}

      {m.alasanTerkunci && !m.diklaim ? (
        <p className="text-[11px] leading-relaxed text-ink-subtle">
          {m.alasanTerkunci}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Tab Misi & Reward (§7.6 / §13).
 *
 * Progres datang utuh dari server yang menghitungnya ulang dari catatan nyata
 * — layar ini tidak pernah menyimpulkan sendiri apakah sebuah reward layak
 * dibayar.
 */
export function MisiView() {
  const [data, setData] = useState<MisiResponse | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [demo, setDemo] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [galatKlaim, setGalatKlaim] = useState<string | null>(null);
  const [sedangKlaim, setSedangKlaim] = useState<string | null>(null);
  const [percobaan, setPercobaan] = useState(0);
  const reqSeq = useRef(0);

  useEffect(() => {
    const seq = ++reqSeq.current;
    setMemuat(true);
    setGalat(null);
    void ambilMisi().then((res) => {
      if (seq !== reqSeq.current) return;
      if (res.ok) {
        setDemo(false);
        setData(res.data);
      } else if (res.demo) {
        setDemo(true);
        setData(misiDemo());
      } else {
        setData(null);
        setGalat(
          res.offline
            ? "Kamu sedang offline. Progres misi dihitung di server."
            : "Gagal memuat misi. Coba lagi sebentar lagi.",
        );
      }
      setMemuat(false);
    });
  }, [percobaan]);

  const klaim = useCallback(async (code: string) => {
    setSedangKlaim(code);
    setGalatKlaim(null);
    const res = await klaimMisi(code);
    if (res.ok) {
      // Muat ulang dari server supaya status & cap datang dari satu sumber.
      setPercobaan((n) => n + 1);
    } else {
      setGalatKlaim(
        res.offline ? "Kamu sedang offline — klaim butuh koneksi." : res.error,
      );
    }
    setSedangKlaim(null);
  }, []);

  const totalHarian = DEFAULT_MISSIONS.filter((m) => m.tipe === "daily").reduce(
    (s, m) => s + m.reward,
    0,
  );

  return (
    <div className="space-y-section">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1>Misi &amp; Reward</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            Dibayar untuk kebiasaan mencatat.
          </p>
        </div>
        <span className="tnum shrink-0 rounded-pill bg-gold-tint px-3 py-1.5 text-[13px] font-bold text-gold-deep">
          +{totalHarian} / hari
        </span>
      </header>

      {data && !demo ? (
        <div className="card space-y-2 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-semibold text-ink">Jatah hari ini</p>
            <p className="tnum text-[13px] text-ink-muted">
              {data.capHarian.terpakai} / {data.capHarian.batas} IDMX
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-pill bg-surface-warm">
            <div
              className="h-full rounded-pill bg-gold-gradient"
              style={{
                width: `${Math.round(
                  Math.min(
                    1,
                    data.capHarian.terpakai / Math.max(1, data.capHarian.batas),
                  ) * 100,
                )}%`,
              }}
            />
          </div>
          <p className="text-[11px] leading-relaxed text-ink-subtle">
            Misi bulanan punya jatah tersendiri ({data.capBulanan.terpakai}/
            {data.capBulanan.batas} IDMX), di luar batas harian ini.
          </p>
        </div>
      ) : null}

      {galatKlaim ? (
        <p role="alert" className="card p-4 text-[13px] text-danger">
          {galatKlaim}
        </p>
      ) : null}

      {memuat && !data ? (
        <div className="space-y-2">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-20 w-full" />
        </div>
      ) : galat ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <WifiOff className="h-8 w-8 text-ink-subtle" aria-hidden />
          <h2>Misi belum bisa ditampilkan</h2>
          <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted">
            {galat}
          </p>
          <button
            type="button"
            onClick={() => setPercobaan((n) => n + 1)}
            className="btn-primary mt-2 max-w-[220px]"
          >
            Coba lagi
          </button>
        </div>
      ) : data ? (
        <div className="space-y-2">
          {data.misi.map((m) => (
            <KartuMisi
              key={m.code}
              m={m}
              memproses={sedangKlaim === m.code}
              onKlaim={() => void klaim(m.code)}
            />
          ))}
        </div>
      ) : null}

      <div className="card space-y-2 p-5">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gold-deep" aria-hidden />
          <h3>Apa itu IDMX &amp; IDM Reborn?</h3>
        </div>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          <strong>IDMX</strong> adalah poin reward dari aktivitas nyata di AIDM
          — terutama mencatat. Kamu bisa menukarnya menjadi{" "}
          <strong>IDM Reborn</strong>, token utama ekosistem, lewat pool resmi
          di aplikasi. Maksimal {CAP_HARIAN_IDMX} IDMX per hari.
        </p>
        <p className="text-[12px] leading-relaxed text-ink-subtle">
          Transaksi yang dihapus membatalkan progres misi terkait — reward
          mengikuti catatan yang benar-benar dipakai.
        </p>
      </div>
    </div>
  );
}
