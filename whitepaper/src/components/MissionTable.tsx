import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import data from "@site/data/missions.json";

/**
 * Daftar misi imbalan — diturunkan dari kode sumber AIDM, bukan diketik.
 *
 * Angka imbalan hidup di `lib/missions/index.ts` dan menentukan berapa IDMX
 * benar-benar dibayarkan. Menyalinnya ke markdown menciptakan salinan kedua
 * yang akan menyimpang begitu salah satu misi disesuaikan — dan pembaca tidak
 * punya cara tahu salinan mana yang berlaku.
 */
type Misi = { code: string; label: Record<string, string>; reward: number; period: Record<string, string> };

export default function MissionTable({ locale }: { locale?: "id" | "en" }) {
  const { i18n } = useDocusaurusContext();
  const b = locale ?? ((i18n.currentLocale === "en" ? "en" : "id") as "id" | "en");
  const misi = (data.missions as Misi[]);
  const h = b === "en"
    ? { m: "Mission", r: `Reward (${data.unit})`, p: "Period" }
    : { m: "Misi", r: `Imbalan (${data.unit})`, p: "Periode" };
  return (
    <table className="idm-misi">
      <thead><tr><th>{h.m}</th><th style={{ textAlign: "right" }}>{h.r}</th><th>{h.p}</th></tr></thead>
      <tbody>
        {misi.map((m) => (
          <tr key={m.code}>
            <td>{m.label[b]}</td>
            <td style={{ textAlign: "right" }}>{m.reward}</td>
            <td>{m.period[b]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
