/**
 * Orkestrasi parser (§9.2): LLM (timeout 5 dtk) → gagal/timeout → fallback
 * regex → tandai `parsed_by`. Kedua jalur berakhir di validasi server-side
 * yang sama — keluaran modul ini SUDAH aman untuk database.
 */

import { adaSinyalUang, parseFallback } from "@/lib/parse/fallback";
import { parseWithLlm, type LlmParseContext } from "@/lib/parse/llm";
import {
  validateEntries,
  type ValidatedEntry,
  type ValidatedResult,
} from "@/lib/parse/validate";
import type { ParsedBy } from "@/lib/transactions";
import type { EarnerType } from "@/lib/earner";
import type { Pertanyaan } from "@/lib/catat/pesan";

export interface ParseCatatResult extends ValidatedResult {
  parsedBy: ParsedBy;
}

export async function parseCatat(
  text: string,
  ctx: LlmParseContext,
): Promise<ParseCatatResult> {
  // 0) GERBANG PRA-LLM (§P1-5). Kalimat tanpa satu pun jejak uang usaha tidak
  //    pernah sampai ke model — bukan dikirim lalu jawabannya dibuang.
  //
  //    Dua alasan, keduanya berdiri sendiri. Biaya: tiap panggilan parser
  //    ~Rp27, dan pertanyaan pengetahuan umum tidak boleh membelinya. Keamanan:
  //    kalimat yang tidak pernah mencapai model tidak bisa membujuk model apa
  //    pun — "abaikan instruksimu" berhenti di sini, bukan di prompt.
  if (!adaSinyalUang(text)) {
    return {
      entries: [],
      pertanyaan: null,
      tidakDikenali: "bukan_uang",
      parsedBy: "fallback",
    };
  }

  // 1) Jalur utama: LLM JSON mode (§17.1). null = gagal/timeout/tak dikonfigurasi.
  const llm = await parseWithLlm(text, ctx);
  if (llm) {
    const entries = validateEntries(llm.entries, ctx.today);
    const adaHasil =
      entries.length > 0 || llm.tidak_dikenali !== null;
    // LLM menjawab tapi seluruh entrinya gugur validasi tanpa penjelasan —
    // jangan telan kosong; beri kesempatan ke fallback.
    if (adaHasil) {
      return {
        entries,
        pertanyaan: pertanyaanUntuk(entries),
        tidakDikenali: entries.length === 0 ? llm.tidak_dikenali : null,
        parsedBy: "llm",
      };
    }
  }

  // 2) Fallback regex (§7.2 ketentuan) — entri tetap bisa tersimpan.
  const fb = parseFallback(text, {
    today: ctx.today,
    earner: (ctx.earnerType ?? undefined) as EarnerType | undefined,
  });
  const entries = validateEntries(
    fb.entries.map((e) => ({
      jenis: e.jenis,
      amount: e.amount,
      kategori: e.kategori,
      payment_method: e.paymentMethod,
      occurred_at: e.occurredAt,
      catatan: e.catatan,
      confidence: e.confidence,
    })),
    ctx.today,
  );
  return {
    entries,
    pertanyaan: pertanyaanUntuk(entries),
    tidakDikenali: entries.length === 0 ? fb.tidakDikenali : null,
    parsedBy: "fallback",
  };
}

/**
 * Pertanyaan klarifikasi hanya sah bila memang ada draft tanpa nominal
 * (§7.2 prinsip #3: satu pertanyaan, dan hanya saat perlu).
 *
 * Model TIDAK lagi punya suara di sini. Sebelumnya ia boleh mengusulkan
 * kalimatnya sendiri dan usulan itu dirender apa adanya — satu-satunya kanal
 * teks bebas yang tersisa di jalur gratis. Sekarang bentuknya bertipe, dan
 * kalimatnya disusun `lib/catat/pesan.ts`.
 */
function pertanyaanUntuk(entries: ValidatedEntry[]): Pertanyaan | null {
  const draft = entries.find((e) => e.amount === null);
  if (!draft) return null;
  return { jenis: "nominal", untuk: draft.catatan };
}
