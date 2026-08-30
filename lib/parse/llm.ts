/**
 * Parser LLM (§7.2 alur #2 / §9.2): model kelas Haiku, JSON mode (structured
 * output), skema persis §17.1. Timeout 5 detik — lewat itu pemanggil jatuh ke
 * parser fallback supaya entri tetap tersimpan.
 *
 * Modul ini HANYA memanggil model dan mengembalikan hasil mentah §17.1;
 * pemanggil wajib meloloskannya lewat validateEntries() (§9.2 "validasi
 * server-side — jangan percaya keluaran LLM").
 */

import { getAnthropic } from "@/lib/ai/anthropic";
import { LIGHT_MODEL } from "@/lib/ai/models";
import { KATEGORI_MASUK, KATEGORI_KELUAR } from "@/lib/transactions";
import type { RawEntry } from "@/lib/parse/validate";
import { kodeSah, type KodeTidakDikenali } from "@/lib/catat/pesan";

export interface LlmParseRaw {
  entries: RawEntry[];
  tidak_dikenali: KodeTidakDikenali | null;
}

export interface LlmParseContext {
  today: string; // YYYY-MM-DD (WIB)
  earnerType?: string | null;
  kategoriUsaha?: string | null;
  kota?: string | null;
}

const TIMEOUT_MS = 5_000;

/** Skema §17.1 — persis, untuk JSON mode. */
const PARSER_SCHEMA = {
  type: "object",
  required: ["entries", "tidak_dikenali"],
  additionalProperties: false,
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        required: [
          "jenis", "amount", "kategori", "sub_kategori",
          "payment_method", "occurred_at", "catatan", "confidence",
        ],
        additionalProperties: false,
        properties: {
          jenis: { enum: ["masuk", "keluar"] },
          amount: { type: ["integer", "null"] },
          kategori: { type: "string" },
          sub_kategori: { type: ["string", "null"] },
          payment_method: { enum: ["tunai", "qris", "transfer", "ewallet"] },
          occurred_at: { type: "string" },
          catatan: { type: "string" },
          confidence: { type: "number" },
        },
      },
    },
    // ENUM, bukan string bebas. Inilah yang membuat tab Catat tidak bisa
    // dipakai sebagai chatbot: model tidak punya field mana pun untuk menulis
    // kalimat yang akan dirender. Kalimatnya lahir di lib/catat/pesan.ts.
    //
    // `pertanyaan` SENGAJA DIHAPUS dari skema, bukan diketikkan. Server sudah
    // tahu kapan harus bertanya (ada entri bernominal null) dan kalimatnya
    // selalu satu bentuk — memberi model tempat menulisnya hanya membuka
    // kembali kanal yang baru saja ditutup.
    tidak_dikenali: { enum: [null, "bukan_uang", "tidak_jelas"] },
  },
} as const;

/** Prompt sistem = "Aturan parser" §17.1, apa adanya. */
function systemPrompt(ctx: LlmParseContext): string {
  const masuk = KATEGORI_MASUK.map((k) => k.slug).join(" | ");
  const keluar = KATEGORI_KELUAR.map((k) => k.slug).join(" | ");
  return [
    "Kamu pencatat keuangan untuk pelaku usaha mikro Indonesia. Ubah kalimat sehari-hari menjadi entri transaksi.",
    "ATURAN:",
    "- Satu kalimat boleh menghasilkan beberapa entri. Pisahkan setiap peristiwa uang menjadi entri sendiri.",
    "- DILARANG mengarang nominal. Bila nominal tidak disebut, isi amount: null — aplikasi yang akan menanyakannya.",
    "- Nominal ≠ kuantitas: pada \"jual 3 nasi goreng 45rb\", 3 adalah jumlah porsi dan 45rb adalah uang (amount: 45000).",
    "- Kenali format angka Indonesia: 45rb, 45k, 45.000, Rp45.000, 1,5jt, 2 juta, seratus ribu. amount selalu integer rupiah penuh.",
    `- Kenali waktu relatif terhadap hari ini (${ctx.today}, zona WIB): "kemarin", "tadi pagi", "senin lalu". Default: hari ini. occurred_at (YYYY-MM-DD) tidak boleh melebihi hari ini.`,
    "- payment_method: qris bila disebut QRIS/scan; transfer bila transfer/TF/rekening; ewallet bila OVO/Gopay/Dana/ShopeePay; selain itu tunai.",
    `- kategori WAJIB dipilih dari taksonomi ini. Untuk jenis masuk: ${masuk}. Untuk jenis keluar: ${keluar}. Bila ragu → lainnya. DILARANG membuat kategori baru.`,
    [
      "- Konteks pengguna:",
      ctx.earnerType ? `peran penghasilan ${ctx.earnerType}` : null,
      ctx.kategoriUsaha ? `usaha ${ctx.kategoriUsaha}` : null,
      ctx.kota ? `kota ${ctx.kota}` : null,
      "— pakai untuk menebak kategori yang wajar (mis. ojol + \"bensin\" → operasional; ojol + \"setoran\" → pemasukan ojek).",
    ]
      .filter(Boolean)
      .join(" "),
    "- Bila kalimat TIDAK berhubungan dengan uang sama sekali (sapaan, pertanyaan umum, obrolan), kembalikan entries: [] dan tidak_dikenali: \"bukan_uang\".",
    "- Bila kalimat terasa soal uang tapi kamu tidak cukup yakin membuat entri, kembalikan entries: [] dan tidak_dikenali: \"tidak_jelas\".",
    "- Bila ada entri, tidak_dikenali harus null.",
    "- DILARANG menulis kalimat untuk pengguna. Kamu hanya mengisi field; seluruh kalimat yang dilihat pengguna ditulis aplikasi, bukan kamu.",
    "- catatan: potongan teks asli yang menjadi entri itu. confidence: 0..1.",
    "- Jawab HANYA JSON. Tanpa markdown, tanpa penjelasan.",
  ].join("\n");
}

/**
 * Panggil parser LLM. Mengembalikan null bila: API key tidak ada, timeout
 * 5 detik, atau respons bukan JSON valid — pemanggil lalu memakai fallback.
 */
export async function parseWithLlm(
  text: string,
  ctx: LlmParseContext,
): Promise<LlmParseRaw | null> {
  const client = getAnthropic();
  if (!client) return null;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await client.messages.create(
      {
        model: LIGHT_MODEL,
        max_tokens: 1024,
        system: systemPrompt(ctx),
        messages: [{ role: "user", content: text.slice(0, 1000) }],
        output_config: {
          format: {
            type: "json_schema",
            schema: PARSER_SCHEMA as unknown as Record<string, unknown>,
          },
        },
      },
      { signal: ac.signal },
    );
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const parsed = JSON.parse(block.text) as { entries?: unknown; tidak_dikenali?: unknown };
    if (!Array.isArray(parsed.entries)) return null;
    return {
      entries: parsed.entries as RawEntry[],
      // Nilai di luar enum diperlakukan sebagai TIDAK ADA, bukan diteruskan.
      // Skema JSON sudah menegakkannya di sisi model; ini lapis kedua, karena
      // satu lapis yang gagal diam-diam adalah cara teks bebas kembali masuk.
      tidak_dikenali: kodeSah(parsed.tidak_dikenali) ? parsed.tidak_dikenali : null,
    };
  } catch {
    // Timeout, jaringan, atau JSON rusak — biar fallback yang bekerja.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
