import React from "react";
import status from "@site/data/status.json";

/**
 * Chip status satu pilar. Nilai `state` yang diizinkan hanya `live`,
 * `testnet`, dan `concept` — kalau sesuatu tidak masuk tiga kategori itu, ia
 * belum layak muncul di whitepaper, dan komponen ini melempar alih-alih
 * menampilkannya.
 *
 * Teks chip MEMUAT kata statusnya sendiri. Warna saja tidak cukup: pembaca
 * yang buta warna, membaca cetakan hitam-putih, atau memakai pembaca layar
 * tetap harus tahu bahwa sesuatu ada di testnet.
 */
const TEKS: Record<string, { id: string; en: string }> = {
  live: { id: "Live", en: "Live" },
  testnet: { id: "Testnet", en: "Testnet" },
  concept: { id: "Konsep", en: "Concept" },
};

export default function StatusBadge({ pillar, locale = "id" }: { pillar: string; locale?: "id" | "en" }) {
  const s = (status as Record<string, { state: string }>)[pillar];
  if (!s) throw new Error(`<StatusBadge> pilar tidak dikenal: "${pillar}"`);
  if (!TEKS[s.state]) throw new Error(`<StatusBadge> state tidak diizinkan: "${s.state}" (hanya live/testnet/concept)`);
  return <span className={`idm-badge idm-badge--${s.state}`}>{TEKS[s.state][locale]}</span>;
}
