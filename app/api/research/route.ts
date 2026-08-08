import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDailyFree } from "@/lib/credits";
import { getCreditParams } from "@/lib/config";
import { isAnthropicConfigured } from "@/lib/ai/models";

export const runtime = "nodejs";

function currentUserId(): string | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  return readSessionValue(raw)?.uid ?? null;
}

/**
 * POST /api/research (§11): buat query riset → {query_id}.
 * Kredit TIDAK dipotong di sini — dipotong saat sukses (cache/segar) di
 * endpoint stream; gagal total = tidak terpotong (AC §7.2).
 */
export async function POST(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!isAnthropicConfigured) {
    return NextResponse.json(
      { error: "Agen riset belum dikonfigurasi (ANTHROPIC_API_KEY)." },
      { status: 501 },
    );
  }

  let text = "";
  let forceFresh = false;
  try {
    const body = (await req.json()) as { text?: string; force_fresh?: boolean };
    text = (body.text ?? "").trim();
    forceFresh = body.force_fresh === true;
  } catch {
    /* body kosong */
  }
  if (!text || text.length < 3) {
    return NextResponse.json({ error: "Pertanyaan kosong" }, { status: 400 });
  }

  try {
    const supa = createSupabaseAdminClient();
    const params = await getCreditParams();
    const balance = await ensureDailyFree(supa, uid);
    if (balance < params.research) {
      return NextResponse.json(
        {
          error: "Kredit tidak cukup",
          balance,
          needed: params.research,
        },
        { status: 402 },
      );
    }

    const { data: query, error } = await supa
      .from("research_queries")
      .insert({
        user_id: uid,
        mode: "chat",
        input_text: text.slice(0, 2000),
        status: "queued",
      })
      .select("id")
      .single();
    if (error || !query) {
      return NextResponse.json({ error: "Gagal membuat query" }, { status: 500 });
    }
    return NextResponse.json({
      query_id: query.id,
      force_fresh: forceFresh,
      balance,
    });
  } catch {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }
}

/** GET /api/research?page= — riwayat riset user (§11). */
export async function GET(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const url = new URL(req.url);
  const page = Math.max(0, Number(url.searchParams.get("page") ?? "0") || 0);
  const pageSize = 10;
  try {
    const supa = createSupabaseAdminClient();
    const { data } = await supa
      .from("research_queries")
      .select("id, input_text, status, cache_hit, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    return NextResponse.json({ items: data ?? [], page });
  } catch {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }
}
