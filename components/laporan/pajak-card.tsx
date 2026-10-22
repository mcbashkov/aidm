"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { CircleAlert, Download, FileText, Info } from "lucide-react";
import { ambilPajak, buatPernyataanPajak, buatRincianPajak, urlUnduhDokumenPajak, type PajakResponse } from "@/lib/pajak/client";
import { BATAS_BEBAS_IDR, KALIMAT_BUKAN_NASIHAT, formatRp } from "@/lib/pajak/hitung";
import { formatHargaIdr } from "@/lib/langganan/katalog";
import { labelBulan } from "@/lib/berkas/label";
import { cn } from "@/lib/utils";

/**
 * Kartu Pajak OP di Laporan (Batch 9). GRATIS: baris "Omzet tahun ini: Rp X
 * dari batas bebas Rp500 juta" + alarm non-blokir saat melewati (hanya bila
 * pengguna menandai dirinya wajib pajak OP di Akun). PREMIUM (`pajak`,
 * termasuk Plus): kalkulator setoran bulan terakhir yang kena, dua dokumen
 * PDF. Tanpa kata "laba"; tanpa skor; setiap keadaan memuat kalimat "Bukan
 * nasihat pajak". Mode demo / tanpa sesi: tidak dirender.
 */
export function PajakCard() {
  const judulId = useId();
  const [data, setData] = useState<PajakResponse | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sembunyi, setSembunyi] = useState(false);
  const [sibuk, setSibuk] = useState<"rincian" | "pernyataan" | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [formBuka, setFormBuka] = useState(false);
  const [nama, setNama] = useState("");
  const [npwp, setNpwp] = useState("");

  const muat = useCallback(async () => {
    const r = await ambilPajak();
    if (r.ok) {
      setData(r.data);
      setGalat(null);
    } else if (r.demo || r.status === 401) {
      setSembunyi(true);
    } else {
      setGalat(r.offline ? "Kamu sedang offline — ringkasan pajak belum bisa dibaca." : "Ringkasan pajak belum bisa dibaca.");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  if (sembunyi) return null;

  if (!data) {
    return (
      <section id="pajak" className="card space-y-3 p-5">
        <h3>Pajak usaha</h3>
        {galat ? (
          <>
            <p className="text-[13px] text-ink-muted">{galat}</p>
            <button type="button" onClick={() => void muat()} className="tap rounded-pill bg-surface-warm px-3.5 text-[12px] font-semibold text-ink">
              Coba lagi
            </button>
          </>
        ) : (
          <div className="skeleton h-5 w-56" />
        )}
      </section>
    );
  }

  const { hasil } = data;
  const rasio = Math.min(1, hasil.omzetTahun / BATAS_BEBAS_IDR);
  const barisKena = [...hasil.bulanan].reverse().find((b) => b.setoran > 0) ?? null;
  const dokumenTersimpan = data.dokumen.slice(0, 6);

  async function rincian() {
    setSibuk("rincian");
    setPesan(null);
    const r = await buatRincianPajak(data!.tahun);
    setSibuk(null);
    if (!r.ok) {
      setPesan(r.kode === "PERLU_PAKET_PAJAK" ? "Dokumen pajak termasuk Paket Pajak Tahunan atau AIDM Plus." : r.error);
      return;
    }
    setPesan(`Rincian ${r.data.dokumen.nomorDokumen} dibuat.`);
    if (r.data.unduhUrl) window.open(r.data.unduhUrl, "_blank", "noopener");
    void muat();
  }

  async function pernyataan() {
    setSibuk("pernyataan");
    setPesan(null);
    const r = await buatPernyataanPajak({ tahun: data!.tahun, nama, npwp });
    setSibuk(null);
    if (!r.ok) {
      setPesan(r.error);
      return;
    }
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.nomor || "surat-pernyataan"}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setNama("");
    setNpwp("");
    setFormBuka(false);
    setPesan(`Surat ${r.nomor} diunduh. Nama dan NPWP tidak disimpan — simpan berkasnya baik-baik.`);
    void muat();
  }

  return (
    <section id="pajak" aria-labelledby={judulId} className="card scroll-mt-16 space-y-4 p-5">
      <div>
        <h3 id={judulId}>Pajak usaha</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
          Omzet tahun {data.tahun} dibandingkan batas bebas PPh Final untuk wajib pajak orang pribadi.
        </p>
      </div>

      {/* Gratis: omzet vs batas */}
      <div className="rounded-2xl bg-surface-warm px-4 py-3">
        <p className="tnum text-[15px] font-semibold text-ink">
          Omzet tahun ini: {formatRp(hasil.omzetTahun)}{" "}
          <span className="font-normal text-ink-muted">dari batas bebas {formatRp(BATAS_BEBAS_IDR)}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-white/70">
          <div className={cn("h-full rounded-pill", hasil.melewati ? "bg-danger" : "bg-gold-gradient")} style={{ width: `${Math.round(rasio * 100)}%` }} />
        </div>
        {data.wajibPajakOp ? (
          hasil.melewati ? (
            <p className="mt-2 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              Mulai {labelBulan(hasil.bulanMelewati ?? "")} omzetmu kena PPh Final 0,5% atas bagian di atas Rp500 juta. Setor paling lambat tanggal 15 bulan berikutnya.
            </p>
          ) : (
            <p className="mt-2 text-[12.5px] text-ink-muted">Masih di bawah batas bebas — belum ada PPh Final yang perlu disetor tahun ini.</p>
          )
        ) : (
          <p className="mt-2 text-[12px] text-ink-subtle">
            Wajib pajak orang pribadi? <Link href="/akun" className="font-semibold text-gold-deep">Tandai di Akun</Link> agar kalimat pajaknya tampil.
          </p>
        )}
      </div>

      {/* Pengingat setoran (premium + wajib) */}
      {data.pengingat ? (
        <div className="flex items-start gap-2.5 rounded-2xl border border-gold/40 bg-gold-tint px-4 py-3 text-[13px] leading-relaxed text-ink">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
          <span>
            Setoran PPh Final bulan {labelBulan(data.pengingat.bulanPajak)}: <b className="tnum">{formatRp(data.pengingat.setoran)}</b>, paling lambat tanggal 15
            {data.pengingat.sisaHari === 0 ? " — hari ini." : ` (${data.pengingat.sisaHari} hari lagi).`}
          </span>
        </div>
      ) : null}

      {/* Premium: kalkulator + dokumen */}
      {data.bolehPajak ? (
        <div className="space-y-3">
          {data.wajibPajakOp && barisKena ? (
            <div className="rounded-2xl bg-surface-warm px-4 py-3 text-[13px]">
              <p className="font-semibold text-ink">Kalkulator setoran — {labelBulan(barisKena.bulan)}</p>
              <dl className="mt-1.5 space-y-1 text-ink-muted">
                <div className="flex justify-between gap-3"><dt>Omzet bulan itu</dt><dd className="tnum text-ink">{formatRp(barisKena.omzet)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Bagian kena PPh (di atas batas)</dt><dd className="tnum text-ink">{formatRp(barisKena.dasarKena)}</dd></div>
                <div className="flex justify-between gap-3"><dt>PPh Final 0,5%</dt><dd className="tnum font-semibold text-ink">{formatRp(barisKena.setoran)}</dd></div>
                <div className="flex justify-between gap-3"><dt>Jatuh tempo</dt><dd className="text-ink">{barisKena.jatuhTempo ? `${Number(barisKena.jatuhTempo.slice(8, 10))} ${labelBulan(barisKena.jatuhTempo.slice(0, 7))}` : "—"}</dd></div>
              </dl>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => void rincian()} disabled={sibuk !== null} className="btn-primary disabled:opacity-50">
              <FileText className="mr-2 inline h-4 w-4" aria-hidden />
              {sibuk === "rincian" ? "Menyusun…" : `Buat Rincian Peredaran Bruto ${data.tahun}`}
            </button>
            {!hasil.melewati ? (
              <button type="button" onClick={() => setFormBuka((b) => !b)} className="tap rounded-pill bg-surface-warm px-4 text-[13px] font-semibold text-ink">
                Buat Surat Pernyataan Omzet di Bawah Rp500 Juta
              </button>
            ) : null}
          </div>

          {formBuka ? (
            <form
              className="space-y-2 rounded-2xl bg-surface-warm p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void pernyataan();
              }}
            >
              <p className="text-[12.5px] leading-relaxed text-ink-muted">
                Nama dan NPWP hanya dipakai untuk mencetak surat ini — tidak disimpan di AIDM. Tanda tangan dikosongkan untuk diisi tangan.
              </p>
              <label className="block text-[12px] text-ink-muted">
                Nama sesuai NPWP
                <input value={nama} onChange={(e) => setNama(e.target.value)} required maxLength={120} className="input mt-1 w-full" autoComplete="off" />
              </label>
              <label className="block text-[12px] text-ink-muted">
                NPWP (15 atau 16 digit)
                <input value={npwp} onChange={(e) => setNpwp(e.target.value)} required inputMode="numeric" className="input mt-1 w-full" autoComplete="off" />
              </label>
              <button type="submit" disabled={sibuk !== null} className="btn-primary disabled:opacity-50">
                {sibuk === "pernyataan" ? "Menyusun…" : "Unduh surat pernyataan"}
              </button>
            </form>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl bg-surface-warm px-4 py-3">
          <p className="text-[13px] leading-relaxed text-ink">
            Kalkulator setoran, pengingat tanggal 15, PDF Rincian Peredaran Bruto, dan Surat Pernyataan Omzet ada di{" "}
            <b>Paket Pajak Tahunan</b> ({formatHargaIdr(data.hargaPajakIdr)}/tahun pajak) — termasuk dalam AIDM Plus.
          </p>
          <Link href="/premium" className="inline-block text-[13px] font-semibold text-gold-deep">
            Lihat di katalog →
          </Link>
        </div>
      )}

      {dokumenTersimpan.length > 0 ? (
        <ul className="space-y-1.5">
          {dokumenTersimpan.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="min-w-0 truncate text-ink">
                {d.label} <span className="text-ink-subtle">· {d.nomorDokumen}</span>
              </span>
              {d.bisaUnduh ? (
                <a href={urlUnduhDokumenPajak(d.id)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-semibold text-gold-deep">
                  <Download className="h-3.5 w-3.5" aria-hidden /> Unduh
                </a>
              ) : (
                <span className="shrink-0 text-ink-subtle">tidak disimpan</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {pesan ? <p role="status" className="text-[12.5px] leading-relaxed text-ink-muted">{pesan}</p> : null}

      <p className="text-[11.5px] leading-relaxed text-ink-subtle">{KALIMAT_BUKAN_NASIHAT}</p>
    </section>
  );
}
