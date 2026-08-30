import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCatat } from "@/lib/parse";
import { todayWib } from "@/lib/wib";
import {
  CATAT_DAILY_LIMIT,
  CATAT_RATE_PER_MENIT,
  CATAT_REQUEST_LIMIT,
  currentUserId,
  entriDibuatHariIni,
  getKategoriMaps,
  naikkanKuotaRequest,
  naikkanOfftopic,
  naikkanRateMenit,
  rowToTx,
  TX_COLUMNS,
  type TxRow,
} from "@/lib/catat/server";

export const runtime = "nodejs";

/**
 * POST /api/catat (§11): {text, source} → {entries[], pertanyaan?}.
 *
 * Optimistic save (§7.2 prinsip #2): entri bernominal langsung `confirmed`;
 * field wajib kosong → `draft` + satu pertanyaan klarifikasi.
 *
 * GRATIS SELAMANYA (§7.2 prinsip #5): route ini TIDAK menyentuh langganan
 * maupun kuota premium sama sekali, dan tidak boleh. Mencatat adalah pengait
 * harian produk ini — memungutnya berarti memungut hal yang membuat seluruh
 * sisanya bernilai.
 */
export async function POST(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let text = "";
  let source: "chat" | "voice" = "chat";
  try {
    const body = (await req.json()) as { text?: string; source?: string };
    text = (body.text ?? "").trim().slice(0, 1000);
    if (body.source === "voice") source = "voice";
  } catch {
    /* body kosong */
  }
  if (!text) {
    return NextResponse.json({ error: "Teks kosong" }, { status: 400 });
  }

  let supa;
  try {
    supa = createSupabaseAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 501 },
    );
  }

  const today = todayWib();

  try {
    // Batas LAJU sebelum batas harian: tanpa ini, jatah 400 percakapan sehari
    // bisa dihabiskan skrip dalam satu menit. Manusia tidak pernah menyentuh
    // sepuluh per menit (produksi: rata-rata 2,82 per HARI, tertinggi 7).
    const dalamMenit = await naikkanRateMenit(supa, uid, today);
    if (dalamMenit !== null && dalamMenit > CATAT_RATE_PER_MENIT) {
      return NextResponse.json(
        {
          error:
            "Terlalu cepat. Tunggu sebentar lalu kirim lagi ya — catatanmu aman.",
        },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    // Batas percakapan/hari — dinaikkan SEBELUM parser dipanggil supaya
    // kalimat yang tidak menghasilkan entri pun ikut terhitung (kalau tidak,
    // parser LLM berbayar bisa dipanggil tanpa batas).
    const request_ke = await naikkanKuotaRequest(supa, uid, today);
    if (request_ke !== null && request_ke > CATAT_REQUEST_LIMIT) {
      return NextResponse.json(
        {
          error:
            "Terlalu banyak percakapan hari ini. Coba lagi besok ya — catatanmu aman tersimpan.",
        },
        { status: 429 },
      );
    }

    // Batas anti-abuse §7.2: 200 entri/user/hari.
    const sudah = await entriDibuatHariIni(supa, uid);
    if (sudah >= CATAT_DAILY_LIMIT) {
      return NextResponse.json(
        {
          error:
            "Batas 200 catatan per hari tercapai. Lanjut lagi besok ya — datamu hari ini aman tersimpan.",
        },
        { status: 429 },
      );
    }

    // Konteks profil untuk parser (§7.2 alur #2).
    const { data: profil } = await supa
      .from("users")
      .select("earner_type, kota, categories:kategori_id(nama)")
      .eq("id", uid)
      .maybeSingle();
    const katRel = profil?.categories as
      | { nama?: string }
      | { nama?: string }[]
      | null;
    const kategoriUsaha = Array.isArray(katRel) ? katRel[0]?.nama : katRel?.nama;

    const hasil = await parseCatat(text, {
      today,
      earnerType: profil?.earner_type ?? null,
      kategoriUsaha: kategoriUsaha ?? null,
      kota: profil?.kota ?? null,
    });

    if (hasil.entries.length === 0) {
      // Hitungan offtopic HANYA menentukan panjang-pendek kalimat penolakan
      // (lib/catat/pesan.ts). Ia tidak membatasi, menangguhkan, atau menandai
      // apa pun — mencoba mengobrol dengan AI adalah rasa ingin tahu yang
      // wajar bagi orang yang baru pertama memakainya.
      const offtopic =
        hasil.tidakDikenali === "bukan_uang"
          ? await naikkanOfftopic(supa, uid, today)
          : null;
      return NextResponse.json({
        entries: [],
        pertanyaan: null,
        tidak_dikenali: hasil.tidakDikenali,
        offtopic_hari_ini: offtopic ?? 0,
        parsed_by: hasil.parsedBy,
      });
    }

    // Kuota sisa hari ini membatasi jumlah entri yang boleh lahir dari satu
    // kalimat — kelebihan dipotong, bukan ditolak seluruhnya.
    const entries = hasil.entries.slice(0, CATAT_DAILY_LIMIT - sudah);

    const maps = await getKategoriMaps(supa);
    const fallbackKategoriId = maps.bySlug.get("lainnya") ?? null;
    const rows = entries.map((e) => ({
      user_id: uid,
      jenis: e.jenis,
      amount: e.amount,
      kategori_id: maps.bySlug.get(e.kategori) ?? fallbackKategoriId,
      sub_kategori: e.subKategori,
      payment_method: e.paymentMethod,
      catatan: e.catatan || null,
      // Parser memberi tanggal saja; jam dipatok 12:00 WIB supaya tanggal
      // WIB baris ini stabil dilihat dari timezone mana pun.
      occurred_at: `${e.occurredAt}T12:00:00+07:00`,
      source,
      parsed_by: hasil.parsedBy,
      raw_input: text,
      status: e.status,
    }));

    const { data: inserted, error } = await supa
      .from("transactions")
      .insert(rows)
      .select(TX_COLUMNS);
    if (error || !inserted) {
      return NextResponse.json(
        { error: "Gagal menyimpan catatan." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      entries: (inserted as TxRow[]).map((r) => rowToTx(r, maps.byId)),
      pertanyaan: hasil.pertanyaan,
      tidak_dikenali: null,
      parsed_by: hasil.parsedBy,
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi gangguan saat mencatat. Coba lagi ya." },
      { status: 500 },
    );
  }
}
