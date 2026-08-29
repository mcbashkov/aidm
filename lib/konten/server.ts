import { getAnthropic } from "@/lib/ai/anthropic";
import { AGENT_MODEL } from "@/lib/ai/models";
import {
  FORMAT_KONTEN,
  type BagianKonten,
  type FormatKonten,
  type HasilKonten,
} from "@/lib/konten";

/**
 * Mesin Generator Konten.
 *
 * Modelnya AGENT_MODEL (kelas Sonnet), bukan model ringan yang dipakai parser
 * catat. Alasannya: parser hanya perlu MENGURAI kalimat yang sudah ada, ini
 * harus MENULIS kalimat yang dibaca calon pembeli. Volumenya pun kecil —
 * dipagari 60 per bulan — jadi memilih model yang lebih baik di sini tidak
 * menggeser biaya secara berarti.
 */

const TIMEOUT_MS = 45_000;

const SKEMA = {
  type: "object",
  required: ["bagian"],
  additionalProperties: false,
  properties: {
    bagian: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["judul", "badan"],
        additionalProperties: false,
        properties: {
          judul: { type: "string" },
          badan: { type: "string" },
          tagar: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

const ARAHAN: Record<FormatKonten, string> = {
  tiktok_script:
    "Tulis SATU skrip video TikTok 30–60 detik. Tiga bagian berjudul \"Hook\", \"Isi\", dan \"Ajakan\". Hook maksimal dua kalimat dan harus menahan orang di detik pertama.",
  ig_caption:
    "Tulis TIGA pilihan caption Instagram dengan nada berbeda (hangat, lugas, jenaka). Setiap bagian berisi captionnya di `badan` dan 5–8 tagar relevan berbahasa Indonesia di `tagar`.",
  promo_copy:
    "Tulis TIGA pesan promo siap kirim di WhatsApp. Pendek, tanpa basa-basi, boleh pakai emoji seperlunya. Judul tiap bagian menyebut kapan dipakai (mis. \"Broadcast pagi\", \"Balasan penanya\", \"Pelanggan lama\").",
  calendar7:
    "Susun kalender konten TUJUH hari. Satu bagian per hari, judulnya \"Hari 1\" sampai \"Hari 7\", badannya satu ide konten konkret lengkap dengan format (foto/video/story) dan angle-nya.",
};

function systemPrompt(format: FormatKonten, konteks: {
  namaUsaha?: string | null;
  kategori?: string | null;
  kota?: string | null;
  gaya?: string | null;
}): string {
  const gaya =
    konteks.gaya === "formal"
      ? "Bahasa Indonesia formal dan sopan."
      : konteks.gaya === "netral"
        ? "Bahasa Indonesia netral, jelas, tidak kaku."
        : "Bahasa Indonesia santai sehari-hari, akrab tapi tetap sopan.";
  return [
    "Kamu penulis konten pemasaran untuk pelaku usaha mikro Indonesia.",
    ARAHAN[format],
    "ATURAN:",
    `- ${gaya}`,
    "- DILARANG mengarang klaim yang tidak bisa dibuktikan penjualnya: jangan menyebut penghargaan, sertifikasi, jumlah pelanggan, atau angka penjualan yang tidak diberikan.",
    "- Jangan menyebut harga kecuali topiknya menyebut harga.",
    "- Tulis untuk dibaca di layar HP: kalimat pendek, tanpa paragraf panjang.",
    "- Jangan memakai tanda pagar di dalam `badan`; tagar hanya di field `tagar`.",
    [
      "- Konteks usaha:",
      konteks.namaUsaha ? `nama "${konteks.namaUsaha}"` : null,
      konteks.kategori ? `bidang ${konteks.kategori}` : null,
      konteks.kota ? `kota ${konteks.kota}` : null,
      "— pakai bila relevan, jangan dipaksakan.",
    ]
      .filter(Boolean)
      .join(" "),
    "- Jawab HANYA JSON sesuai skema. Tanpa markdown, tanpa penjelasan.",
  ].join("\n");
}

export type HasilBuat =
  | { ok: true; hasil: HasilKonten }
  | { ok: false; alasan: "unconfigured" | "timeout" | "gagal" };

export async function buatKonten(
  format: FormatKonten,
  topik: string,
  konteks: Parameters<typeof systemPrompt>[1],
): Promise<HasilBuat> {
  const client = getAnthropic();
  if (!client) return { ok: false, alasan: "unconfigured" };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await client.messages.create(
      {
        model: AGENT_MODEL,
        max_tokens: 4096,
        system: systemPrompt(format, konteks),
        messages: [{ role: "user", content: topik.slice(0, 400) }],
        output_config: {
          format: {
            type: "json_schema",
            schema: SKEMA as unknown as Record<string, unknown>,
          },
        },
      },
      { signal: ac.signal },
    );
    const blok = res.content.find((b) => b.type === "text");
    if (!blok || blok.type !== "text") return { ok: false, alasan: "gagal" };

    const parsed = JSON.parse(blok.text) as { bagian?: unknown };
    if (!Array.isArray(parsed.bagian) || parsed.bagian.length === 0) {
      return { ok: false, alasan: "gagal" };
    }

    // Validasi di server — keluaran model tidak dipercaya apa adanya (§9.2).
    const bagian: BagianKonten[] = [];
    for (const b of parsed.bagian as Record<string, unknown>[]) {
      if (typeof b?.judul !== "string" || typeof b?.badan !== "string") continue;
      const tagar = Array.isArray(b.tagar)
        ? (b.tagar as unknown[])
            .filter((t): t is string => typeof t === "string")
            .slice(0, 12)
        : undefined;
      bagian.push({
        judul: b.judul.slice(0, 120),
        badan: b.badan.slice(0, 4000),
        ...(tagar && tagar.length ? { tagar } : {}),
      });
    }
    if (bagian.length === 0) return { ok: false, alasan: "gagal" };

    return { ok: true, hasil: { format, topik, bagian: bagian.slice(0, 10) } };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    if (!aborted) console.error(`[konten] ${format} gagal:`, err);
    return { ok: false, alasan: aborted ? "timeout" : "gagal" };
  } finally {
    clearTimeout(timer);
  }
}

export const JUDUL_FORMAT = FORMAT_KONTEN;
