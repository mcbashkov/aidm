/**
 * Embedding untuk cache korpus (§7.2 cek cache, §7.8 korpus).
 * Provider: Gemini `text-embedding-004` = 768 dim (sesuai skema §10 vector(768)).
 *
 * Lingkupnya HANYA pencarian kemiripan vektor — otak agen riset tetap Claude
 * API (§9.1), tidak berubah.
 *
 * Opsional: null bila GEMINI_API_KEY tidak diisi → cache vektor dinonaktifkan
 * dan setiap query menjadi riset segar (tarif penuh).
 */

const EMBEDDING_MODEL = "text-embedding-004";

/** Dimensi keluaran model — harus sama dengan vector(n) di migrasi 0004/0010. */
export const EMBEDDING_DIM = 768;

/** Batas input model 2.048 token. Pertanyaan riset jauh lebih pendek; potong
 *  konservatif supaya teks panjang tidak ditolak API. */
const MAX_INPUT_CHARS = 4000;

export async function getEmbedding(text: string): Promise<number[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text: text.slice(0, MAX_INPUT_CHARS) }] },
          // Kedua sisi perbandingan sama-sama pertanyaan riset, jadi pakai task
          // type simetris — bukan RETRIEVAL_QUERY/RETRIEVAL_DOCUMENT.
          taskType: "SEMANTIC_SIMILARITY",
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { embedding?: { values?: number[] } };
    const values = data.embedding?.values;
    // Dimensi tak sesuai = tidak akan cocok dengan kolom vector(768); lebih baik
    // matikan cache daripada melempar error dari Postgres saat insert.
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIM) return null;
    return values;
  } catch {
    return null;
  }
}

/** Format array → literal pgvector "[a,b,c]". */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

/** Cosine similarity (0..1). */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
