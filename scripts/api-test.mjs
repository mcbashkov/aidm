/**
 * Integration test API pencatatan (§7.2 / §9.2 / §11) — menembak endpoint
 * SUNGGUHAN di dev server, lalu memeriksa isi database lewat psql.
 *
 * Berbeda dari `test:parser` (murni fungsi, jalan di CI), test ini butuh:
 *   1. Postgres yang bisa dijangkau (`SUPABASE_DB_URL`)
 *   2. dev server hidup di http://localhost:3000
 *
 * Jalankan:
 *   pnpm dev                 # terminal 1
 *   pnpm test:api            # terminal 2
 *
 * CATATAN BIAYA: test ini menembak POST /api/catat ~10 kali, dan bila
 * `ANTHROPIC_API_KEY` terisi di `.env.local` maka parser LLM (Haiku) BENAR-
 * BENAR dipanggil — ada biaya kecil. Menghapus variabelnya dari environment
 * shell TIDAK cukup: Next.js memuat `.env.local` sendiri dari disk. Untuk
 * menjalankan tanpa biaya, komentari `ANTHROPIC_API_KEY` di `.env.local`
 * sebelum `pnpm dev` — assertion di bawah sengaja tidak mengunci `parsed_by`
 * ke satu nilai supaya lulus di kedua jalur.
 *
 * Untuk membuktikan fallback aktif saat LLM gagal (AC §7.2), set sementara
 * `AIDM_LIGHT_MODEL=model-tidak-ada` lalu jalankan ulang: `parsed_by` harus
 * berubah jadi `fallback`.
 *
 * User uji dibuat dengan privy_did berawalan `did:privy:__test__` dan DIHAPUS
 * di akhir — termasuk saat ada assertion yang gagal.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import crypto from "node:crypto";

/* ── Env ─────────────────────────────────────────────────────────────────── */

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    }),
);

const DB_URL = env.SUPABASE_DB_URL;
const SECRET = env.SESSION_SECRET || env.PRIVY_APP_SECRET;
const BASE = process.env.BASE_URL || "http://localhost:3000";

/**
 * Koneksi TIDAK di-keep-alive.
 *
 * `next start` menutup koneksi menganggur setelah 5 detik, sedangkan harness
 * ini memanggil `psql` di antara request. Di mesin yang sedang penuh, spawn
 * `psql` melewati batas itu dan fetch berikutnya mati `SocketError: other side
 * closed` — di titik yang berpindah-pindah tiap jalan, sementara servernya
 * sendiri tidak pernah mati dan log-nya bersih. Request yang "gagal" berhasil
 * 200 saat dijalankan sendiri.
 *
 * Menutup koneksi tiap request menghapus seluruh kelas kegagalan itu: tidak
 * ada koneksi menganggur untuk diputus. Ongkosnya satu handshake TCP per
 * request ke localhost — tidak berarti bagi uji yang jalan sekali.
 *
 * Perbaikannya memang di harness, bukan di aplikasi: pengguna sungguhan tidak
 * pernah menjeda 5 detik di tengah sesi lalu berharap soket yang sama hidup.
 */
const fetchAsli = globalThis.fetch;
globalThis.fetch = (input, init = {}) =>
  fetchAsli(input, {
    ...init,
    headers: { connection: "close", ...(init.headers ?? {}) },
  });
const PREFIX = "did:privy:__test__";

// Alamat & nonce uji swap. Dibuat mencolok supaya mustahil tertukar dengan
// data nyata, dan supaya pembersihannya bisa menyasar tepat baris ini —
// `swap_vouchers.user_id` sengaja `on delete set null` (voucher hidup lebih
// lama daripada akun), jadi menghapus user uji TIDAK ikut membawa vouchernya.
const SWAP_ADDR_A = "0x00000000000000000000000000000000000a1d11";
const SWAP_ADDR_B = "0x00000000000000000000000000000000000b2d22";
const SWAP_NONCE_B = "999000000000000001";

if (!DB_URL) throw new Error("SUPABASE_DB_URL belum diisi di .env.local");
if (!SECRET) throw new Error("SESSION_SECRET belum diisi di .env.local");

/* ── Util ────────────────────────────────────────────────────────────────── */

function sql(query) {
  return execFileSync(
    "psql",
    [DB_URL, "-v", "ON_ERROR_STOP=1", "-tAq", "--no-psqlrc", "-c", query],
    { encoding: "utf8" },
  ).trim();
}

/** Cookie sesi ber-HMAC — format sama persis dgn lib/auth/session-cookie.ts */
function sessionCookie(uid, did) {
  const body = Buffer.from(JSON.stringify({ uid, did, iat: Date.now() })).toString(
    "base64url",
  );
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `aidm_session=${body}.${sig}`;
}

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* respons tanpa body */
  }
  return { status: res.status, body: json };
}

/** Ekstrak teks PDF via pdftotext; null bila alatnya tidak terpasang. */
function pdfText(buf) {
  try {
    const tmp = `/tmp/aidm-pdf-uji-${process.pid}-${Math.random().toString(36).slice(2)}.pdf`;
    writeFileSync(tmp, buf);
    const teks = execFileSync("pdftotext", [tmp, "-"], { encoding: "utf8" });
    unlinkSync(tmp);
    return teks;
  } catch {
    return null;
  }
}

let lulus = 0;
const gagal = [];
function cek(nama, kondisi, detail = "") {
  if (kondisi) {
    lulus++;
    console.log(`  ✓ ${nama}`);
  } else {
    gagal.push(`${nama}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${nama}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ── Test ────────────────────────────────────────────────────────────────── */

async function main() {
  // Pastikan server hidup sebelum apa pun dibuat di DB.
  try {
    await fetch(`${BASE}/api/me`);
  } catch {
    throw new Error(`Dev server tidak menjawab di ${BASE}. Jalankan \`pnpm dev\` dulu.`);
  }

  sql(`delete from users where privy_did like '${PREFIX}%'`);
  const uidA = sql(
    `insert into users (privy_did) values ('${PREFIX}A') returning id`,
  );
  const uidB = sql(
    `insert into users (privy_did) values ('${PREFIX}B') returning id`,
  );
  const A = sessionCookie(uidA, `${PREFIX}A`);
  const B = sessionCookie(uidB, `${PREFIX}B`);

  console.log("\n── 1. Auth & isolasi ──");
  {
    const r = await api("/api/catat", { method: "POST", body: { text: "jual 45rb" } });
    cek("tanpa cookie → 401", r.status === 401, `dapat ${r.status}`);
  }
  {
    const r = await api("/api/transaksi", { cookie: sessionCookie(uidA, "x") + "tamper" });
    cek("cookie dirusak → 401", r.status === 401, `dapat ${r.status}`);
  }

  console.log("\n── 2. POST /api/catat (§7.2) ──");
  let txMasuk;
  {
    const r = await api("/api/catat", {
      method: "POST",
      cookie: A,
      body: { text: "jual 3 nasi goreng 45rb bayar QRIS", source: "chat" },
    });
    cek("200 OK", r.status === 200, `dapat ${r.status}`);
    const e = r.body?.entries?.[0];
    txMasuk = e;
    cek("1 entri", r.body?.entries?.length === 1, `dapat ${r.body?.entries?.length}`);
    cek("nominal 45000 (bukan 3)", e?.amount === 45000, `dapat ${e?.amount}`);
    cek("jenis masuk", e?.jenis === "masuk", `dapat ${e?.jenis}`);
    cek("metode qris", e?.paymentMethod === "qris", `dapat ${e?.paymentMethod}`);
    cek("status confirmed", e?.status === "confirmed", `dapat ${e?.status}`);
    cek("parsed_by ditandai", ["llm", "fallback"].includes(r.body?.parsed_by), r.body?.parsed_by);
  }
  {
    const r = await api("/api/catat", {
      method: "POST",
      cookie: A,
      body: { text: "narik dapet 180rb, bensin 25rb" },
    });
    cek("multi-entri → 2 entri (§7.2 #1)", r.body?.entries?.length === 2,
      `dapat ${r.body?.entries?.length}`);
  }
  {
    const r = await api("/api/catat", { method: "POST", cookie: A, body: { text: "" } });
    cek("teks kosong → 400", r.status === 400, `dapat ${r.status}`);
  }

  console.log("\n── 3. Draft & konfirmasi (§7.2 alur #6) ──");
  let draftId;
  {
    const r = await api("/api/catat", {
      method: "POST", cookie: A, body: { text: "beli beras" },
    });
    const e = r.body?.entries?.[0];
    draftId = e?.id;
    cek("tanpa nominal → status draft", e?.status === "draft", `dapat ${e?.status}`);
    cek("nominal TIDAK dikarang", e?.amount === 0 || e?.amount === null, `dapat ${e?.amount}`);
    cek("ada SATU pertanyaan", typeof r.body?.pertanyaan === "string", String(r.body?.pertanyaan));
    const nullDiDb = sql(`select amount is null from transactions where id='${draftId}'`);
    cek("amount NULL di DB (bukan 0)", nullDiDb === "t", `dapat ${nullDiDb}`);
  }
  {
    const r = await api("/api/catat/konfirmasi", {
      method: "POST", cookie: A, body: { draft_id: draftId, jawaban: "45rb" },
    });
    cek("konfirmasi → ok", r.body?.ok === true, JSON.stringify(r.body).slice(0, 80));
    cek("jadi confirmed 45000", r.body?.entry?.amount === 45000, `dapat ${r.body?.entry?.amount}`);
  }
  {
    const r = await api("/api/catat/konfirmasi", {
      method: "POST", cookie: B, body: { draft_id: draftId, jawaban: "99rb" },
    });
    cek("user lain tak bisa konfirmasi draft A → 404", r.status === 404, `dapat ${r.status}`);
  }

  console.log("\n── 4. Kredit AI tidak tersentuh (§7.2 #5) ──");
  {
    const n = sql(`select count(*) from credit_ledger where user_id='${uidA}'`);
    cek("credit_ledger user A kosong", n === "0", `dapat ${n} baris`);
  }

  console.log("\n── 5. GET /api/transaksi (§11) ──");
  {
    const r = await api("/api/transaksi", { cookie: A });
    cek("hanya milik sendiri", (r.body?.items ?? []).length > 0);
    const semuaConfirmed = (r.body?.items ?? []).every((t) => t.status === "confirmed");
    cek("draft/deleted tidak bocor", semuaConfirmed);
    const rB = await api("/api/transaksi", { cookie: B });
    cek("user B tidak melihat data A", (rB.body?.items ?? []).length === 0,
      `dapat ${rB.body?.items?.length}`);
  }
  {
    const r = await api("/api/transaksi?jenis=keluar", { cookie: A });
    const semua = (r.body?.items ?? []).every((t) => t.jenis === "keluar");
    cek("filter jenis", semua && r.body.items.length > 0);
  }
  {
    const r = await api("/api/transaksi?page_size=1", { cookie: A });
    cek("paginasi page_size=1", r.body?.items?.length === 1, `dapat ${r.body?.items?.length}`);
    cek("total > 1", r.body?.total > 1, `dapat ${r.body?.total}`);
  }
  {
    // Percobaan injeksi sintaks filter PostgREST lewat q.
    const r = await api(`/api/transaksi?q=${encodeURIComponent("a,user_id.neq.00000000-0000-0000-0000-000000000000")}`, { cookie: B });
    cek("injeksi q tidak membocorkan data user lain",
      r.status === 200 && (r.body?.items ?? []).length === 0,
      `status ${r.status}, ${r.body?.items?.length} baris`);
  }

  console.log("\n── 6. PATCH /api/transaksi/:id ──");
  {
    const r = await api(`/api/transaksi/${txMasuk.id}`, {
      method: "PATCH", cookie: A, body: { amount: 50000 },
    });
    cek("edit nominal → 200", r.status === 200, `dapat ${r.status}`);
    cek("nominal terbarui", r.body?.entry?.amount === 50000, `dapat ${r.body?.entry?.amount}`);
  }
  {
    const r = await api(`/api/transaksi/${txMasuk.id}`, {
      method: "PATCH", cookie: B, body: { amount: 1 },
    });
    cek("user lain tak bisa edit → 404", r.status === 404, `dapat ${r.status}`);
  }
  {
    const r = await api(`/api/transaksi/${txMasuk.id}`, {
      method: "PATCH", cookie: A, body: { amount: -5 },
    });
    cek("nominal negatif ditolak → 400", r.status === 400, `dapat ${r.status}`);
  }
  {
    const r = await api(`/api/transaksi/${txMasuk.id}`, {
      method: "PATCH", cookie: A, body: { kategori: "kategori_ngawur" },
    });
    cek("kategori di luar taksonomi ditolak → 400", r.status === 400, `dapat ${r.status}`);
  }
  {
    const besok = new Date(Date.now() + 3 * 86400000).toISOString();
    const r = await api(`/api/transaksi/${txMasuk.id}`, {
      method: "PATCH", cookie: A, body: { occurred_at: besok },
    });
    cek("tanggal masa depan ditolak → 400 (§17.1)", r.status === 400, `dapat ${r.status}`);
  }
  {
    const r = await api(`/api/transaksi/${txMasuk.id}`, {
      method: "PATCH", cookie: A, body: { user_id: uidB, status: "deleted" },
    });
    const pemilik = sql(`select user_id from transactions where id='${txMasuk.id}'`);
    cek("field liar (user_id/status) diabaikan", pemilik === uidA, `pemilik jadi ${pemilik}`);
    void r;
  }

  console.log("\n── 7. DELETE soft (§11) ──");
  {
    // Draft baru khusus uji hapus — inilah bug yang diperbaiki 0013.
    const c = await api("/api/catat", {
      method: "POST", cookie: A, body: { text: "bayar sewa" },
    });
    const d = c.body?.entries?.[0];
    cek("draft baru dibuat", d?.status === "draft", `dapat ${d?.status}`);
    const r = await api(`/api/transaksi/${d.id}`, { method: "DELETE", cookie: A });
    cek("DRAFT tanpa nominal bisa dihapus (regresi 0013)", r.status === 200, `dapat ${r.status}`);
    const st = sql(`select status from transactions where id='${d.id}'`);
    cek("status jadi deleted (soft)", st === "deleted", `dapat ${st}`);
    const del = sql(`select deleted_at is not null from transactions where id='${d.id}'`);
    cek("deleted_at terisi", del === "t", `dapat ${del}`);
  }
  {
    const r = await api(`/api/transaksi/${txMasuk.id}`, { method: "DELETE", cookie: B });
    cek("user lain tak bisa hapus → 404", r.status === 404, `dapat ${r.status}`);
  }

  console.log("\n── 8. daily_rollups konsisten dgn transactions ──");
  {
    const beda = sql(`
      with nyata as (
        select (occurred_at at time zone 'Asia/Jakarta')::date d,
               sum(case when jenis='masuk' then amount else 0 end) masuk,
               sum(case when jenis='keluar' then amount else 0 end) keluar,
               count(*) n
        from transactions
        where user_id='${uidA}' and status='confirmed' and amount is not null
        group by 1
      )
      select coalesce(count(*),0) from nyata n
      full join (
        -- Difilter DI DALAM subquery, bukan di kondisi JOIN: pada FULL JOIN,
        -- filter di kondisi join hanya memutus pasangan — baris user LAIN
        -- tetap muncul sebagai baris kanan tak berpasangan dan terhitung
        -- "tidak cocok". Lolos bertahun-tahun selama DB kosong; pecah begitu
        -- ada user nyata pertama (uji lapangan 2026-08-14).
        select * from daily_rollups where user_id='${uidA}'
      ) r on r.tanggal=n.d
      where coalesce(n.masuk,0) <> coalesce(r.total_masuk,0)
         or coalesce(n.keluar,0) <> coalesce(r.total_keluar,0)
         or coalesce(n.n,0) <> coalesce(r.jml_transaksi,0)`);
    cek("rollup == hitung ulang dari transactions", beda === "0", `${beda} hari tidak cocok`);
  }

  console.log("\n── 9. Kuota anti-abuse (§7.2) ──");
  {
    const sebelum = sql(
      `select coalesce(jml_request,0) from catat_kuota where user_id='${uidA}'`) || "0";
    await api("/api/catat", { method: "POST", cookie: A, body: { text: "halo apa kabar" } });
    const sesudah = sql(
      `select coalesce(jml_request,0) from catat_kuota where user_id='${uidA}'`) || "0";
    cek("kalimat non-transaksi tetap menaikkan kuota request",
      Number(sesudah) > Number(sebelum), `${sebelum} → ${sesudah}`);
    const baris = sql(
      `select count(*) from transactions where user_id='${uidA}' and raw_input='halo apa kabar'`);
    cek("kalimat non-transaksi tidak membuat entri", baris === "0", `dapat ${baris}`);
  }

  console.log("\n── 10. GET /api/laporan (§7.3) ──");
  // Data uji ditanam langsung lewat SQL, bukan lewat /api/catat: laporan diuji
  // atas angka yang SUDAH pasti, dan jalur ini juga membuktikan trigger rollup
  // ikut jalan pada penulisan di luar API.
  const wibHariIni = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const bulanIni = wibHariIni.slice(0, 7);
  const hariA = `${bulanIni}-01`;
  const hariB = wibHariIni; // sama dengan hariA bila hari ini tanggal 1
  const hariUnik = new Set([hariA, hariB]).size;
  {
    const kat = (slug) => `(select id from categories where slug='${slug}')`;
    sql(`insert into transactions
      (user_id, jenis, amount, kategori_id, payment_method, occurred_at, source, parsed_by, status)
      values
      ('${uidB}','masuk',100000,${kat("penjualan")},'tunai','${hariA}T10:00:00+07:00','manual','manual','confirmed'),
      ('${uidB}','masuk',200000,${kat("penjualan")},'qris','${hariA}T11:00:00+07:00','manual','manual','confirmed'),
      ('${uidB}','masuk',150000,${kat("jasa")},'transfer','${hariB}T12:00:00+07:00','manual','manual','confirmed'),
      ('${uidB}','keluar',50000,${kat("bahan_baku")},'tunai','${hariB}T13:00:00+07:00','manual','manual','confirmed')`);

    const r = await api(`/api/laporan?period=${bulanIni}`, { cookie: B });
    const k = r.body?.kini;
    cek("200 OK", r.status === 200, `dapat ${r.status}`);
    cek("total masuk 450.000", k?.masuk === 450000, `dapat ${k?.masuk}`);
    cek("total keluar 50.000", k?.keluar === 50000, `dapat ${k?.keluar}`);
    cek("sisa (laba kotor) 400.000", k?.sisa === 400000, `dapat ${k?.sisa}`);
    cek("4 transaksi", k?.jmlTransaksi === 4, `dapat ${k?.jmlTransaksi}`);
    cek(`hari aktif ${hariUnik}`, k?.hariAktif === hariUnik, `dapat ${k?.hariAktif}`);
    cek("masuk terverifikasi 350.000 (qris+transfer, bukan tunai)",
      k?.masukTerverifikasi === 350000, `dapat ${k?.masukTerverifikasi}`);
    cek("rasio terverifikasi ≈ 0,778",
      Math.abs((k?.rasioTerverifikasi ?? 0) - 350000 / 450000) < 1e-9,
      `dapat ${k?.rasioTerverifikasi}`);
    cek(`series ${hariUnik} titik`, r.body?.series?.length === hariUnik,
      `dapat ${r.body?.series?.length}`);

    // AC §7.3: kategori HARUS berjumlah sama dengan ringkasan — inilah alasan
    // batas periode rollup & transaksi dihitung dari satu sumber yang sama.
    const totalKatMasuk = (r.body?.masuk ?? []).reduce((s, b) => s + b.total, 0);
    const totalKatKeluar = (r.body?.keluar ?? []).reduce((s, b) => s + b.total, 0);
    cek("Σ kategori masuk == ringkasan masuk", totalKatMasuk === k?.masuk,
      `${totalKatMasuk} vs ${k?.masuk}`);
    cek("Σ kategori keluar == ringkasan keluar", totalKatKeluar === k?.keluar,
      `${totalKatKeluar} vs ${k?.keluar}`);
    const teratas = r.body?.masuk?.[0];
    cek("kategori teratas = Penjualan 300.000",
      teratas?.slug === "penjualan" && teratas?.total === 300000,
      `dapat ${teratas?.slug} ${teratas?.total}`);
    cek("persen kategori dinormalkan ke 1",
      Math.abs((r.body?.keluar?.[0]?.persen ?? 0) - 1) < 1e-9,
      `dapat ${r.body?.keluar?.[0]?.persen}`);

    cek("bulan berjalan belum boleh disegel (§7.5)", r.body?.bolehSegel === false,
      `dapat ${r.body?.bolehSegel}`);
    cek("segel berstatus belum", r.body?.segel?.status === "belum",
      `dapat ${r.body?.segel?.status}`);
    cek("bulan tercatat = 1", r.body?.bulanTercatat === 1,
      `dapat ${r.body?.bulanTercatat}`);
  }
  {
    const r = await api(`/api/laporan?period=${bulanIni}`, { cookie: A });
    cek("laporan user A tidak memuat angka user B",
      r.body?.kini?.masuk !== 450000, `dapat ${r.body?.kini?.masuk}`);
  }
  {
    const r = await api("/api/laporan?period=semau-gue", { cookie: B });
    cek("periode ngawur → 400 (bukan diam-diam 'semua')", r.status === 400,
      `dapat ${r.status}`);
  }
  {
    const r = await api("/api/laporan?period=30d", { cookie: B });
    cek("periode 30d valid", r.status === 200, `dapat ${r.status}`);
    cek("30d memuat transaksi hari ini", r.body?.kini?.jmlTransaksi >= 2,
      `dapat ${r.body?.kini?.jmlTransaksi}`);
  }
  {
    const r = await api("/api/laporan");
    cek("tanpa sesi → 401", r.status === 401, `dapat ${r.status}`);
  }
  {
    const n = sql(`select count(*) from credit_ledger where user_id='${uidB}'`);
    cek("membuka Laporan tidak memotong kredit (AC §7.3)", n === "0", `dapat ${n}`);
  }

  console.log("\n── 11. GET /api/laporan/pdf (§7.3) ──");
  {
    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/laporan/pdf?period=${bulanIni}`, {
      headers: { cookie: B },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const detik = (Date.now() - t0) / 1000;
    cek("200 OK", res.status === 200, `dapat ${res.status}`);
    cek("Content-Type application/pdf",
      res.headers.get("content-type")?.includes("application/pdf"),
      String(res.headers.get("content-type")));
    cek("berkas PDF sungguhan (magic %PDF)",
      buf.subarray(0, 4).toString() === "%PDF", buf.subarray(0, 8).toString());
    cek("ukuran wajar (> 2 KB)", buf.length > 2048, `${buf.length} byte`);
    cek("dilampirkan sebagai unduhan",
      (res.headers.get("content-disposition") ?? "").includes("attachment"),
      String(res.headers.get("content-disposition")));
    cek("tidak di-cache proxy",
      (res.headers.get("cache-control") ?? "").includes("no-store"),
      String(res.headers.get("cache-control")));
    cek("ter-generate ≤ 10 detik (AC §7.3)", detik <= 10, `${detik.toFixed(1)} dtk`);

    // Isi PDF dibaca sungguhan, bukan cuma header-nya. Kalimat baku §7.3/§7.5
    // adalah pernyataan hukum di dokumen yang dibawa ke bank — pernah hilang
    // diam-diam karena pembungkus `<View fixed>` tidak ter-render react-pdf,
    // dan cek "status 200 + magic %PDF" sama sekali tidak menangkapnya.
    let teks = null;
    try {
      const tmp = `/tmp/aidm-laporan-uji-${process.pid}.pdf`;
      writeFileSync(tmp, buf);
      teks = execFileSync("pdftotext", [tmp, "-"], { encoding: "utf8" });
      unlinkSync(tmp);
    } catch {
      console.log("  · pdftotext tidak tersedia — cek isi PDF dilewati");
    }
    if (teks !== null) {
      cek("kop memuat periode & tanggal cetak",
        teks.includes("Laporan Keuangan Usaha") && teks.includes("Dicetak"));
      cek("memuat ringkasan laba KOTOR (bukan 'laba bersih')",
        teks.includes("Sisa (laba kotor)") && !teks.includes("laba bersih"));
      cek("memuat tabel arus kas per bulan", teks.includes("Arus kas per bulan"));
      cek("memuat rincian kategori masuk & keluar",
        teks.includes("Rincian pemasukan per kategori") &&
          teks.includes("Rincian pengeluaran per kategori"));
      cek("memuat porsi terverifikasi", teks.includes("Porsi pemasukan terverifikasi"));
      cek("kalimat baku verifikasi ada persis (§7.5)",
        teks.includes(
          "Verifikasi ini bukan audit dan bukan penilaian kelayakan kredit.",
        ));
      cek("footer wajib ada persis (§7.3)",
        teks.includes(
          "Laporan ini disusun mandiri oleh pemilik usaha melalui aplikasi AIDM.",
        ));
      cek("angka rupiah format Indonesia (titik ribuan)", /Rp[\d.]*\d\.\d{3}/.test(teks));
    }
  }
  {
    const res = await fetch(`${BASE}/api/laporan/pdf?period=${bulanIni}`);
    cek("PDF tanpa sesi → 401", res.status === 401, `dapat ${res.status}`);
  }
  {
    // Periode tanpa satu pun catatan → PDF sopan yang jujur, bukan error.
    const res = await fetch(`${BASE}/api/laporan/pdf?period=2025-01`, {
      headers: { cookie: B },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    cek("PDF periode kosong → 200", res.status === 200, `dapat ${res.status}`);
    const teks = pdfText(buf);
    if (teks !== null) {
      cek("PDF kosong menerangkan 'Tidak ada data di periode ini.'",
        teks.includes("Tidak ada data di periode ini."));
      cek("PDF kosong tetap memuat footer wajib",
        teks.includes("Laporan ini disusun mandiri oleh pemilik usaha melalui aplikasi AIDM."));
    }
  }

  console.log("\n── 13. Segel on-chain (§7.5) — jalur tanpa konfigurasi chain ──");
  {
    const r = await api("/api/laporan/segel", {
      method: "POST", body: { period: "2026-07" },
    });
    cek("tanpa sesi → 401", r.status === 401, `dapat ${r.status}`);
  }
  {
    const r = await api("/api/laporan/segel", {
      method: "POST", cookie: B, body: { period: bulanIni },
    });
    cek("bulan berjalan → 400 (§7.5)", r.status === 400, `dapat ${r.status}`);
  }
  {
    const r = await api("/api/laporan/segel", {
      method: "POST", cookie: B, body: { period: "gado-gado" },
    });
    cek("periode ngawur → 400", r.status === 400, `dapat ${r.status}`);
  }
  {
    // Env uji tidak punya kontrak/relayer → 501 JUJUR, dan yang terpenting:
    // TANPA baris pending yatim di report_seals (config dicek sebelum tulis).
    const r = await api("/api/laporan/segel", {
      method: "POST", cookie: B, body: { period: "2026-07" },
    });
    if (r.status === 501) {
      cek("tanpa konfigurasi chain → 501 jujur", true);
    } else {
      // Kontrak segel TERPASANG. User uji sengaja tidak diberi wallet: jalur
      // on-chain penuh akan mengirim transaksi testnet SUNGGUHAN (dan membakar
      // gas) tiap kali test dijalankan — mahal untuk suite yang sering jalan.
      // Jalur sukses penuh diverifikasi manual di produksi; yang dijaga di
      // sini adalah penolakan yang jelas untuk akun tanpa wallet.
      cek("akun tanpa wallet ditolak jelas → 400",
        r.status === 400 && /wallet/i.test(r.body?.error ?? ""),
        `dapat ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
    }
    const n = sql(`select count(*) from report_seals where user_id='${uidB}'`);
    cek("penolakan tidak meninggalkan baris pending yatim", n === "0", `dapat ${n}`);
  }
  {
    const r = await api(`/api/laporan/segel/${bulanIni}`, { cookie: B });
    cek("GET status segel → belum", r.body?.segel?.status === "belum",
      `dapat ${r.body?.segel?.status}`);
  }
  {
    const res = await fetch(`${BASE}/api/verify/${uidB}/2026-07`);
    cek("verify publik tanpa segel → 404", res.status === 404, `dapat ${res.status}`);
  }
  {
    const res = await fetch(`${BASE}/api/verify/bukan-uuid/2026-07`);
    cek("verify format ngawur → 400", res.status === 400, `dapat ${res.status}`);
  }
  {
    const n = sql(`select count(*) from missions where code='seal_monthly_report' and aktif`);
    cek("misi 'seal_monthly_report' terpasang & aktif (0016)", n === "1", `dapat ${n}`);
  }

  console.log("\n── 14. Misi & reward (§7.6) ──");
  {
    const r = await api("/api/missions");
    cek("tanpa sesi → 401", r.status === 401, `dapat ${r.status}`);
  }
  {
    // User B menanam 4 transaksi valid hari ini di seksi 10 (2 di hari ini),
    // ditambah entri seksi ini supaya lintas ambang misi terlihat.
    const r = await api("/api/missions", { cookie: B });
    cek("200 OK", r.status === 200, `dapat ${r.status}`);
    const kode = (r.body?.misi ?? []).map((m) => m.code);
    cek("misi riset v2.0 tidak muncul (dinonaktifkan 0016)",
      !kode.includes("first_research_today"), kode.join(","));
    cek("5 misi v3.0 tampil", kode.length === 5, `dapat ${kode.length}`);

    const pertama = (r.body?.misi ?? []).find((m) => m.code === "first_tx_today");
    cek("misi 'transaksi pertama' selesai (ada catatan hari ini)",
      pertama?.selesai === true, JSON.stringify(pertama?.progress));
    cek("periodKey harian = tanggal WIB",
      pertama?.periodKey === wibHariIni, `dapat ${pertama?.periodKey}`);

    const lima = (r.body?.misi ?? []).find((m) => m.code === "five_tx_today");
    cek("progres 'catat 5' dibatasi target, bukan angka mentah",
      lima.progress <= lima.target, `${lima?.progress}/${lima?.target}`);

    const profil = (r.body?.misi ?? []).find((m) => m.code === "complete_profile");
    cek("profil belum lengkap → misi belum selesai",
      profil?.selesai === false, `dapat ${profil?.selesai}`);

    cek("cap harian dilaporkan (§7.6)",
      r.body?.capHarian?.batas === 250, `dapat ${r.body?.capHarian?.batas}`);
    // 450 = segel bulanan (150) + runtun 30 hari (300); WAJIB sama dengan
    // caps[1] di MissionRewards, kalau tidak server menolak klaim yang sah
    // on-chain (PERINTAH-AGEN-FINAL §0).
    cek("cap bulanan terpisah dari cap harian",
      r.body?.capBulanan?.batas === 450, `dapat ${r.body?.capBulanan?.batas}`);
  }
  {
    // AC §7.6: menghapus transaksi mengurangi progres misi terkait.
    const rSebelum = await api("/api/missions", { cookie: B });
    const sebelum = (rSebelum.body?.misi ?? [])
      .find((m) => m.code === "five_tx_today").progress;
    const idHapus = sql(
      `select id from transactions where user_id='${uidB}' and status='confirmed'
       order by created_at desc limit 1`);
    await api(`/api/transaksi/${idHapus}`, { method: "DELETE", cookie: B });
    const rSesudah = await api("/api/missions", { cookie: B });
    const sesudah = (rSesudah.body?.misi ?? [])
      .find((m) => m.code === "five_tx_today").progress;
    cek("hapus transaksi MENURUNKAN progres misi (AC §7.6)",
      sesudah === sebelum - 1, `${sebelum} → ${sesudah}`);
  }
  {
    // Anti-abuse §7.6: duplikat persis dalam 60 detik tidak dihitung.
    const kat = `(select id from categories where slug='penjualan')`;
    const rAwal = await api("/api/missions", { cookie: B });
    const awal = (rAwal.body?.misi ?? [])
      .find((m) => m.code === "five_tx_today").progress;
    // Dua baris identik, created_at hanya berjarak 10 detik.
    sql(`insert into transactions
      (user_id, jenis, amount, kategori_id, payment_method, occurred_at, source, parsed_by, status, created_at)
      values
      ('${uidB}','masuk',77000,${kat},'tunai','${wibHariIni}T15:00:00+07:00','manual','manual','confirmed', now()),
      ('${uidB}','masuk',77000,${kat},'tunai','${wibHariIni}T15:00:00+07:00','manual','manual','confirmed', now() + interval '10 seconds')`);
    const rAkhir = await api("/api/missions", { cookie: B });
    const akhir = (rAkhir.body?.misi ?? [])
      .find((m) => m.code === "five_tx_today").progress;
    cek("duplikat persis dalam 60 dtk hanya dihitung SEKALI (§7.6 anti-abuse)",
      akhir === awal + 1, `${awal} → ${akhir} (2 baris ditanam)`);
  }
  {
    const r = await api("/api/missions/klaim", {
      method: "POST", body: { code: "first_tx_today" },
    });
    cek("klaim tanpa sesi → 401", r.status === 401, `dapat ${r.status}`);
  }
  {
    const r = await api("/api/missions/klaim", {
      method: "POST", cookie: B, body: { code: "misi_ngawur" },
    });
    cek("klaim misi ngawur → 400/501", [400, 501].includes(r.status),
      `dapat ${r.status}`);
  }
  {
    // Tanpa kontrak reward: 501 jujur, dan TIDAK ada baris klaim yatim.
    const r = await api("/api/missions/klaim", {
      method: "POST", cookie: B, body: { code: "first_tx_today" },
    });
    if (r.status === 501) {
      cek("tanpa kontrak reward → 501 jujur", true);
    } else {
      // Sama seperti segel: klaim sungguhan mengirim transaksi testnet dan
      // memindahkan IDMX nyata. Yang diuji rutin adalah penolakan jujurnya.
      cek("akun tanpa wallet ditolak jelas → 400",
        r.status === 400 && /wallet/i.test(r.body?.error ?? ""),
        `dapat ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
    }
    const n = sql(`select count(*) from mission_claims where user_id='${uidB}'`);
    cek("penolakan tidak meninggalkan baris klaim yatim", n === "0", `dapat ${n}`);
  }

  console.log("\n── 15. Swap: voucher & relayer (§7.7) ──");
  {
    const r = await api("/api/swap/vouchers");
    cek("voucher tanpa sesi → 401", r.status === 401, `dapat ${r.status}`);
  }
  {
    // Endpoint relayer menjawab 404 (bukan 401) untuk pemanggil tak sah:
    // keberadaannya sengaja tidak dikonfirmasi kepada pemindai.
    const r = await api("/api/relayer/tick", { method: "POST" });
    cek("tick tanpa secret → 404", r.status === 404, `dapat ${r.status}`);

    const rSalah = await fetch(`${BASE}/api/relayer/tick`, {
      method: "POST",
      headers: { authorization: "Bearer salah-sekali" },
    });
    cek("tick dengan secret salah → 404", rSalah.status === 404,
      `dapat ${rSalah.status}`);

    // Panjang yang sama persis dengan secret asli — memastikan yang menolak
    // adalah perbandingan isinya, bukan sekadar beda panjang.
    const asli = env.CRON_SECRET ?? "";
    if (asli) {
      const rSamaPanjang = await fetch(`${BASE}/api/relayer/tick`, {
        method: "POST",
        headers: { authorization: `Bearer ${"x".repeat(asli.length)}` },
      });
      cek("tick, secret salah tapi sepanjang aslinya → 404",
        rSamaPanjang.status === 404, `dapat ${rSamaPanjang.status}`);
    }
  }
  {
    // Isolasi voucher — properti keamanan inti endpoint ini. Tanda tangan di
    // dalam voucher bernilai uang; bocor ke akun lain berarti orang lain bisa
    // menebusnya lebih dulu di waktu yang tidak dikehendaki pemiliknya.
    sql(`insert into wallets (user_id, address) values
      ('${uidA}','${SWAP_ADDR_A}'), ('${uidB}','${SWAP_ADDR_B}')
      on conflict (user_id) do update set address = excluded.address`);
    sql(`insert into swap_vouchers
      (nonce, user_address, user_id, idmx_burned, burn_tx_hash, burn_block, deadline, signature)
      values (${SWAP_NONCE_B}, '${SWAP_ADDR_B}', '${uidB}', 500000000000000000000,
        '0x${"b".repeat(64)}', 1, now() + interval '30 days', '0x${"c".repeat(130)}')`);

    const rA = await api("/api/swap/vouchers", { cookie: A });
    const rB = await api("/api/swap/vouchers", { cookie: B });

    if (rA.status === 501) {
      cek("tanpa kontrak swap → 501 jujur", rB.status === 501);
    } else {
      const punyaA = (rA.body?.vouchers ?? []).some(
        (v) => v.nonce === String(SWAP_NONCE_B),
      );
      cek("voucher akun lain TIDAK bocor ke A", rA.status === 200 && !punyaA,
        `status ${rA.status}, ${(rA.body?.vouchers ?? []).length} voucher`);

      const milikB = (rB.body?.vouchers ?? []).find(
        (v) => v.nonce === String(SWAP_NONCE_B),
      );
      cek("B melihat vouchernya sendiri", rB.status === 200 && !!milikB,
        `status ${rB.status}`);
      // Wei WAJIB dikirim apa adanya: memanggil kontrak dengan angka desimal
      // hasil pembulatan membuat tanda tangan tidak lagi cocok.
      cek("voucher membawa idmxBurned dalam wei (bukan desimal)",
        milikB?.idmxBurned === "500000000000000000000",
        `dapat ${milikB?.idmxBurned}`);
      cek("voucher membawa tanda tangan & status",
        typeof milikB?.signature === "string" && milikB?.status === "signed");
    }
  }

  console.log("\n── 12. DELETE /api/akun (§12 hak penghapusan) ──");
  {
    const uidC = sql(
      `insert into users (privy_did) values ('${PREFIX}C') returning id`,
    );
    const C = sessionCookie(uidC, `${PREFIX}C`);
    sql(`insert into transactions (user_id, jenis, amount, payment_method, occurred_at, source, parsed_by, status)
      values ('${uidC}','masuk',90000,'tunai','${wibHariIni}T09:00:00+07:00','manual','manual','confirmed')`);
    const punyaRollup = sql(
      `select count(*) from daily_rollups where user_id='${uidC}'`);
    cek("user C punya rollup sebelum dihapus", punyaRollup === "1", `dapat ${punyaRollup}`);

    const salah = await api("/api/akun", {
      method: "DELETE", cookie: C, body: { konfirmasi: "iya" },
    });
    cek("konfirmasi salah → 400", salah.status === 400, `dapat ${salah.status}`);
    const masihAda = sql(`select count(*) from users where id='${uidC}'`);
    cek("akun belum terhapus setelah konfirmasi salah", masihAda === "1", `dapat ${masihAda}`);

    const benar = await api("/api/akun", {
      method: "DELETE", cookie: C, body: { konfirmasi: "HAPUS" },
    });
    // Regresi 0014: dulu langkah ini SELALU 500 karena trigger rollup menulis
    // ulang baris untuk user yang sudah hilang (FK violation).
    cek("konfirmasi benar → 200 (regresi 0014)", benar.status === 200,
      `dapat ${benar.status} ${JSON.stringify(benar.body)}`);
    cek("baris users hilang",
      sql(`select count(*) from users where id='${uidC}'`) === "0");
    cek("transaksi ikut terhapus (cascade)",
      sql(`select count(*) from transactions where user_id='${uidC}'`) === "0");
    cek("rollup ikut terhapus (cascade)",
      sql(`select count(*) from daily_rollups where user_id='${uidC}'`) === "0");
  }
  {
    const r = await api("/api/akun", { method: "DELETE", body: { konfirmasi: "HAPUS" } });
    cek("tanpa sesi → 401", r.status === 401, `dapat ${r.status}`);
  }

  console.log(`\n━━ ${lulus} lulus, ${gagal.length} gagal ━━`);
  if (gagal.length) {
    console.log("\nGagal:");
    for (const g of gagal) console.log(`  ✗ ${g}`);
  }
}

try {
  await main();
} finally {
  // Voucher dibersihkan TERPISAH dan lebih dulu: `on delete set null` membuat
  // baris voucher selamat dari penghapusan user, jadi tanpa baris ini sampah
  // uji akan menumpuk di database yang sama dengan produksi.
  sql(`delete from swap_vouchers where user_address in ('${SWAP_ADDR_A}','${SWAP_ADDR_B}')`);
  sql(`delete from users where privy_did like '${PREFIX}%'`);
  console.log("(user uji dibersihkan)");
}
process.exit(gagal.length === 0 ? 0 : 1);
