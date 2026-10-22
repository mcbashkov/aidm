"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { daftarBuktiPotong, hapusBuktiPotong, tambahBuktiPotong, type BuktiPotongRow, type RekapBuktiPotong, type StatusPotong } from "@/lib/invoice/client";
import { formatRupiah } from "@/lib/transactions";
import { labelBulan } from "@/lib/berkas/label";
import { cn } from "@/lib/utils";

/**
 * Tracker bukti potong PPh per klien per pembayaran (Batch 11, premium pajak/
 * Plus) — dirender di dalam kartu Pajak usaha. Nomor bukti potong = nomor
 * dokumen (boleh disimpan); tanpa NPWP/NIK klien. Rekap tahunannya ikut PDF
 * Rincian Peredaran Bruto.
 */
export function BuktiPotong({ tahun }: { tahun: number }) {
  const [items, setItems] = useState<BuktiPotongRow[] | null>(null);
  const [rekap, setRekap] = useState<RekapBuktiPotong | null>(null);
  const [buka, setBuka] = useState(false);
  const [klien, setKlien] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [bruto, setBruto] = useState("");
  const [status, setStatus] = useState<StatusPotong>("terpotong");
  const [potongan, setPotongan] = useState("");
  const [nomor, setNomor] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const muat = useCallback(async () => {
    const r = await daftarBuktiPotong(tahun);
    if (r.ok) {
      setItems(r.data.items);
      setRekap(r.data.rekap);
    } else setItems((l) => l ?? []);
  }, [tahun]);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setSibuk(true);
    setPesan(null);
    const r = await tambahBuktiPotong({
      klien,
      tanggal,
      bruto: Number(bruto.replace(/[^\d]/g, "")),
      status,
      nominalPotongan: status === "terpotong" ? Number(potongan.replace(/[^\d]/g, "")) : 0,
      nomorBukti: nomor || null,
    });
    setSibuk(false);
    if (!r.ok) {
      setPesan(r.error);
      return;
    }
    setKlien(""); setTanggal(""); setBruto(""); setPotongan(""); setNomor("");
    setBuka(false);
    await muat();
  }

  async function hapus(id: string) {
    setSibuk(true);
    const r = await hapusBuktiPotong(id);
    setSibuk(false);
    if (!r.ok) setPesan(r.error);
    await muat();
  }

  return (
    <div className="space-y-2 rounded-2xl bg-surface-warm px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-ink">Bukti potong PPh {tahun}</p>
          <p className="text-[11.5px] leading-relaxed text-ink-subtle">
            Catat per pembayaran klien: dipotong atau nihil. Rekapnya masuk PDF Rincian Peredaran Bruto.
          </p>
        </div>
        <button type="button" onClick={() => setBuka((b) => !b)} className="tap shrink-0 rounded-pill bg-white/70 px-3 text-[12px] font-semibold text-ink">
          {buka ? "Tutup" : "Catat"}
        </button>
      </div>

      {buka ? (
        <form onSubmit={kirim} className="space-y-2">
          <input value={klien} onChange={(e) => setKlien(e.target.value)} required maxLength={80} className="w-full rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep" placeholder="Klien / pemotong" />
          <div className="flex gap-2">
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required className="min-w-0 flex-1 rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep" />
            <input value={bruto} onChange={(e) => setBruto(e.target.value.replace(/[^\d]/g, ""))} required inputMode="numeric" className="min-w-0 flex-1 rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep" placeholder="Bruto (Rp)" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["terpotong", "nihil"] as StatusPotong[]).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} className={cn("chip", status === s && "chip-active")}>
                {s === "terpotong" ? "Dipotong" : "Nihil (tidak dipotong)"}
              </button>
            ))}
          </div>
          {status === "terpotong" ? (
            <div className="flex gap-2">
              <input value={potongan} onChange={(e) => setPotongan(e.target.value.replace(/[^\d]/g, ""))} required inputMode="numeric" className="min-w-0 flex-1 rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep" placeholder="Nominal potongan (Rp)" />
              <input value={nomor} onChange={(e) => setNomor(e.target.value)} maxLength={60} className="min-w-0 flex-1 rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep" placeholder="Nomor bukti potong (opsional)" />
            </div>
          ) : null}
          <button type="submit" disabled={sibuk} className="btn-primary disabled:opacity-50">{sibuk ? "Menyimpan…" : "Simpan"}</button>
        </form>
      ) : null}

      {rekap && rekap.jml > 0 ? (
        <p className="tnum text-[12px] text-ink-muted">
          {rekap.jml} pembayaran · bruto {formatRupiah(rekap.totalBruto)} · dipotong {formatRupiah(rekap.totalPotongan)}
        </p>
      ) : null}
      {items && items.length > 0 ? (
        <ul className="space-y-1">
          {items.slice(0, 8).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="min-w-0 truncate text-ink">
                {b.klien} <span className="text-ink-subtle">· {Number(b.tanggal.slice(8, 10))} {labelBulan(b.tanggal.slice(0, 7))}</span>
              </span>
              <span className="tnum shrink-0 text-ink-muted">
                {b.status === "terpotong" ? `−${formatRupiah(b.nominal_potongan)}` : "nihil"}
              </span>
              <button type="button" onClick={() => void hapus(b.id)} disabled={sibuk} aria-label="Hapus" className="shrink-0 text-ink-subtle">
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {pesan ? <p role="status" className="text-[12px] text-ink-muted">{pesan}</p> : null}
    </div>
  );
}
