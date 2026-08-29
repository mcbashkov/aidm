"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Video, Instagram, MessageCircle, CalendarDays, Copy, Check } from "lucide-react";
import {
  BATAS_TOPIK,
  FORMAT_KONTEN,
  type FormatKonten,
  type HasilKonten,
} from "@/lib/konten";
import { Button } from "@/components/ui/button";

/**
 * Generator Konten (§7.8).
 *
 * Satu topik + satu format → teks siap tempel. Tidak ada penghitung kuota di
 * layar ini: pagar 60/bulan adalah urusan server, dan menampilkannya di sini
 * hanya akan membuat orang berhitung sebelum menulis.
 */

const IKON: Record<FormatKonten, typeof Video> = {
  tiktok_script: Video,
  ig_caption: Instagram,
  promo_copy: MessageCircle,
  calendar7: CalendarDays,
};

const URUTAN: FormatKonten[] = [
  "tiktok_script",
  "ig_caption",
  "promo_copy",
  "calendar7",
];

type Keadaan =
  | { k: "diam" }
  | { k: "membuat" }
  | { k: "jadi"; hasil: HasilKonten }
  | { k: "gagal"; pesan: string; perluPremium?: boolean };

export function KontenView() {
  const [format, setFormat] = useState<FormatKonten>("tiktok_script");
  const [topik, setTopik] = useState("");
  const [keadaan, setKeadaan] = useState<Keadaan>({ k: "diam" });

  const buat = useCallback(async () => {
    const isi = topik.trim();
    if (isi.length < 3) return;
    setKeadaan({ k: "membuat" });
    try {
      const res = await fetch("/api/konten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, topik: isi }),
      });
      const body = (await res.json()) as {
        hasil?: HasilKonten;
        message?: string;
        error?: string;
        code?: string;
      };
      if (res.status === 402) {
        setKeadaan({
          k: "gagal",
          pesan: body.message ?? "Generator Konten ada di paket Premium.",
          perluPremium: true,
        });
        return;
      }
      if (!res.ok || !body.hasil) {
        setKeadaan({
          k: "gagal",
          pesan: body.message ?? body.error ?? "Kontennya belum bisa dibuat.",
        });
        return;
      }
      setKeadaan({ k: "jadi", hasil: body.hasil });
    } catch {
      setKeadaan({ k: "gagal", pesan: "Sambungan terputus. Coba lagi ya." });
    }
  }, [format, topik]);

  const sibuk = keadaan.k === "membuat";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {URUTAN.map((f) => {
          const Icon = IKON[f];
          const aktif = f === format;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              aria-pressed={aktif}
              className={[
                "flex items-start gap-3 rounded-card border p-4 text-left transition-colors",
                aktif
                  ? "border-gold-deep bg-gold-tint"
                  : "border-line bg-surface hover:bg-surface-warm",
              ].join(" ")}
            >
              <Icon
                className={aktif ? "mt-0.5 h-5 w-5 shrink-0 text-gold-deep" : "mt-0.5 h-5 w-5 shrink-0 text-ink-subtle"}
                aria-hidden
              />
              <span>
                <span className="block text-[13px] font-semibold text-ink">
                  {FORMAT_KONTEN[f].judul}
                </span>
                <span className="block text-[12px] leading-snug text-ink-subtle">
                  {FORMAT_KONTEN[f].keterangan}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!sibuk) void buat();
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">
            Mau konten tentang apa?
          </span>
          <textarea
            value={topik}
            onChange={(e) => setTopik(e.target.value.slice(0, BATAS_TOPIK))}
            rows={3}
            placeholder="Contoh: promo nasi goreng gratis es teh untuk pembeli pertama tiap hari"
            className="w-full resize-none rounded-card border border-line bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep"
          />
        </label>
        <Button
          size="lg"
          fullWidth
          type="submit"
          disabled={sibuk || topik.trim().length < 3}
        >
          {sibuk ? "Menulis…" : "Buatkan"}
        </Button>
      </form>

      {keadaan.k === "gagal" ? (
        <div role="alert" className="card space-y-3 p-5">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            {keadaan.pesan}
          </p>
          {keadaan.perluPremium ? (
            <Link href="/premium" className="btn-primary">
              Lihat paket Premium
            </Link>
          ) : null}
        </div>
      ) : null}

      {keadaan.k === "jadi" ? <Hasil hasil={keadaan.hasil} /> : null}
    </div>
  );
}

function Hasil({ hasil }: { hasil: HasilKonten }) {
  return (
    <div className="space-y-3">
      {hasil.bagian.map((b, i) => (
        <Bagian key={`${b.judul}-${i}`} judul={b.judul} badan={b.badan} tagar={b.tagar} />
      ))}
    </div>
  );
}

function Bagian({
  judul,
  badan,
  tagar,
}: {
  judul: string;
  badan: string;
  tagar?: string[];
}) {
  const [disalin, setDisalin] = useState(false);
  const teksPenuh = tagar?.length ? `${badan}\n\n${tagar.join(" ")}` : badan;

  const salin = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(teksPenuh);
      setDisalin(true);
      setTimeout(() => setDisalin(false), 1800);
    } catch {
      /* peramban menolak akses papan klip — tombolnya diam saja */
    }
  }, [teksPenuh]);

  return (
    <div className="card space-y-2 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3>{judul}</h3>
        <button
          type="button"
          onClick={() => void salin()}
          aria-label={`Salin ${judul}`}
          className="flex shrink-0 items-center gap-1.5 rounded-pill bg-surface-warm px-3 py-1.5 text-[12px] font-semibold text-ink-muted"
        >
          {disalin ? (
            <>
              <Check className="h-3.5 w-3.5 text-success" aria-hidden />
              Tersalin
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Salin
            </>
          )}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
        {badan}
      </p>
      {tagar?.length ? (
        <p className="text-[13px] leading-relaxed text-gold-deep">
          {tagar.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
