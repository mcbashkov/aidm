import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionValue } from "@/lib/auth/session-cookie";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDailyFree } from "@/lib/credits";
import { getCreditParams } from "@/lib/config";
import { isAnthropicConfigured } from "@/lib/ai/models";

export const runtime = "nodejs";

/**
 * Umur maksimum sebuah riset yang masih dianggap "sedang berjalan" saat
 * menghitung kuota. Antrean bisa ditinggalkan — pengguna menekan Riset lalu
 * menutup tab, dan barisnya tetap `queued` selamanya — jadi tanpa batas umur
 * satu tab yang ditutup akan mengunci kuotanya sendiri tanpa pernah dipakai.
 * 10 menit = lebih dari tiga kali `maxDuration` endpoint stream (180 dtk).
 */
const JENDELA_BERJALAN_MS = 10 * 60_000;

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

    // Riset yang sudah diantre tapi belum selesai IKUT DIHITUNG di pagar ini.
    // Tanpa itu, dua permintaan bersamaan sama-sama melihat saldo 3, sama-sama
    // lolos, lalu dua-duanya menagih 3 setelah selesai — saldo berakhir -3 dan
    // pengguna mendapat dua riset seharga satu. Pembebanan memang baru terjadi
    // di akhir (charge-on-success §7.2), jadi saldo saja bukan gambaran utuh:
    // yang sudah dijanjikan kepada pekerjaan berjalan harus ikut dikurangkan.
    const { count: berjalan, error: errBerjalan } = await supa
      .from("research_queries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .in("status", ["queued", "running"])
      .gte("created_at", new Date(Date.now() - JENDELA_BERJALAN_MS).toISOString());
    // Gagal menghitung = tidak tahu berapa yang sedang berjalan. Menganggapnya
    // nol berarti membuka kembali celah yang baru saja ditutup, jadi pagarnya
    // dipasang pada asumsi paling aman: seolah ada satu yang berjalan.
    const antre = errBerjalan ? 1 : (berjalan ?? 0);

    const perlu = params.research * (antre + 1);
    if (balance < perlu) {
      return NextResponse.json(
        {
          error: "Kredit tidak cukup",
          balance,
          needed: perlu,
          berjalan: antre,
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
