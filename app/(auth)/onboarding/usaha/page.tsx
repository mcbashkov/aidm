"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepDots } from "@/components/ui/step-dots";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

export default function UsahaPage() {
  const router = useRouter();
  const [kategori, setKategori] = useState<string | null>(null);
  const [kota, setKota] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = kategori !== null && kota.trim().length > 1;

  async function finish() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "umkm", kategori_slug: kategori, kota: kota.trim() }),
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
        <h1>Usahamu di bidang apa?</h1>
        <p className="text-[15px] text-ink-muted">
          Pilih satu kategori dan kotamu.
        </p>
      </div>

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
