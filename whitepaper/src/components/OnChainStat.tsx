import React from "react";
import cache from "@site/data/onchain.cache.json";

/**
 * Angka on-chain dari cache, SELALU disertai tanggal pembacaannya.
 *
 * Tanggal itu bukan hiasan. Angka rantai berubah, dan angka tanpa tanggal
 * membaca seolah berlaku selamanya. Kalau umurnya lewat tujuh hari, penanda
 * visual muncul — bukan untuk menyembunyikan angkanya, melainkan supaya
 * pembaca tahu ia sedang membaca potret lama.
 */
const UMUR_BASI_HARI = 7;

type Nilai = { value: string | number | null; fetchedAt: string | null; stale?: boolean };

export default function OnChainStat({
  metric, decimals = 0, suffix = "",
}: { metric: string; decimals?: number; suffix?: string }) {
  const n = (cache as Record<string, Nilai>)[metric];
  if (!n) throw new Error(`<OnChainStat> metrik tidak ada di cache: "${metric}"`);
  if (n.value === null) return <span className="idm-stat idm-stat--kosong">belum terbaca</span>;

  const angka = Number(n.value);
  const tampil = Number.isFinite(angka)
    ? angka.toLocaleString("id-ID", { maximumFractionDigits: decimals })
    : String(n.value);
  const hari = n.fetchedAt
    ? Math.floor((Date.now() - new Date(n.fetchedAt).getTime()) / 86_400_000)
    : Infinity;
  const basi = n.stale || hari > UMUR_BASI_HARI;

  return (
    <span className={`idm-stat${basi ? " idm-stat--basi" : ""}`}>
      <strong>{tampil}{suffix}</strong>
      <span className="idm-stat__tanggal">
        {" "}per {n.fetchedAt ? n.fetchedAt.slice(0, 10) : "—"}
        {basi ? " (perlu diperbarui)" : ""}
      </span>
    </span>
  );
}
