import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import t from "@site/data/tokenomics.json";

/**
 * Kurva pelepasan kumulatif, SVG murni — tanpa dependensi grafik tambahan.
 *
 * Menghitung dari jadwal vesting tiap pos DITAMBAH emisi migrasi enam bulan,
 * bukan dari angka yang diketik terpisah. Kalau jadwal di `tokenomics.json`
 * berubah, kurvanya ikut berubah; kurva yang harus disunting manual akan
 * menyimpang dari tabel di sebelahnya dan tidak ada yang menyadarinya.
 *
 * Garis sirkulasi TGE ditandai karena itu satu-satunya titik yang punya angka
 * resmi di §0.1 — pembaca bisa mencocokkannya.
 */
type Vesting = { tge: number | null; cliffMonths: number; linearMonths: number };
type Alokasi = { id: string; tokens: number; vesting?: Vesting; circulatingAtTge?: number };

function beredarPada(bulan: number): number {
  let total = 0;
  for (const a of t.allocations as Alokasi[]) {
    if (a.id === "migration") {
      // Migrasi punya bentuknya sendiri: porsi TGE penuh, lalu emisi linear
      // enam bulan dari kelompok di atas ambang.
      const m = t.migration;
      const lin = Math.min(Math.max(bulan, 0), m.aboveThreshold.linearMonths) / m.aboveThreshold.linearMonths;
      total += m.tgeCirculating + m.linearTotal * lin;
      continue;
    }
    const v = a.vesting;
    if (!v) { total += a.circulatingAtTge ?? 0; continue; }
    const tge = ((v.tge ?? 0) / 100) * a.tokens;
    total += tge;
    if (v.linearMonths > 0) {
      const sesudahCliff = bulan - v.cliffMonths;
      if (sesudahCliff > 0) {
        const bagian = Math.min(sesudahCliff, v.linearMonths) / v.linearMonths;
        total += (a.tokens - tge) * bagian;
      }
    }
  }
  return total;
}

export default function UnlockCurve({ months = 24, locale }: { months?: number; locale?: "id" | "en" }) {
  const { i18n } = useDocusaurusContext();
  const bahasa = locale ?? ((i18n.currentLocale === "en" ? "en" : "id") as "id" | "en");
  const W = 640, H = 260, P = 44;
  const titik = Array.from({ length: months + 1 }, (_, m) => ({ m, v: beredarPada(m) }));
  const maks = Math.max(...titik.map((p) => p.v), t.totalSupply * 0.35);
  const x = (m: number) => P + (m / months) * (W - P - 12);
  const y = (v: number) => H - P - (v / maks) * (H - P - 16);
  const garis = titik.map((p, i) => `${i ? "L" : "M"}${x(p.m).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const yTge = y(t.tge.circulating);
  const jt = (v: number) => `${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt`;

  return (
    <figure className="idm-kurva">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={bahasa === "en" ? "Cumulative unlock curve" : "Kurva pelepasan kumulatif"}>
        <line x1={P} y1={H - P} x2={W - 12} y2={H - P} stroke="currentColor" strokeOpacity=".3" />
        <line x1={P} y1={16} x2={P} y2={H - P} stroke="currentColor" strokeOpacity=".3" />
        <line x1={P} y1={yTge} x2={W - 12} y2={yTge} stroke="currentColor" strokeOpacity=".35" strokeDasharray="4 4" />
        <text x={P + 6} y={yTge - 6} fontSize="11" fill="currentColor" opacity=".75">
          {bahasa === "en" ? "TGE circulating" : "Sirkulasi TGE"} · {jt(t.tge.circulating)}
        </text>
        <path d={garis} fill="none" stroke="currentColor" strokeWidth="2" />
        {[0, 6, 12, 18, 24].filter((m) => m <= months).map((m) => (
          <text key={m} x={x(m)} y={H - P + 16} fontSize="11" textAnchor="middle" fill="currentColor" opacity=".7">
            {bahasa === "en" ? `M${m}` : `B${m}`}
          </text>
        ))}
        <text x={P} y={12} fontSize="11" fill="currentColor" opacity=".7">{jt(maks)}</text>
      </svg>
      <figcaption>
        {bahasa === "en"
          ? `Cumulative circulating supply over ${months} months, derived from the vesting schedules in tokenomics.json.`
          : `Sirkulasi kumulatif selama ${months} bulan, diturunkan dari jadwal vesting di tokenomics.json.`}
      </figcaption>
    </figure>
  );
}
