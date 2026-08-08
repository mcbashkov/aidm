/**
 * Embedding untuk cache korpus (§7.2 cek cache, §7.8 korpus). OpenAI
 * text-embedding-3-small = 1536 dim (sesuai skema §10 vector(1536)).
 * Opsional: null bila OPENAI_API_KEY tidak diisi → cache vektor dinonaktifkan.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { embedding?: number[] }[];
    };
    return data.data?.[0]?.embedding ?? null;
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
