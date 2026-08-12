"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepDots } from "@/components/ui/step-dots";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

export default function UsahaPage() {
  const router = useRouter();
  const [namaUsaha, setNamaUsaha] = useState("");
  const [kategori, setKategori] = useState<string | null>(null);
  const [kota, setKota] = useState("");
  const [saving, setSaving] = useState(false);

  // Nama usaha opsional: kop laporan PDF (§7.3) bisa memakai nama pengguna
  // sebagai cadangan, jadi jangan menghalangi orang masuk ke aplikasi.
  const canSubmit = kategori !== null && kota.trim().length > 1;

  async function finish() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_usaha: namaUsaha.trim() || undefined,
          kategori_slug: kategori,
          kota: kota.trim(),
        }),
      });
    } catch {
      // mode placeholder / offline — lanjut saja
    }
    router.push("/beranda");
  }

  return (
    <div className="space-y-7">
      <StepDots total={2} current={1} />
      <div className="space-y-2">
        <h1>Ceritakan usahamu</h1>
        <p className="text-[15px] text-ink-muted">
          Dipakai untuk kop laporan keuanganmu nanti.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="nama-usaha"
          className="px-1 text-[13px] font-semibold text-ink"
        >
          Nama usaha{" "}
          <span className="font-normal text-ink-subtle">(boleh dikosongi)</span>
        </label>
        <input
          id="nama-usaha"
          value={namaUsaha}
          onChange={(e) => setNamaUsaha(e.target.value)}
          placeholder="mis. Warung Bu Sari"
          className="w-full rounded-card bg-surface px-5 py-3.5 text-[15px] shadow-card outline-none transition-shadow placeholder:text-ink-subtle focus:shadow-float"
        />
      </div>

      <div className="space-y-2">
        <p className="px-1 text-[13px] font-semibold text-ink">Bidang usaha</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = kategori === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => setKategori(c.slug)}
                aria-pressed={active}
                className={cn("chip", active && "chip-active")}
              >
                {c.nama}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="kota"
          className="px-1 text-[13px] font-semibold text-ink"
        >
          Kota / kabupaten
        </label>
        <input
          id="kota"
          value={kota}
          onChange={(e) => setKota(e.target.value)}
          placeholder="mis. Bekasi"
          className="w-full rounded-card bg-surface px-5 py-3.5 text-[15px] shadow-card outline-none transition-shadow placeholder:text-ink-subtle focus:shadow-float"
        />
      </div>

      <button
        type="button"
        disabled={!canSubmit || saving}
        onClick={finish}
        className="btn-primary disabled:opacity-50"
      >
        {saving ? "Menyimpan…" : "Selesai"}
      </button>
    </div>
  );
}
