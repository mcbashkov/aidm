import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hapusCacheKesiapan } from "@/lib/kesiapan/server";
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
import {
  KASBON_COLUMNS,
  kasbonDibuatHariIni,
  kasbonKeEntri,
  type KasbonRow,
} from "@/lib/kasbon/server";

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
 * sisanya bernilai. Kasbon lewat pintu yang sama, jadi ikut gratis.
 *
 * Kasbon (Batch 2): entri `status_bayar = "belum"` disimpan di tabel `kasbon`,
 * BUKAN `transactions` — uangnya belum berpindah, jadi ia tidak boleh masuk
 * rollup, laporan, maupun segel (migrasi 0031). `pihak` hanya disimpan di
 * sana; transaksi biasa tidak menyimpan nama orang ketiga.
 */
export async function POST(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  // Rollup/kasbon pengguna ini akan berubah → hasil Kesiapan Catatan hari ini
  // tidak lagi sah (lib/kesiapan/server.ts).
  hapusCacheKesiapan(uid);

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

    // Batas anti-abuse §7.2: 200 entri/user/hari — transaksi DAN kasbon,
    // karena keduanya entri yang lahir dari Catat.
    const [sudahTx, sudahKasbon] = await Promise.all([
      entriDibuatHariIni(supa, uid),
      kasbonDibuatHariIni(supa, uid),
    ]);
    const sudah = sudahTx + sudahKasbon;
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
    const kategoriId = (slug: string) =>
      maps.bySlug.get(slug) ?? fallbackKategoriId;
    // Parser memberi tanggal saja; jam dipatok 12:00 WIB supaya tanggal WIB
    // baris ini stabil dilihat dari timezone mana pun.
    const jamWib = (tgl: string) => `${tgl}T12:00:00+07:00`;

    const kas = entries.filter((e) => e.statusBayar === "lunas");
    const kasbon = entries.filter((e) => e.statusBayar === "belum");

    const rowsTx = kas.map((e) => ({
      user_id: uid,
      jenis: e.jenis,
      amount: e.amount,
      kategori_id: kategoriId(e.kategori),
      sub_kategori: e.subKategori,
      payment_method: e.paymentMethod,
      catatan: e.catatan || null,
      occurred_at: jamWib(e.occurredAt),
      source,
      parsed_by: hasil.parsedBy,
      raw_input: text,
      status: e.status,
      items: e.items,
    }));
    const rowsKasbon = kasbon.map((e) => ({
      user_id: uid,
      tipe: e.jenis === "masuk" ? "piutang" : "utang",
      pihak: e.pihak,
      amount: e.amount,
      kategori_id: kategoriId(e.kategori),
      items: e.items,
      catatan: e.catatan || null,
      raw_input: text,
      occurred_at: jamWib(e.occurredAt),
      source,
      parsed_by: hasil.parsedBy,
      // Tanpa nominal → draft, persis seperti transaksi: satu pertanyaan
      // nominal, dilengkapi lewat /api/catat/konfirmasi.
      status: e.amount === null ? "draft" : "aktif",
    }));

    let insertedTx: TxRow[] = [];
    if (rowsTx.length > 0) {
      const { data, error } = await supa
        .from("transactions")
        .insert(rowsTx)
        .select(TX_COLUMNS);
      if (error || !data) {
        return NextResponse.json(
          { error: "Gagal menyimpan catatan." },
          { status: 500 },
        );
      }
      insertedTx = data as TxRow[];
    }

    let insertedKasbon: KasbonRow[] = [];
    if (rowsKasbon.length > 0) {
      const { data, error } = await supa
        .from("kasbon")
        .insert(rowsKasbon)
        .select(KASBON_COLUMNS);
      if (error || !data) {
        // Satu kalimat = satu catatan utuh. Transaksi dari kalimat yang sama
        // ditarik kembali supaya pengguna yang mengirim ulang tidak
        // mendapatkan penjualan tunainya tercatat dua kali. Ini baris yang
        // baru dibuat permintaan ini sendiri (id-nya dari insert di atas),
        // dan trigger rollup mengurangkannya kembali.
        if (insertedTx.length > 0) {
          await supa
            .from("transactions")
            .delete()
            .eq("user_id", uid)
            .in(
              "id",
              insertedTx.map((r) => r.id),
            );
        }
        return NextResponse.json(
          { error: "Gagal menyimpan catatan." },
          { status: 500 },
        );
      }
      insertedKasbon = data as KasbonRow[];
    }

    // Kembalikan dalam urutan kalimatnya, bukan dikelompokkan per tabel —
    // "jual 45rb, Bu Ani ngebon 20rb" tampil sebagai dua kartu berurutan.
    // Di dalam satu tabel urutannya mengikuti RETURNING; kalaupun suatu saat
    // berbeda, yang bergeser hanya urutan tampil, bukan isi catatan.
    let iTx = 0;
    let iKb = 0;
    const keluaran = entries.map((e) =>
      e.statusBayar === "belum"
        ? kasbonKeEntri(insertedKasbon[iKb++], maps.byId)
        : rowToTx(insertedTx[iTx++], maps.byId),
    );

    return NextResponse.json({
      entries: keluaran,
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
