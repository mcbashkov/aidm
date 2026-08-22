import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/catat/server";
import { todayWib } from "@/lib/parse/validate";
import { earnerLabel } from "@/lib/earner";
// Blok verifikasi PDF menunjuk chain tempat KONTRAK SEGEL hidup (bisa testnet
// selama M4), bukan chain default aplikasi — alamat & tautan explorer yang
// dicetak harus bisa benar-benar dicek petugas bank.
import { attestationAddress, sealChain } from "@/lib/chains/attestation";
import {
  awalBulan,
  geserBulan,
  geserHari,
  rentangTanggal,
} from "@/lib/laporan/periode";
import {
  ambilRollups,
  breakdownKategori,
  ringkasDariRollups,
  statusSegel,
} from "@/lib/laporan/server";
import { renderLaporanPdf, type BarisBulanan } from "@/lib/laporan/pdf";

export const runtime = "nodejs";
// Merender PDF melebihi jendela default fungsi serverless pada laporan panjang.
export const maxDuration = 30;

const BULAN_TABEL = 12;

/**
 * GET /api/laporan/pdf?period=2026-08 (§11) — laporan keuangan siap cetak.
 *
 * Dirender di server, bukan di browser: berkas ini harus identik untuk periode
 * yang sama siapa pun yang mengunduhnya (§7.5 — nanti hash-nya disegel
 * on-chain), sementara render sisi klien bergantung pada font, zona waktu, dan
 * mesin masing-masing perangkat.
 */
export async function GET(req: Request) {
  const uid = currentUserId();
  if (!uid) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const period = new URL(req.url).searchParams.get("period") ?? "30d";
  if (!/^\d{4}-\d{2}$/.test(period) && period !== "30d" && period !== "today") {
    return NextResponse.json({ error: "Periode tidak dikenal." }, { status: 400 });
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

  try {
    const rentang = rentangTanggal(period);
    const hariIni = todayWib();
    // Tabel arus kas 12 bulan terakhir dihitung mundur dari AKHIR periode yang
    // dicetak — bukan dari hari ini — supaya laporan bulan lampau tetap
    // menampilkan riwayat yang relevan dengan periodenya.
    const akhir = rentang.end ?? geserHari(hariIni, 1);
    const mulai12 = geserBulan(awalBulan(geserHari(akhir, -1)), -(BULAN_TABEL - 1));

    const [rollups, kategori, segel, { data: user }, { data: bulananRaw }] =
      await Promise.all([
        ambilRollups(supa, uid, rentang),
        breakdownKategori(supa, uid, rentang),
        statusSegel(supa, uid, period),
        supa
          .from("users")
          .select("nama_usaha, earner_type, kota")
          .eq("id", uid)
          .maybeSingle(),
        supa.rpc("laporan_bulanan", {
          p_user: uid,
          p_start: mulai12,
          p_end: akhir,
        }),
      ]);

    const bulanan: BarisBulanan[] = (
      (bulananRaw ?? []) as {
        bulan: string;
        total_masuk: number;
        total_keluar: number;
        jml_transaksi: number;
        hari_aktif: number;
      }[]
    ).map((b) => ({
      bulan: b.bulan,
      masuk: Number(b.total_masuk),
      keluar: Number(b.total_keluar),
      jmlTransaksi: b.jml_transaksi,
      hariAktif: b.hari_aktif,
    }));

    const pdf = await renderLaporanPdf({
      usaha: {
        // Nama usaha boleh kosong (§7.1 onboarding bisa dilewati); jangan
        // mencetak "null" di kop dokumen yang dibaca petugas bank.
        nama: user?.nama_usaha?.trim() || "Usaha Saya",
        jenis: earnerLabel(user?.earner_type),
        kota: user?.kota ?? null,
      },
      period,
      dicetakPada: hariIni,
      kini: ringkasDariRollups(rollups),
      masuk: kategori.masuk,
      keluar: kategori.keluar,
      bulanan,
      segel,
      kontrak: {
        alamat: attestationAddress(),
        explorer: sealChain().blockExplorers?.default.url ?? "",
        jaringan: sealChain().name,
      },
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laporan-aidm-${period}.pdf"`,
        // Angka bisa berubah sampai periodenya disegel — jangan sampai
        // proxy/CDN menyajikan versi lama sebagai laporan terbaru.
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal membuat PDF. Coba lagi ya." },
      { status: 500 },
    );
  }
}
