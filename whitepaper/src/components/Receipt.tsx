import React from "react";

/**
 * Klaim + bukti + tanggal, dalam satu blok seragam.
 *
 * `url` dan `date` WAJIB, dan komponen ini MELEMPAR kalau salah satunya
 * kosong. Itu bukan galat yang perlu ditangani dengan anggun — ia disiplin
 * yang ditegakkan alat: klaim tanpa bukti tidak bisa dirender, jadi tidak bisa
 * terbit. Whitepaper yang memuat satu klaim tanpa rujukan mengundang pembaca
 * meragukan semuanya, termasuk yang benar.
 */
export default function Receipt({
  claim, evidence, url, date,
}: { claim: string; evidence: string; url: string; date: string }) {
  if (!url?.trim()) throw new Error(`<Receipt> tanpa url — klaim: "${claim}"`);
  if (!date?.trim()) throw new Error(`<Receipt> tanpa date — klaim: "${claim}"`);
  return (
    <div className="idm-receipt">
      <p className="idm-receipt__claim">{claim}</p>
      <p className="idm-receipt__meta">
        {evidence ? <span>{evidence} · </span> : null}
        <a href={url} target="_blank" rel="noreferrer noopener">{url.replace(/^https?:\/\//, "")}</a>
        <span className="idm-receipt__date"> · {date}</span>
      </p>
    </div>
  );
}
