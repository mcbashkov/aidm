/**
 * Alarm invarian §7.1 — "punya akun = punya wallet".
 *
 * KENAPA BERKAS INI ADA.
 *
 * Antara 28 Agustus dan 7 September 2026, tujuh pengguna berturut-turut
 * mendaftar tanpa dompet dan tidak ada yang menyadarinya selama sepuluh hari.
 * Bukan karena pemantauannya lalai, melainkan karena tidak ada yang bisa
 * dilihat: tiga hari lalu lintas produksi pada hari penemuan berisi 4.527
 * respons `200`, 70 `304`, 7 `307` — nol 4xx, nol 5xx. Jalur yang mati
 * menjawab dengan kode sukses, dan setiap alat yang kita punya mengukur
 * kegagalan lewat kode galat.
 *
 * Pelajaran yang dipasang di sini: sistem yang menjaga sebuah invarian harus
 * memeriksa INVARIANNYA, bukan gejala kegagalannya. Pertanyaan "apakah ada
 * permintaan yang gagal" tidak pernah bisa menjawab "apakah setiap akun punya
 * dompet". Hanya pertanyaan kedua yang bisa.
 *
 * BENTUKNYA, dan kenapa demikian:
 *
 *   · Ambangnya NOL, bukan angka yang bisa disetel. Invariannya menyatakan
 *     100%; setiap pelanggaran adalah cacat. Ambang yang bisa disetel adalah
 *     ambang yang bisa salah setel, dan yang paling mungkin disetel adalah
 *     "cukup tinggi supaya berhenti berisik".
 *
 *   · Yang dilaporkan bukan cuma jumlah, tapi UMUR pelanggaran tertua. "3
 *     pengguna, tertua 6 menit" adalah lonjakan trafik yang akan selesai
 *     sendiri; "7 pengguna, tertua 10 hari" adalah jalur yang mati. Angka
 *     telanjang tidak bisa membedakan keduanya — dan justru pembedaan itu yang
 *     tidak kita punya selama sepuluh hari.
 *
 *   · Numpang cron yang sudah ada (`/api/relayer/tick`, tiap menit) dan tabel
 *     yang sudah ada (`relayer_state`, berkunci `id` bertipe text). Nol cron
 *     baru, nol tabel baru, nol migrasi. Alarm yang menuntut infrastruktur
 *     baru adalah alarm yang penundaannya selalu punya alasan bagus.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Umur minimum sebelum sebuah akun tanpa dompet dianggap cacat.
 *
 * Pembuatan dompet Privy hitungan detik, dan kini terjadi di dalam
 * `POST /api/auth/session` sebelum cookie sesi dikirim. 15 menit membuang
 * seluruh balapan yang sah dengan margin besar — apa pun yang lolos ambang ini
 * bukan keterlambatan, melainkan sesuatu yang tidak akan datang sendiri.
 */
const AMBANG_UMUR_MENIT = 15;

/** Sekali per jam sudah 12× lebih cepat dari sepuluh hari; 1.440× per hari tidak. */
const JEDA_PERIKSA_MS = 60 * 60 * 1000;

const KUNCI_STATE = "audit_dompet";

export interface HasilAuditDompet {
  /** Jumlah akun melanggar invarian. `0` = sehat. */
  tertinggal: number;
  /** Umur pelanggaran TERTUA dalam jam; `null` bila tidak ada pelanggaran. */
  tertuaJam: number | null;
  /** `true` bila pemeriksaan dilewati karena belum jatuh tempo. */
  dilewati: boolean;
}

const DILEWATI: HasilAuditDompet = {
  tertinggal: 0,
  tertuaJam: null,
  dilewati: true,
};

/**
 * Periksa invarian, paling sering sekali per jam.
 *
 * TIDAK PERNAH melempar. Alarm yang bisa menjatuhkan pemanggilnya adalah alarm
 * yang akan dicabut orang pertama yang tick-nya gagal karenanya — dan sesudah
 * itu tidak ada lagi yang menjaga invariannya.
 */
export async function auditInvarianDompet(
  supa: SupabaseClient,
  paksa = false,
): Promise<HasilAuditDompet> {
  try {
    if (!paksa) {
      const { data: state } = await supa
        .from("relayer_state")
        .select("updated_at")
        .eq("id", KUNCI_STATE)
        .maybeSingle();
      const terakhir = state?.updated_at
        ? new Date(state.updated_at as string).getTime()
        : 0;
      if (Number.isFinite(terakhir) && Date.now() - terakhir < JEDA_PERIKSA_MS) {
        return DILEWATI;
      }
    }

    const ambang = new Date(
      Date.now() - AMBANG_UMUR_MENIT * 60 * 1000,
    ).toISOString();

    // Satu round-trip menjawab keduanya: `count` memberi jumlahnya, dan baris
    // pertama pada urutan menaik memberi yang tertua. Meminta jumlah lalu
    // meminta daftarnya adalah dua kueri untuk satu pertanyaan.
    const { data, count, error } = await supa
      .from("users")
      .select("created_at, wallets!left(user_id)", { count: "exact" })
      .is("wallets", null)
      .lt("created_at", ambang)
      // `SUPABASE_DB_URL` menunjuk instance yang SAMA dengan produksi, dan
      // `pnpm test:api` membuat user ber-DID `did:privy:__test__…` yang memang
      // tidak akan pernah punya dompet Privy. Tanpa pengecualian ini, satu run
      // uji yang mati di tengah jalan meninggalkan baris yang membunyikan
      // alarm ini — dan alarm yang pernah berbohong sekali akan diabaikan pada
      // kali berikutnya, justru ketika ia benar.
      .not("privy_did", "like", "did:privy:__test__%")
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      console.error("[audit-dompet] kueri invarian gagal:", error);
      return DILEWATI;
    }

    const tertinggal = count ?? 0;
    const tertuaIso = data?.[0]?.created_at as string | undefined;
    const tertuaJam = tertuaIso
      ? Math.round(
          ((Date.now() - new Date(tertuaIso).getTime()) / 3_600_000) * 10,
        ) / 10
      : null;

    // Ditulis SEBELUM alarm dibunyikan, dan ditulis juga saat sehat: baris ini
    // adalah bukti bahwa pemeriksaannya benar-benar berjalan. Alarm yang diam
    // karena sehat dan alarm yang diam karena mati terlihat persis sama dari
    // luar, dan `updated_at` di sinilah satu-satunya yang membedakan.
    await supa
      .from("relayer_state")
      .upsert(
        {
          id: KUNCI_STATE,
          cursor_block: tertinggal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (tertinggal > 0) {
      console.error(
        `[audit-dompet] INVARIAN §7.1 DILANGGAR: ${tertinggal} akun tanpa dompet lebih dari ${AMBANG_UMUR_MENIT} menit, tertua ${tertuaJam} jam. ` +
          `Umur tertua yang besar berarti jalur pembuatan dompet MATI, bukan sedang antre — periksa POST /api/auth/session dan buatDompetPrivy(). ` +
          `Pengguna ini tidak bisa mengklaim misi maupun menyegel laporan.`,
      );
    }

    return { tertinggal, tertuaJam, dilewati: false };
  } catch (err) {
    console.error("[audit-dompet] audit gagal:", err);
    return DILEWATI;
  }
}
