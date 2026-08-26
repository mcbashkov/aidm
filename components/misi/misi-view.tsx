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
import { bisaDicobaLagi } from "@/lib/missions/galat";
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
  galatLokal,
  onKlaim,
}: {
  m: MisiProgress;
  memproses: boolean;
  /** Penolakan terakhir yang TIDAK layak dicoba ulang (sudah diklaim, jatah
   *  habis). Selama terisi, tombolnya mati — menawarkan ketukan yang pasti
   *  ditolak lagi hanya memindahkan kegagalan, bukan menghilangkannya. */
  galatLokal?: string;
  onKlaim: () => void;
}) {
  // HANYA `confirmed` yang berarti IDMX sudah berpindah. Selama belum, tidak
  // ada centang dan tidak ada kata "Diklaim" — layar tidak boleh mendahului
  // rantai, sebab yang dijanjikannya adalah uang.
  const tuntas = m.statusKlaim === "confirmed";
  const diproses = m.diklaim && !tuntas;
  const rasio = m.target > 0 ? Math.min(1, m.progress / m.target) : 0;
  const bisaKlaim =
    m.selesai && !m.diklaim && !m.alasanTerkunci && !galatLokal && !memproses;

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
            tuntas ? "bg-success/15" : "bg-gold-tint",
          )}
        >
          {tuntas ? (
            <Check className="h-6 w-6 text-success" aria-hidden />
          ) : diproses ? (
            <LoaderCircle
              className="h-5 w-5 animate-spin text-gold-deep"
              aria-hidden
            />
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
            <span
              className={cn(
                "rounded-pill px-3 py-1.5 text-[11px] font-semibold",
                tuntas
                  ? "bg-success/15 text-success"
                  : "bg-surface-warm text-ink-muted",
              )}
            >
              {tuntas ? "Diklaim" : "Diproses…"}
            </span>
          ) : (
            <button
              type="button"
              onClick={onKlaim}
              disabled={!bisaKlaim}
              title={m.alasanTerkunci ?? galatLokal}
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

      {diproses ? (
        <p className="text-[11px] leading-relaxed text-ink-subtle">
          Reward sedang dikirim ke dompetmu. Aman ditinggal — statusnya tetap
          benar saat kamu buka lagi.
        </p>
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

      {(m.alasanTerkunci ?? galatLokal) && !m.diklaim ? (
        <p className="text-[11px] leading-relaxed text-ink-subtle">
          {m.alasanTerkunci ?? galatLokal}
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
  // Misi yang ditolak dengan alasan yang tidak akan berubah oleh ketukan
  // berikutnya (sudah diklaim, jatah habis) — kode → kalimat penolakan.
  const [kunciGagal, setKunciGagal] = useState<Record<string, string>>({});
  const [percobaan, setPercobaan] = useState(0);
  const reqSeq = useRef(0);
  // Penjaga klaim ganda. HARUS ref, bukan state: dua ketukan dalam satu frame
  // sama-sama membaca state lama (React belum sempat menggambar ulang tombol
  // yang sudah disabled), sedangkan ref berubah seketika di ketukan pertama.
  const klaimBerjalan = useRef<string | null>(null);

  useEffect(() => {
    const seq = ++reqSeq.current;
    setMemuat(true);
    setGalat(null);
    // Catatan: `data` sengaja TIDAK dikosongkan di sini. Muat ulang berkala
    // (polling status klaim) akan mengedipkan seluruh daftar jadi skeleton
    // kalau dikosongkan, dan kedipan tiap 15 detik terbaca sebagai kerusakan.
    void ambilMisi().then((res) => {
      if (seq !== reqSeq.current) return;
      if (res.ok) {
        setDemo(false);
        setData(res.data);
        // Kunci lokal hanya menambal jendela antara penolakan dan pembacaan
        // ulang. Begitu server berbicara, dialah yang berwenang: kalau ia
        // masih menolak, `diklaim`/`alasanTerkunci` yang mematikan tombol.
        // Membiarkan kunci lokal hidup lebih lama akan mematikan tombol di
        // hari berikutnya, saat misinya sudah layak diklaim lagi.
        setKunciGagal({});
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
    // Diambil SEBELUM await pertama — inilah yang menutup ketukan ganda.
    if (klaimBerjalan.current) return;
    klaimBerjalan.current = code;

    setSedangKlaim(code);
    setGalatKlaim(null);
    try {
      const res = await klaimMisi(code);
      if (res.ok) {
        // Muat ulang dari server supaya status & cap datang dari satu sumber.
        setPercobaan((n) => n + 1);
        return;
      }

      const pesan = res.offline
        ? "Kamu sedang offline — klaim butuh koneksi."
        : res.error;
      setGalatKlaim(pesan);

      // Offline selalu layak dicoba ulang; selebihnya taksonomi yang memutuskan
      // (lib/missions/galat.ts), bukan daftar kedua di layar ini.
      if (!res.offline && !bisaDicobaLagi(res.kode)) {
        setKunciGagal((k) => ({ ...k, [code]: pesan }));
        // Penolakan permanen berarti server tahu sesuatu yang layar ini belum
        // tahu — mis. klaimnya memang sudah tercatat. Muat ulang supaya kartu
        // menampilkan keadaan sebenarnya, bukan sekadar tombol mati.
        setPercobaan((n) => n + 1);
      }
    } finally {
      setSedangKlaim(null);
      klaimBerjalan.current = null;
    }
  }, []);

  // Selama ada klaim yang belum tuntas, muat ulang berkala: relayer berjalan
  // tiap menit, dan tanpa ini "Diproses…" hanya berubah kalau pengguna kebetulan
  // membuka tab ini lagi. Berhenti sendiri begitu tidak ada lagi yang berjalan
  // — bukan interval abadi yang menembak server tanpa alasan.
  const adaBerjalan = Boolean(
    data?.misi.some((m) => m.diklaim && m.statusKlaim !== "confirmed"),
  );
  useEffect(() => {
    if (!adaBerjalan || demo) return;
    const t = setInterval(() => setPercobaan((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, [adaBerjalan, demo]);

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
              galatLokal={kunciGagal[m.code]}
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
