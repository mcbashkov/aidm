"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { FileText, Receipt, Share2 } from "lucide-react";
import { useMe } from "@/components/providers/me-provider";
import {
  bagikanPdf,
  batalkanInvoice,
  buatInvoice,
  daftarInvoice,
  lunasiInvoice,
  urlPdfInvoice,
  type InvoiceKlien,
} from "@/lib/invoice/client";
import { formatRupiah, type PaymentMethod } from "@/lib/transactions";
import { labelBulan } from "@/lib/berkas/label";
import { cn } from "@/lib/utils";

const METODE: { nilai: PaymentMethod; label: string }[] = [
  { nilai: "transfer", label: "Transfer" },
  { nilai: "tunai", label: "Tunai" },
  { nilai: "qris", label: "QRIS" },
  { nilai: "ewallet", label: "E-wallet" },
];

function tanggalPendek(ymd: string): string {
  return `${Number(ymd.slice(8, 10))} ${labelBulan(ymd.slice(0, 7))}`;
}

/**
 * Klien & Invoice (PERINTAH-AGEN-PREMIUM §Batch 11, GRATIS) — untuk peran
 * freelance/jasa, dan untuk siapa pun yang sudah punya invoice. Invoice
 * terbit = piutang di kartu Kasbon (tabel yang sama); "Lunas" mencatat
 * pemasukan jasa lewat pelunasan kasbon; kuitansi terbit setelahnya. PDF
 * dibagikan lewat Web Share (fallback unduh). Tanpa e-Meterai.
 */
export function InvoiceCard({ onLaporanBerubah }: { onLaporanBerubah?: () => void }) {
  const judulId = useId();
  const me = useMe();
  const [items, setItems] = useState<InvoiceKlien[] | null>(null);
  const [sembunyi, setSembunyi] = useState(false);
  const [formBuka, setFormBuka] = useState(false);
  const [klien, setKlien] = useState("");
  const [uraian, setUraian] = useState("");
  const [nominal, setNominal] = useState("");
  const [jatuhTempo, setJatuhTempo] = useState("");
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [lunasUntuk, setLunasUntuk] = useState<string | null>(null);
  const [metode, setMetode] = useState<PaymentMethod>("transfer");

  const muat = useCallback(async () => {
    const r = await daftarInvoice();
    if (r.ok) setItems(r.data.items);
    else if (r.demo || r.status === 401) setSembunyi(true);
    else setItems((lama) => lama ?? []);
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const freelance = me?.user?.earner_type === "freelance";
  if (sembunyi) return null;
  if (!freelance && (!items || items.length === 0)) return null;

  const terbuka = (items ?? []).filter((i) => i.status === "terbit");
  const totalTerbuka = terbuka.reduce((s, i) => s + i.nominal, 0);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    const angka = Number(nominal.replace(/[^\d]/g, ""));
    setSibuk("buat");
    setPesan(null);
    const r = await buatInvoice({ klien, uraian, nominal: angka, jatuhTempo: jatuhTempo || null });
    setSibuk(null);
    if (!r.ok) {
      setPesan(r.offline ? "Kamu sedang offline — invoice butuh koneksi." : r.error);
      return;
    }
    setKlien("");
    setUraian("");
    setNominal("");
    setJatuhTempo("");
    setFormBuka(false);
    setPesan(`Invoice ${r.data.invoice.nomor} terbit — piutangnya tercatat di Kasbon.`);
    await muat();
    onLaporanBerubah?.();
  }

  async function lunas(id: string) {
    setSibuk(id);
    setPesan(null);
    const r = await lunasiInvoice(id, metode, true);
    setSibuk(null);
    setLunasUntuk(null);
    if (!r.ok) {
      setPesan(r.error);
      return;
    }
    setPesan(`Invoice ${r.data.invoice.nomor} lunas — pemasukan jasa tercatat hari ini; kuitansi siap dibagikan.`);
    await muat();
    onLaporanBerubah?.();
  }

  async function batal(id: string) {
    setSibuk(id);
    setPesan(null);
    const r = await batalkanInvoice(id);
    setSibuk(null);
    if (!r.ok) {
      setPesan(r.error);
      return;
    }
    await muat();
    onLaporanBerubah?.();
  }

  async function bagikan(inv: InvoiceKlien, jenis: "invoice" | "kuitansi") {
    setSibuk(`${inv.id}:${jenis}`);
    const nama = jenis === "kuitansi" ? inv.nomor.replace(/^INV-/, "KW-") : inv.nomor;
    const hasil = await bagikanPdf(urlPdfInvoice(inv.id, jenis), `${nama}.pdf`);
    setSibuk(null);
    if (hasil === "gagal") setPesan("PDF belum bisa dibuat. Coba lagi ya.");
  }

  return (
    <section id="invoice" aria-labelledby={judulId} className="card scroll-mt-16 space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id={judulId}>Klien &amp; invoice</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
            Invoice terbit jadi piutang; tandai lunas saat dibayar, kuitansinya menyusul.
          </p>
        </div>
        <button type="button" onClick={() => setFormBuka((b) => !b)} className="tap shrink-0 rounded-pill bg-gold-tint px-3.5 text-[12px] font-semibold text-gold-deep">
          {formBuka ? "Tutup" : "Buat invoice"}
        </button>
      </div>

      {formBuka ? (
        <form onSubmit={kirim} className="space-y-2 rounded-2xl bg-surface-warm p-4">
          <label className="block text-[12px] text-ink-muted">
            Klien
            <input value={klien} onChange={(e) => setKlien(e.target.value)} required maxLength={80} className="mt-1 w-full rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep" placeholder="PT Maju Jaya / Bu Rina" />
          </label>
          <label className="block text-[12px] text-ink-muted">
            Uraian pekerjaan
            <input value={uraian} onChange={(e) => setUraian(e.target.value)} required maxLength={300} className="mt-1 w-full rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep" placeholder="Desain logo & kartu nama" />
          </label>
          <div className="flex gap-2">
            <label className="block flex-1 text-[12px] text-ink-muted">
              Nominal (Rp)
              <input value={nominal} onChange={(e) => setNominal(e.target.value.replace(/[^\d]/g, ""))} required inputMode="numeric" className="mt-1 w-full rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep" placeholder="2500000" />
            </label>
            <label className="block flex-1 text-[12px] text-ink-muted">
              Jatuh tempo
              <input type="date" value={jatuhTempo} onChange={(e) => setJatuhTempo(e.target.value)} className="mt-1 w-full rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep" />
            </label>
          </div>
          <button type="submit" disabled={sibuk === "buat"} className="btn-primary disabled:opacity-50">
            {sibuk === "buat" ? "Menerbitkan…" : "Terbitkan invoice"}
          </button>
        </form>
      ) : null}

      {items === null ? (
        <div className="skeleton h-12 w-full" />
      ) : items.length === 0 ? (
        <p className="text-[13px] text-ink-muted">Belum ada invoice. Buat yang pertama untuk klienmu.</p>
      ) : (
        <>
          {terbuka.length > 0 ? (
            <p className="tnum text-[13px] text-ink-muted">
              {terbuka.length} invoice belum dibayar · {formatRupiah(totalTerbuka)}
            </p>
          ) : null}
          <ul className="space-y-2">
            {items.slice(0, 12).map((inv) => (
              <li key={inv.id} className="rounded-2xl border border-line p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-ink">{inv.klien}</p>
                    <p className="truncate text-[12px] text-ink-muted">{inv.uraian}</p>
                    <p className="text-[11.5px] text-ink-subtle">
                      <span className="font-mono">{inv.nomor}</span>
                      {inv.jatuhTempo ? ` · jatuh tempo ${tanggalPendek(inv.jatuhTempo)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tnum text-[13.5px] font-semibold text-ink">{formatRupiah(inv.nominal)}</p>
                    <span
                      className={cn(
                        "rounded-pill px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                        inv.status === "lunas" ? "bg-success/15 text-success" : inv.status === "batal" ? "bg-surface-warm text-ink-subtle" : inv.terlambat ? "bg-danger/10 text-danger" : "bg-gold-tint text-gold-deep",
                      )}
                    >
                      {inv.status === "terbit" ? (inv.terlambat ? "Terlambat" : "Belum dibayar") : inv.status}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void bagikan(inv, "invoice")} disabled={sibuk !== null} className="tap inline-flex items-center gap-1 rounded-pill bg-surface-warm px-3 text-[12px] font-semibold text-ink disabled:opacity-50">
                    <FileText className="h-3.5 w-3.5" aria-hidden /> PDF invoice <Share2 className="h-3 w-3 text-ink-subtle" aria-hidden />
                  </button>
                  {inv.status === "lunas" ? (
                    <button type="button" onClick={() => void bagikan(inv, "kuitansi")} disabled={sibuk !== null} className="tap inline-flex items-center gap-1 rounded-pill bg-surface-warm px-3 text-[12px] font-semibold text-ink disabled:opacity-50">
                      <Receipt className="h-3.5 w-3.5" aria-hidden /> Kuitansi
                    </button>
                  ) : null}
                  {inv.status === "terbit" ? (
                    <>
                      <button type="button" onClick={() => setLunasUntuk(lunasUntuk === inv.id ? null : inv.id)} disabled={sibuk !== null} className="tap rounded-pill bg-cta px-3 text-[12px] font-semibold text-ink-invert disabled:opacity-50">
                        Tandai lunas
                      </button>
                      <button type="button" onClick={() => void batal(inv.id)} disabled={sibuk !== null} className="tap rounded-pill px-3 text-[12px] font-semibold text-ink-subtle disabled:opacity-50">
                        Batalkan
                      </button>
                    </>
                  ) : null}
                </div>

                {lunasUntuk === inv.id ? (
                  <div className="mt-2 space-y-2 rounded-xl bg-surface-warm p-3">
                    <p className="text-[12px] text-ink-muted">Dibayar lewat apa? Pemasukan jasa dicatat hari ini.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {METODE.map((m) => (
                        <button key={m.nilai} type="button" onClick={() => setMetode(m.nilai)} className={cn("chip", metode === m.nilai && "chip-active")}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => void lunas(inv.id)} disabled={sibuk !== null} className="btn-primary disabled:opacity-50">
                      {sibuk === inv.id ? "Mencatat…" : "Lunas & catat pemasukan"}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}

      {pesan ? <p role="status" className="text-[12.5px] leading-relaxed text-ink-muted">{pesan}</p> : null}
    </section>
  );
}
