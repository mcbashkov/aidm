import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import t from "@site/data/tokenomics.json";

/**
 * Tabel alokasi — TIDAK menerima satu pun props angka.
 *
 * Seluruh isinya datang dari `tokenomics.json`, dan itulah maksudnya: angka
 * yang bisa dioper lewat props adalah angka yang bisa diketik berbeda di dua
 * halaman. Label dwibahasa juga diambil dari berkas yang sama, sehingga tidak
 * ada tabel versi Inggris yang harus dijaga terpisah.
 */
type Komponen = { label: Record<string, string>; tokens: number; locked?: boolean; pending?: boolean; mechanism?: null };
type Alokasi = { id: string; label: Record<string, string>; pct: number; tokens: number; components?: Komponen[] };

const n = (v: number) => v.toLocaleString("id-ID", { maximumFractionDigits: 2 });

/**
 * Bahasa dibaca dari konteks Docusaurus, bukan dioper lewat props.
 *
 * Sebuah halaman yang lupa mengoper prop akan merender tabel dalam bahasa yang
 * salah — dan kesalahan itu tidak menggagalkan apa pun, ia hanya salah. Dengan
 * membacanya dari konteks, halaman tidak bisa lagi keliru; prop hanya tersisa
 * sebagai override yang disengaja.
 */
export default function AllocationTable({ locale }: { locale?: "id" | "en" }) {
  const { i18n } = useDocusaurusContext();
  const bahasa = locale ?? ((i18n.currentLocale === "en" ? "en" : "id") as "id" | "en");
  const alokasi = t.allocations as Alokasi[];
  const judul = bahasa === "en"
    ? { pos: "Allocation", pct: "%", tok: "Tokens", rinci: "Breakdown" }
    : { pos: "Pos", pct: "%", tok: "Token", rinci: "Rincian" };
  return (
    <table className="idm-alokasi">
      <thead><tr><th>{judul.pos}</th><th>{judul.pct}</th><th>{judul.tok}</th><th>{judul.rinci}</th></tr></thead>
      <tbody>
        {alokasi.map((a) => (
          <tr key={a.id}>
            <td>{a.label[bahasa]}</td>
            <td style={{ textAlign: "right" }}>{a.pct}%</td>
            <td style={{ textAlign: "right" }}>{n(a.tokens)}</td>
            <td>
              {a.components
                ? a.components.map((c, i) => (
                    <div key={i}>
                      {n(c.tokens)} {c.label[bahasa]}
                      {c.locked ? (bahasa === "en" ? " (locked)" : " (terkunci)") : ""}
                      {c.pending ? (bahasa === "en" ? " — recipient unknown" : " — belum beralamat") : ""}
                      {c.mechanism === null && !c.pending
                        ? (bahasa === "en" ? " — mechanism undecided" : " — mekanisme belum ditentukan")
                        : ""}
                    </div>
                  ))
                : "—"}
            </td>
          </tr>
        ))}
        <tr className="idm-alokasi__total">
          <td>{bahasa === "en" ? "Total" : "Jumlah"}</td>
          <td style={{ textAlign: "right" }}>{alokasi.reduce((s, a) => s + a.pct, 0)}%</td>
          <td style={{ textAlign: "right" }}>{n(alokasi.reduce((s, a) => s + a.tokens, 0))}</td>
          <td />
        </tr>
      </tbody>
    </table>
  );
}
