/**
 * Kontrak output agen riset (§17) — dipakai sebagai structured output
 * (output_config.format json_schema) pada sintesis akhir.
 */

export const RESEARCH_BODY_SCHEMA = {
  type: "object",
  properties: {
    ringkasan: {
      type: "string",
      description: "2-3 kalimat inti temuan, Bahasa Indonesia sederhana",
    },
    temuan: {
      type: "array",
      description:
        "Poin data dengan sumber + tanggal. Hanya dari hasil tool — dilarang mengarang angka.",
      items: {
        type: "object",
        properties: {
          poin: { type: "string" },
          angka: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Angka/metrik bila ada (mis. '+38% MoM')",
          },
          sumber: {
            type: "string",
            description:
              "Nama tool sumber: tiktok_trends | google_trends_id | marketplace_snapshot | web_search | corpus_search",
          },
          tanggal: {
            type: "string",
            description: "Tanggal ambil data, format YYYY-MM-DD",
          },
        },
        required: ["poin", "angka", "sumber", "tanggal"],
        additionalProperties: false,
      },
    },
    peluang_aksi: {
      type: "array",
      description:
        "2-4 aksi konkret berskala mikro (modal kecil, langkah minggu ini) untuk user",
      items: { type: "string" },
    },
    peringatan: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Keterbatasan data bila ada (tool gagal, data tipis)",
    },
    saran_lanjutan: {
      type: "array",
      description: "2-3 chip pertanyaan lanjutan singkat",
      items: { type: "string" },
    },
  },
  required: ["ringkasan", "temuan", "peluang_aksi", "peringatan", "saran_lanjutan"],
  additionalProperties: false,
} as const;

export const MODERATION_SCHEMA = {
  type: "object",
  properties: {
    in_scope: {
      type: "boolean",
      description:
        "true bila pertanyaan seputar bisnis/pasar/marketing/usaha; false untuk topik lain",
    },
  },
  required: ["in_scope"],
  additionalProperties: false,
} as const;
