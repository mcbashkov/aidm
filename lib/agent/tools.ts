import type Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEmbedding, toVectorLiteral } from "@/lib/ai/embeddings";

/**
 * Tools agen riset (§9.3). Prinsip §12 (degradasi anggun): tiap tool terisolasi,
 * timeout ketat, dan saat gagal MELAPOR gagal secara eksplisit — agen lanjut
 * dengan sumber lain, tidak pernah mengarang data.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const TOOL_TIMEOUT_MS = 12_000;

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TOOL_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "User-Agent": UA, ...(init?.headers ?? {}) },
    });
  } finally {
    clearTimeout(t);
  }
}

function fail(tool: string, reason: string): string {
  return JSON.stringify({
    status: "gagal",
    tool,
    alasan: reason,
    instruksi:
      "Sumber ini tidak tersedia sekarang. Lanjutkan dengan sumber lain dan sebut keterbatasan ini di peringatan.",
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── 1. tiktok_trends — TikTok Creative Center (data publik) ─────────────── */

async function tiktokTrends(input: {
  keyword?: string;
  periode?: number;
}): Promise<string> {
  const period = input.periode === 30 ? 30 : 7;
  const url = `https://ads.tiktok.com/creative_radar_api/v1/popular_trend/hashtag/list?page=1&limit=15&period=${period}&country_code=ID&sort_by=popular`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        Referer: "https://ads.tiktok.com/business/creativecenter/",
        Accept: "application/json",
      },
    });
    if (!res.ok) return fail("tiktok_trends", `HTTP ${res.status}`);
    const data = (await res.json()) as {
      data?: {
        list?: {
          hashtag_name?: string;
          publish_cnt?: number;
          video_views?: number;
          rank?: number;
        }[];
      };
    };
    let list = data.data?.list ?? [];
    if (list.length === 0) return fail("tiktok_trends", "respons kosong");
    if (input.keyword) {
      const kw = input.keyword.toLowerCase();
      const filtered = list.filter((h) =>
        (h.hashtag_name ?? "").toLowerCase().includes(kw),
      );
      if (filtered.length > 0) list = filtered;
    }
    return JSON.stringify({
      status: "ok",
      tool: "tiktok_trends",
      tanggal: todayIso(),
      periode_hari: period,
      region: "ID",
      hashtag_populer: list.slice(0, 10).map((h) => ({
        hashtag: h.hashtag_name,
        peringkat: h.rank,
        jumlah_video: h.publish_cnt,
        total_views: h.video_views,
      })),
      catatan: input.keyword
        ? `Daftar hashtag populer ID (filter '${input.keyword}' diterapkan bila cocok).`
        : "Daftar hashtag populer Indonesia dari TikTok Creative Center.",
    });
  } catch {
    return fail("tiktok_trends", "koneksi gagal/timeout");
  }
}

/* ── 2. google_trends_id — Google Trends Indonesia ───────────────────────── */

async function googleTrendsId(input: { keywords?: string[] }): Promise<string> {
  // Trending searches harian ID via RSS publik (stabil). Interest-over-time
  // per keyword butuh token dance yang rapuh — keterbatasan disebut jujur.
  try {
    const res = await fetchWithTimeout(
      "https://trends.google.com/trending/rss?geo=ID",
      { headers: { Accept: "application/rss+xml,application/xml" } },
    );
    if (!res.ok) return fail("google_trends_id", `HTTP ${res.status}`);
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .map((m) => {
        const block = m[1];
        const title =
          /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/.exec(block)?.[1];
        const traffic =
          /<ht:approx_traffic>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/ht:approx_traffic>/.exec(
            block,
          )?.[1];
        return title ? { topik: title, perkiraan_pencarian: traffic ?? null } : null;
      })
      .filter(Boolean)
      .slice(0, 15);
    if (items.length === 0) return fail("google_trends_id", "RSS kosong");

    const kws = (input.keywords ?? []).map((k) => k.toLowerCase());
    const relevan =
      kws.length > 0
        ? items.filter((i) =>
            kws.some((k) => i!.topik.toLowerCase().includes(k)),
          )
        : [];

    return JSON.stringify({
      status: "ok",
      tool: "google_trends_id",
      tanggal: todayIso(),
      geo: "ID",
      pencarian_trending_hari_ini: items,
      cocok_dengan_keyword: relevan,
      catatan:
        "Data = pencarian trending harian Indonesia (Google Trends). Interest-over-time per keyword tidak tersedia di kanal ini — jika keyword tidak muncul di daftar, artinya tidak sedang trending nasional, bukan berarti tidak dicari.",
    });
  } catch {
    return fail("google_trends_id", "koneksi gagal/timeout");
  }
}

/* ── 3. marketplace_snapshot — snapshot pencarian publik on-demand ───────── */

async function marketplaceSnapshot(input: {
  query: string;
  platform?: string;
}): Promise<string> {
  const platform = input.platform === "shopee" ? "shopee" : "tokopedia";
  try {
    if (platform === "tokopedia") {
      // GraphQL publik pencarian Tokopedia (tanpa auth) — bisa berubah/diblokir.
      const res = await fetchWithTimeout("https://gql.tokopedia.com/graphql/SearchProductQueryV4", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://www.tokopedia.com/",
          "X-Source": "tokopedia-lite",
          "X-Tkpd-Lite-Service": "zeus",
        },
        body: JSON.stringify([
          {
            operationName: "SearchProductQueryV4",
            variables: {
              params: `device=desktop&ob=23&page=1&q=${encodeURIComponent(input.query)}&related=true&rows=20&safe_search=false&scheme=https&source=search`,
            },
            query:
              "query SearchProductQueryV4($params: String!) { ace_search_product_v4(params: $params) { data { products { name price priceRange countReview rating } } } }",
          },
        ]),
      });
      if (!res.ok) return fail("marketplace_snapshot", `HTTP ${res.status}`);
      const json = (await res.json()) as {
        data?: {
          ace_search_product_v4?: {
            data?: {
              products?: {
                name?: string;
                price?: string;
                countReview?: number;
                rating?: number;
              }[];
            };
          };
        };
      }[];
      const products =
        json?.[0]?.data?.ace_search_product_v4?.data?.products ?? [];
      if (products.length === 0)
        return fail("marketplace_snapshot", "hasil kosong/terblokir");
      return JSON.stringify({
        status: "ok",
        tool: "marketplace_snapshot",
        tanggal: todayIso(),
        platform: "tokopedia",
        query: input.query,
        produk: products.slice(0, 15).map((p) => ({
          nama: p.name,
          harga: p.price,
          jumlah_ulasan: p.countReview,
          rating: p.rating,
        })),
        catatan:
          "Snapshot satu kali dari halaman pencarian publik Tokopedia (bukan crawler kontinyu).",
      });
    }
    // Shopee: API pencariannya butuh cookie anti-bot — jujur laporkan.
    return fail(
      "marketplace_snapshot",
      "platform shopee sedang tidak tersedia (proteksi anti-bot); coba platform tokopedia",
    );
  } catch {
    return fail("marketplace_snapshot", "koneksi gagal/timeout");
  }
}

/* ── 5. corpus_search — korpus tren internal (pgvector) ──────────────────── */

async function corpusSearch(input: { query: string }): Promise<string> {
  try {
    const embedding = await getEmbedding(input.query);
    if (!embedding)
      return fail("corpus_search", "embedding tidak dikonfigurasi");
    const supa = createSupabaseAdminClient();
    const { data, error } = await supa.rpc("match_trend_corpus", {
      query_embedding: toVectorLiteral(embedding),
      match_count: 5,
      max_age_days: 7,
    });
    if (error) return fail("corpus_search", "query korpus gagal");
    const rows = (data ?? []) as {
      topik: string | null;
      ringkas: string | null;
      kota: string | null;
      confidence: number | null;
      created_at: string;
      similarity: number;
    }[];
    if (rows.length === 0)
      return JSON.stringify({
        status: "ok",
        tool: "corpus_search",
        tanggal: todayIso(),
        hasil: [],
        catatan: "Belum ada riset serupa di korpus internal (< 7 hari).",
      });
    return JSON.stringify({
      status: "ok",
      tool: "corpus_search",
      tanggal: todayIso(),
      hasil: rows.map((r) => ({
        topik: r.topik,
        ringkas: r.ringkas,
        kota: r.kota,
        skor_kepercayaan: r.confidence,
        tanggal_riset: r.created_at?.slice(0, 10),
        kemiripan: Number(r.similarity?.toFixed(2)),
      })),
    });
  } catch {
    return fail("corpus_search", "korpus tidak tersedia");
  }
}

/* ── Definisi untuk Claude API ───────────────────────────────────────────── */

export const CUSTOM_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "tiktok_trends",
    description:
      "Ambil hashtag/tren populer Indonesia dari TikTok Creative Center (data publik). Panggil saat butuh tren konten/produk yang lagi naik di TikTok. Periode 7 atau 30 hari.",
    input_schema: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "Kata kunci untuk memfilter hashtag (opsional)",
        },
        periode: {
          type: "number",
          description: "Periode hari: 7 (default) atau 30",
        },
      },
    },
  },
  {
    name: "google_trends_id",
    description:
      "Ambil pencarian yang sedang trending di Google Indonesia hari ini. Panggil saat butuh sinyal minat pencarian/topik hangat nasional.",
    input_schema: {
      type: "object",
      properties: {
        keywords: {
          type: "array",
          items: { type: "string" },
          description: "Kata kunci yang ingin dicocokkan dengan daftar trending",
        },
      },
    },
  },
  {
    name: "marketplace_snapshot",
    description:
      "Snapshot on-demand hasil pencarian marketplace (nama produk, harga, ulasan, rating) untuk SATU query. Panggil saat butuh data harga/kompetitor produk. Platform: tokopedia (default) atau shopee.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Kata kunci produk" },
        platform: {
          type: "string",
          enum: ["tokopedia", "shopee"],
          description: "Marketplace tujuan",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "corpus_search",
    description:
      "Cari korpus riset internal AIDM (hasil riset < 7 hari). Panggil di awal untuk cek apakah sudah ada temuan serupa.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Topik yang dicari" },
      },
      required: ["query"],
    },
  },
];

/** Server tool web_search (§9.3 #4) — dieksekusi sisi Anthropic. */
export const WEB_SEARCH_TOOL = {
  type: "web_search_20260209" as const,
  name: "web_search" as const,
  max_uses: 3,
};

/** Label status untuk UI streaming (§7.2 alur #3). */
export const TOOL_STATUS_LABEL: Record<string, string> = {
  tiktok_trends: "Mengecek TikTok Creative Center…",
  google_trends_id: "Mengecek Google Trends…",
  marketplace_snapshot: "Mengecek marketplace…",
  web_search: "Mencari di web…",
  corpus_search: "Mengecek korpus riset…",
};

export async function executeCustomTool(
  name: string,
  input: unknown,
): Promise<string> {
  const args = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "tiktok_trends":
      return tiktokTrends(args as { keyword?: string; periode?: number });
    case "google_trends_id":
      return googleTrendsId(args as { keywords?: string[] });
    case "marketplace_snapshot":
      if (typeof args.query !== "string" || !args.query) {
        return fail("marketplace_snapshot", "parameter query kosong");
      }
      return marketplaceSnapshot(args as unknown as { query: string; platform?: string });
    case "corpus_search":
      if (typeof args.query !== "string" || !args.query) {
        return fail("corpus_search", "parameter query kosong");
      }
      return corpusSearch(args as unknown as { query: string });
    default:
      return fail(name, "tool tidak dikenal");
  }
}
