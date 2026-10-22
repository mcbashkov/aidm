import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/catat/server";
import { RANTAI, slugSah } from "@/lib/chains/slug";
import {
  RPC_BATAS_BODY_BYTE,
  RPC_RATE_JENDELA_DETIK,
  RPC_RATE_PER_MENIT,
  jawabLokal,
  naikkanLajuRpc,
  periksaBody,
  teruskan,
  upstreamUntuk,
} from "@/lib/rpc/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Timeout upstream 8 dtk + satu giliran cadangan harus muat di sini.
export const maxDuration = 20;

const HEADER = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
} as const;

function galatRpc(id: unknown, kode: number, pesan: string, status: number, ekstra?: Record<string, string>) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code: kode, message: pesan } },
    { status, headers: { ...HEADER, ...(ekstra ?? {}) } },
  );
}

/**
 * Kunci batas laju: sesi aplikasi bila ada, kalau tidak alamat IP. Dompet
 * Privy bisa memanggil RPC sebelum cookie sesi terbentuk, jadi jalur tanpa
 * sesi harus tetap dilayani — cukup dengan pagar per IP.
 */
function kunciLaju(req: Request): string {
  const uid = currentUserId();
  if (uid) return `uid:${uid}`;
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const ip = (xff.split(",")[0] || req.headers.get("x-real-ip") || "").trim();
  return `ip:${ip || "tanpa-alamat"}`;
}

/**
 * POST /api/rpc/<opbnb|opbnb-testnet|bsc|bsc-testnet> — proxy JSON-RPC
 * same-origin (Batch 8). Pagar dan alasannya di lib/rpc/proxy.ts.
 *
 * Dua nama di perintah (`opbnb`, `bsc`) berlaku; dua slug testnet ikut
 * dilayani karena dompet Privy mendaftarkan keempat jaringan sekaligus dan
 * kontrak saat ini hidup di fase testnet.
 */
export async function POST(
  req: Request,
  { params }: { params: { chain: string } },
) {
  const slug = params.chain;
  if (!slugSah(slug)) {
    return NextResponse.json({ error: "Jaringan tidak dikenal." }, { status: 404, headers: HEADER });
  }

  const panjangHeader = Number(req.headers.get("content-length") ?? 0);
  if (panjangHeader > RPC_BATAS_BODY_BYTE) {
    return galatRpc(null, -32600, "Body melebihi 64 KB", 413);
  }
  const teks = await req.text();
  if (Buffer.byteLength(teks, "utf8") > RPC_BATAS_BODY_BYTE) {
    return galatRpc(null, -32600, "Body melebihi 64 KB", 413);
  }

  let json: unknown;
  try {
    json = JSON.parse(teks);
  } catch {
    return galatRpc(null, -32700, "JSON tidak valid", 400);
  }

  const periksa = periksaBody(json);
  if (!periksa.ok) {
    return galatRpc(periksa.id, periksa.kode, periksa.pesan, periksa.status);
  }

  // Dihitung SETELAH validasi: permintaan yang ditolak di atas tidak menyentuh
  // database maupun upstream, jadi tidak perlu dihitung.
  const jml = await naikkanLajuRpc(kunciLaju(req), periksa.items.length);
  if (jml !== null && jml > RPC_RATE_PER_MENIT) {
    return galatRpc(
      null,
      -32005,
      "Terlalu banyak permintaan ke jaringan. Coba lagi sebentar lagi.",
      429,
      { "Retry-After": String(RPC_RATE_JENDELA_DETIK) },
    );
  }

  const chain = RANTAI[slug];
  const lokal = jawabLokal(periksa.items, chain.id, periksa.batch);
  if (lokal !== null) {
    return NextResponse.json(lokal as never, { headers: HEADER });
  }

  const hasil = await teruskan(upstreamUntuk(slug), JSON.stringify(json));
  if (hasil === null) {
    return galatRpc(null, -32000, `Jaringan ${chain.name} tidak menjawab. Coba lagi.`, 502);
  }
  return new NextResponse(hasil, { status: 200, headers: HEADER });
}
