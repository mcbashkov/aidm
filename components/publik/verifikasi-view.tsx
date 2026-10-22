"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { labelRentang } from "@/lib/berkas/label";

interface Hasil {
  nomor_dokumen: string;
  periode_awal: string;
  periode_akhir: string;
  nama_usaha: string | null;
  kota: string | null;
  sha256: string;
  tanggal_terbit: string;
  notarisasi: { status: "tercatat" | "menunggu" | "belum" };
  note: string;
}

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Halaman verifikasi publik (§1.5). Dibaca bank/pejabat: tanpa data keuangan,
 * tanpa jejak teknis apa pun selain "notarisasi hash kriptografis". Hash
 * berkas yang dipilih dihitung DI PERANGKAT pembaca; berkas tidak diunggah.
 */
export function VerifikasiView({ kode }: { kode: string }) {
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [cocok, setCocok] = useState<null | boolean>(null);
  const [hashBerkas, setHashBerkas] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/verifikasi/${encodeURIComponent(kode)}`, { cache: "no-store" });
        const body = (await res.json()) as Hasil & { error?: string };
        if (!res.ok) setGalat(body.error ?? "Dokumen tidak ditemukan.");
        else setHasil(body);
      } catch {
        setGalat("Verifikasi belum bisa dibaca. Coba lagi.");
      }
    })();
  }, [kode]);

  async function periksa(file: File | undefined) {
    if (!file || !hasil) return;
    const h = await sha256Hex(file);
    setHashBerkas(h);
    setCocok(h === hasil.sha256.toLowerCase());
  }

  if (galat) {
    return (
      <div className="card p-6">
        <h1 className="text-[22px]">Dokumen tidak ditemukan</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{galat}</p>
      </div>
    );
  }
  if (!hasil) return <div className="skeleton h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-6">
        <h1 className="text-[22px]">Verifikasi dokumen</h1>
        <dl className="space-y-2 text-[14px]">
          <div className="flex gap-3"><dt className="w-36 shrink-0 text-ink-subtle">Nomor dokumen</dt><dd className="tnum text-ink">{hasil.nomor_dokumen}</dd></div>
          <div className="flex gap-3"><dt className="w-36 shrink-0 text-ink-subtle">Periode</dt><dd className="text-ink">{labelRentang(hasil.periode_awal, hasil.periode_akhir)}</dd></div>
          <div className="flex gap-3"><dt className="w-36 shrink-0 text-ink-subtle">Nama usaha</dt><dd className="text-ink">{hasil.nama_usaha ?? "—"}{hasil.kota ? ` · ${hasil.kota}` : ""}</dd></div>
          <div className="flex gap-3"><dt className="w-36 shrink-0 text-ink-subtle">Tanggal terbit</dt><dd className="text-ink">{hasil.tanggal_terbit}</dd></div>
          <div className="flex gap-3"><dt className="w-36 shrink-0 text-ink-subtle">Notarisasi</dt><dd className="text-ink">{hasil.notarisasi.status === "tercatat" ? "Tercatat (notarisasi hash kriptografis)" : hasil.notarisasi.status === "menunggu" ? "Sedang diproses" : "Belum tercatat"}</dd></div>
          <div className="flex gap-3"><dt className="w-36 shrink-0 text-ink-subtle">Sidik jari SHA-256</dt><dd className="break-all font-mono text-[12px] text-ink">{hasil.sha256}</dd></div>
        </dl>
        <p className="text-[12.5px] leading-relaxed text-ink-muted">{hasil.note}</p>
      </div>

      <div className="card space-y-3 p-6">
        <h2 className="text-[17px]">Cocokkan berkas PDF Anda</h2>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Pilih berkas PDF yang Anda terima. Sidik jarinya dihitung di perangkat Anda sendiri dan dibandingkan dengan yang tercatat — berkas tidak dikirim ke mana pun.
        </p>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => void periksa(e.target.files?.[0])}
          className="block w-full text-[13px] text-ink file:mr-3 file:rounded-pill file:border-0 file:bg-surface-warm file:px-4 file:py-2 file:text-[13px] file:font-semibold file:text-ink"
        />
        {cocok === true ? (
          <p role="status" className="flex items-center gap-2 text-[14px] font-semibold text-success"><CheckCircle2 className="h-5 w-5" aria-hidden /> Cocok — berkas ini sama persis dengan yang diterbitkan.</p>
        ) : cocok === false ? (
          <div role="status" className="space-y-1">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-danger"><XCircle className="h-5 w-5" aria-hidden /> Tidak cocok — berkas ini berbeda dari yang diterbitkan.</p>
            <p className="break-all font-mono text-[11px] text-ink-subtle">{hashBerkas}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
