"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Circle, Info } from "lucide-react";
import { ambilKesiapan, type KesiapanResponse } from "@/lib/kesiapan/client";
import { JENDELA_6 } from "@/lib/kesiapan/hitung";
import { cn } from "@/lib/utils";

/**
 * Kartu "Kesiapan Catatan" di Laporan (Batch 4, §1.3 poin 1) — menggantikan
 * kartu terkunci valuasi usaha di slot yang sama. Isinya: nama tingkat,
 * "N dari 6 bulan terakhir aktif", dan checklist "apa yang kurang". Tanpa
 * angka 0–100: angka skor mengundang pembacaan "skor kredit", dan ini
 * kelengkapan catatan, bukan kelayakan. Tombol "Buat <label>" menyusul di
 * Batch 5 (sheet pratinjau Berkas).
 *
 * Mode demo: tidak dirender — tidak ada catatan siapa pun untuk dinilai.
 */
export function KesiapanCard() {
  const judulId = useId();
  const [data, setData] = useState<KesiapanResponse | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  const muat = useCallback(async () => {
    const res = await ambilKesiapan();
    if (res.ok) {
      setData(res.data);
      setGalat(null);
    } else if (res.demo) {
      setDemo(true);
    } else {
      setGalat(
        res.offline
          ? "Kamu sedang offline — kesiapan catatan belum bisa dibaca."
          : "Kesiapan catatan belum bisa dibaca.",
      );
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  // Tautan "Buat …" dari Beranda menuju /laporan#kesiapan; kartunya baru ada
  // setelah data tiba, jadi gulirnya dilakukan di sini (pola KasbonCard).
  const sudahGulir = useRef(false);
  useEffect(() => {
    if (!data || sudahGulir.current) return;
    if (window.location.hash !== "#kesiapan") return;
    sudahGulir.current = true;
    document.getElementById("kesiapan")?.scrollIntoView({ block: "start" });
  }, [data]);

  if (demo) return null;

  if (galat && !data) {
    return (
      <section id="kesiapan" className="card space-y-2 p-5">
        <h3>Kesiapan Catatan</h3>
        <p className="text-[13px] text-ink-muted">{galat}</p>
        <button
          type="button"
          onClick={() => void muat()}
          className="tap rounded-pill bg-surface-warm px-3.5 text-[12px] font-semibold text-ink"
        >
          Coba lagi
        </button>
      </section>
    );
  }

  if (!data) {
    return (
      <section id="kesiapan" className="card space-y-3 p-5">
        <h3>Kesiapan Catatan</h3>
        <div className="skeleton h-7 w-40" />
        <div className="skeleton h-4 w-56" />
      </section>
    );
  }

  return (
    <section
      id="kesiapan"
      aria-labelledby={judulId}
      className="card scroll-mt-16 space-y-4 p-5"
    >
      <div>
        <h3 id={judulId}>Kesiapan Catatan</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
          Seberapa lengkap catatanmu untuk dijadikan berkas — bukan penilaian
          pinjaman.
        </p>
      </div>

      <div className="rounded-2xl bg-surface-warm px-4 py-3">
        <p className="text-[20px] font-semibold leading-tight text-ink">
          {data.label}
        </p>
        <p className="tnum mt-0.5 text-[13px] text-ink-muted">
          {data.bulanAktif6} dari {JENDELA_6} bulan terakhir aktif
          {data.hariAktifBulanIni > 0
            ? ` · bulan ini ${data.hariAktifBulanIni} hari mencatat`
            : ""}
        </p>
      </div>

      <ul className="space-y-2">
        {data.checklist.map((c) => (
          <li
            key={c.kunci}
            className="flex items-start gap-2.5 text-[13px] leading-relaxed"
          >
            {c.terpenuhi ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-success"
                aria-label="Terpenuhi"
              />
            ) : c.info ? (
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle"
                aria-label="Informasi"
              />
            ) : (
              <Circle
                className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle"
                aria-label="Belum"
              />
            )}
            <span className={cn(c.terpenuhi ? "text-ink-muted" : "text-ink")}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
