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
import { createClient } from "@supabase/supabase-js";

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
// Pesanan Midtrans yang dibuat harness. `subscription_orders` sengaja
// BERTAHAN saat pengguna dihapus (0030: catatan pembayaran), jadi pesanan
// uji harus dihapus eksplisit di akhir — bukan ikut cascade.
const orderUji = [];

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

/** Galat TRANSPORT (soket ditutup sebelum menjawab, bukan status HTTP):
 *  diulang sekali setelah jeda. Yang diuji adalah aplikasinya, bukan soketnya —
 *  lihat catatan `connection: close` di atas untuk kelas kegagalan ini. */
function galatTransport(err) {
  const cause = err && typeof err === "object" ? err.cause : null;
  return (
    (err instanceof Error && err.message === "fetch failed") ||
    (cause && typeof cause === "object" && String(cause.code ?? "").startsWith("UND_ERR"))
  );
}

async function api(path, { method = "GET", body, cookie } = {}) {
  const kirim = () =>
    fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  // Galat TRANSPORT (soket ditutup, koneksi ditolak) diulang sampai lima
  // kali dengan jeda 3 detik: `next dev` me-restart dirinya sendiri saat heap
  // mendekati --max-old-space-size ("approaching the used memory threshold"),
  // dan jendela restart itu ~6 detik — yang diuji aplikasinya, bukan soketnya.
  let res;
  for (let percobaan = 0; ; percobaan++) {
    try {
      res = await kirim();
      break;
    } catch (err) {
      if (!galatTransport(err) || percobaan >= 5) throw err;
      console.log(`  (transport gagal saat ${method} ${path} — diulang ke-${percobaan + 1})`);
      await new Promise((r) => setTimeout(r, 3_000));
    }
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* respons tanpa body */
  }
  return { status: res.status, body: json };
}

/** Hapus PDF milik pengguna uji di bucket `berkas` lewat Storage API. */
async function hapusPdfUji() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const kunci = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !kunci) {
    console.log("  (bersih-bersih bucket dilewati: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tidak terbaca dari .env.local)");
    return;
  }
  const uids = sql(`select string_agg(id::text, ' ') from users where privy_did like '${PREFIX}%'`)
    .split(" ")
    .filter(Boolean);
  console.log(`  (bersih-bersih bucket: ${uids.length} pengguna uji diperiksa)`);
  if (uids.length === 0) return;
  // `fetchAsli`, bukan fetch global: pembungkus `connection: close` di atas
  // menyebar `init.headers` dengan spread, dan objek Headers milik storage-js
  // tidak enumerable — content-type hilang, Storage menjawab "body must be object".
  const storage = createClient(url, kunci, {
    auth: { persistSession: false },
    global: { fetch: fetchAsli },
  }).storage.from("berkas");
  for (const uid of uids) {
    const { data, error } = await storage.list(uid);
    if (error) throw error;
    const nama = (data ?? []).map((o) => `${uid}/${o.name}`);
    if (nama.length > 0) {
      const { error } = await storage.remove(nama);
      if (error) throw error;
      console.log(`  (dihapus dari bucket: ${nama.length} berkas uji)`);
    }
  }
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
    // Sejak pertanyaan menjadi BENTUK BERTIPE (lib/catat/pesan.ts) — bukan
    // string bebas dari model — yang dijaga adalah jenisnya, bukan kalimatnya.
    cek("ada SATU pertanyaan (bertipe: nominal)",
      r.body?.pertanyaan?.jenis === "nominal", JSON.stringify(r.body?.pertanyaan));
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

  console.log("\n── 4. Catat tidak menyentuh tabel uang mana pun (§7.2 #5) ──");
  {
    const n = sql(`select count(*) from credit_ledger where user_id='${uidA}'`);
    cek("credit_ledger (beku sejak 0027) tetap kosong", n === "0", `dapat ${n} baris`);
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
    cek("membuka Laporan tidak menyentuh tabel uang (AC §7.3)", n === "0", `dapat ${n}`);
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
      // lib/laporan/pdf.tsx melarang kata "laba" dalam bentuk apa pun: angkanya
      // arus kas (pemasukan dikurangi SELURUH pengeluaran), bukan laba kotor.
      cek("memuat 'Sisa uang' dan TIDAK memuat kata 'laba' (aturan pdf.tsx)",
        teks.includes("Sisa uang") && !/\blaba\b/i.test(teks));
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
      // Taksonomi galat P0-2: "dompet belum siap" adalah 409 dengan KODE, bukan
      // 400 dengan kalimat. Kode itulah yang dibaca UI untuk memilih pesannya —
      // mencocokkan teks berbahasa Indonesia di sini akan pecah setiap kali
      // kalimatnya diperhalus, padahal kontraknya tidak berubah.
      cek("akun tanpa wallet ditolak jelas → 409 WALLET_NOT_READY",
        r.status === 409 && r.body?.code === "WALLET_NOT_READY",
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
    // Dulu dipatok ke angka 5 dan langsung basi begitu 0023 menambah empat
    // misi. Yang benar-benar ingin dijaga bukan JUMLAHNYA melainkan
    // invariannya: endpoint menampilkan tepat misi yang aktif di database.
    const misiAktif = Number(sql("select count(*) from missions where aktif"));
    cek(`semua misi aktif tampil (${misiAktif})`,
      kode.length === misiAktif, `dapat ${kode.length}, aktif di DB ${misiAktif}`);

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
      // Taksonomi galat P0-2: "dompet belum siap" adalah 409 dengan KODE, bukan
      // 400 dengan kalimat. Kode itulah yang dibaca UI untuk memilih pesannya —
      // mencocokkan teks berbahasa Indonesia di sini akan pecah setiap kali
      // kalimatnya diperhalus, padahal kontraknya tidak berubah.
      cek("akun tanpa wallet ditolak jelas → 409 WALLET_NOT_READY",
        r.status === 409 && r.body?.code === "WALLET_NOT_READY",
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

  console.log("\n── 16. Kasbon (Batch 2, migrasi 0031/0032) ──");
  {
    const r = await api("/api/kasbon");
    cek("GET /api/kasbon tanpa sesi → 401", r.status === 401, `dapat ${r.status}`);
  }
  {
    const rollupSebelum = sql(
      `select coalesce(sum(total_masuk),0) from daily_rollups where user_id='${uidA}'`);
    const r = await api("/api/catat", {
      method: "POST", cookie: A, body: { text: "Bu Ani ngebon 3 nasi goreng 45rb" },
    });
    const e = r.body?.entries?.[0];
    cek("kalimat kasbon → 200, 1 entri", r.status === 200 && r.body?.entries?.length === 1,
      `dapat ${r.status} / ${r.body?.entries?.length}`);
    cek("entri ditandai kasbon piutang", e?.kasbon?.tipe === "piutang", JSON.stringify(e?.kasbon));
    // Nama dari LLM bisa "Bu Ani" atau "Ani" — yang dijaga: namanya tertangkap.
    cek("pihak tertangkap", /ani/i.test(e?.kasbon?.pihak ?? ""), `dapat ${e?.kasbon?.pihak}`);
    cek("nominal 45000 (bukan 3)", e?.amount === 45000, `dapat ${e?.amount}`);
    cek("tersimpan di tabel kasbon, status aktif",
      sql(`select status from kasbon where id='${e?.id}' and user_id='${uidA}'`) === "aktif");
    cek("TIDAK ada baris transactions dari kalimat kasbon",
      sql(`select count(*) from transactions where user_id='${uidA}'
           and raw_input='Bu Ani ngebon 3 nasi goreng 45rb'`) === "0");
    cek("rollup tidak berubah oleh kasbon aktif",
      sql(`select coalesce(sum(total_masuk),0) from daily_rollups where user_id='${uidA}'`)
        === rollupSebelum);

    const daftar = await api("/api/kasbon", { cookie: A });
    cek("GET /api/kasbon memuat kasbon aktif",
      daftar.body?.piutang?.some((k) => k.id === e?.id), JSON.stringify(daftar.body?.piutang));
    cek("total piutang dihitung server",
      daftar.body?.totalPiutang ===
        daftar.body?.piutang?.reduce((n, k) => n + k.amount, 0));
    const hidrasi = await api("/api/transaksi?untuk=catat", { cookie: A });
    cek("hidrasi Catat memuat kartu kasbon hari ini",
      hidrasi.body?.items?.some((it) => it.id === e?.id && it.kasbon?.tipe === "piutang"));

    const asing = await api(`/api/kasbon/${e?.id}`, {
      method: "PATCH", cookie: B, body: { aksi: "lunas", catat: true },
    });
    cek("user lain melunasi → 404 (bukan 403: keberadaannya pun tidak dibocorkan)",
      asing.status === 404, `dapat ${asing.status}`);
    const tanpaPilihan = await api(`/api/kasbon/${e?.id}`, {
      method: "PATCH", cookie: A, body: { aksi: "lunas" },
    });
    cek("tanpa pilihan catat → 400 (tidak ditebak)", tanpaPilihan.status === 400,
      `dapat ${tanpaPilihan.status}`);

    const misiSebelum = sql(
      `select coalesce(sum(jml),0) from misi_sinyal_harian('${uidA}')`);
    const lunas = await api(`/api/kasbon/${e?.id}`, {
      method: "PATCH", cookie: A, body: { aksi: "lunas", catat: true, metode: "qris" },
    });
    const txId = lunas.body?.transaction_id;
    cek("tandai lunas + catat → 200 dengan transaction_id",
      lunas.status === 200 && typeof txId === "string", JSON.stringify(lunas.body));
    cek("transaksi pelunasan: masuk 45000 qris confirmed",
      sql(`select jenis||' '||amount||' '||payment_method||' '||status
           from transactions where id='${txId}' and user_id='${uidA}'`)
        === "masuk 45000 qris confirmed");
    cek("kasbon tertutup & menunjuk transaksinya",
      sql(`select status||' '||(transaction_id='${txId}') from kasbon where id='${e?.id}'`)
        === "lunas true");
    cek("rollup naik tepat 45000 di hari pelunasan",
      Number(sql(`select coalesce(sum(total_masuk),0) from daily_rollups where user_id='${uidA}'`))
        - Number(rollupSebelum) === 45000);
    cek("misi TIDAK menghitung transaksi pelunasan (0032)",
      sql(`select coalesce(sum(jml),0) from misi_sinyal_harian('${uidA}')`) === misiSebelum,
      `${misiSebelum} → ${sql(`select coalesce(sum(jml),0) from misi_sinyal_harian('${uidA}')`)}`);
    const lagi = await api(`/api/kasbon/${e?.id}`, {
      method: "PATCH", cookie: A, body: { aksi: "lunas", catat: true },
    });
    cek("melunasi dua kali → 409", lagi.status === 409, `dapat ${lagi.status}`);
  }
  {
    // "Sudah kucatat": kasbon ditutup TANPA transaksi baru.
    const r = await api("/api/catat", {
      method: "POST", cookie: A, body: { text: "ambil barang dari Pak Haji 500rb belum dibayar" },
    });
    const e = r.body?.entries?.[0];
    cek("utang ke pemasok → kasbon utang", e?.kasbon?.tipe === "utang", JSON.stringify(e?.kasbon));
    const nTx = sql(`select count(*) from transactions where user_id='${uidA}'`);
    const tutup = await api(`/api/kasbon/${e?.id}`, {
      method: "PATCH", cookie: A, body: { aksi: "lunas", catat: false },
    });
    cek("sudah kucatat → 200, transaction_id null",
      tutup.status === 200 && tutup.body?.transaction_id === null, JSON.stringify(tutup.body));
    cek("sudah kucatat tidak membuat transaksi",
      sql(`select count(*) from transactions where user_id='${uidA}'`) === nTx);
  }
  {
    // Draft kasbon: tanpa nominal → satu pertanyaan, dilengkapi lewat konfirmasi.
    const r = await api("/api/catat", {
      method: "POST", cookie: A, body: { text: "Bu Ani ngebon nasi goreng" },
    });
    const e = r.body?.entries?.[0];
    cek("kasbon tanpa nominal → draft + pertanyaan",
      e?.status === "draft" && e?.kasbon && r.body?.pertanyaan, JSON.stringify(r.body));
    const k = await api("/api/catat/konfirmasi", {
      method: "POST", cookie: A, body: { draft_id: e?.id, jawaban: "15rb" },
    });
    cek("konfirmasi draft kasbon → aktif 15000",
      k.body?.ok === true && k.body?.entry?.amount === 15000 && k.body?.entry?.kasbon,
      JSON.stringify(k.body));
    cek("draft kasbon di DB menjadi aktif",
      sql(`select status||' '||amount from kasbon where id='${e?.id}'`) === "aktif 15000");

    const hapus = await api(`/api/kasbon/${e?.id}`, { method: "DELETE", cookie: A });
    cek("hapus kasbon salah tangkap → 200", hapus.status === 200, `dapat ${hapus.status}`);
    cek("soft delete: status dihapus + deleted_at",
      sql(`select status||' '||(deleted_at is not null) from kasbon where id='${e?.id}'`)
        === "dihapus true");
    const hapusLagi = await api(`/api/kasbon/${e?.id}`, { method: "DELETE", cookie: A });
    cek("hapus dua kali → 404", hapusLagi.status === 404, `dapat ${hapusLagi.status}`);
    const idAneh = await api("/api/kasbon/bukan-uuid", { method: "DELETE", cookie: A });
    cek("id bukan UUID → 404, bukan 500", idAneh.status === 404, `dapat ${idAneh.status}`);
  }
  {
    // Penjualan tunai biasa tidak boleh pernah menjadi kasbon (pagar LLM).
    const r = await api("/api/catat", {
      method: "POST", cookie: A, body: { text: "jual es teh 5rb" },
    });
    cek("penjualan tunai tetap transaksi biasa",
      r.body?.entries?.[0] && !r.body.entries[0].kasbon, JSON.stringify(r.body?.entries));
  }

  console.log("\n── 17. Kesiapan Catatan (Batch 4, §1.4, migrasi 0034) ──");
  {
    const r = await api("/api/kesiapan");
    cek("GET /api/kesiapan tanpa sesi → 401", r.status === 401, `dapat ${r.status}`);
  }
  // Satu pengguna per keadaan: hasilnya di-cache per hari di proses server,
  // dan rollup di sini ditanam langsung lewat SQL (bukan lewat rute tulis yang
  // mengosongkan cache), jadi pengguna yang sama tidak boleh dipakai ulang.
  const seedRollups = (uid, bulanMundur, hari) => sql(`
    insert into daily_rollups (user_id, tanggal, total_masuk, total_keluar, jml_transaksi, masuk_terverifikasi)
    select '${uid}', (date_trunc('month', (now() at time zone 'Asia/Jakarta')::date) - interval '${bulanMundur} months')::date + d, 50000, 20000, 2, 0
      from generate_series(0, ${hari - 1}) d
    on conflict (user_id, tanggal) do nothing`);
  {
    const uidD1 = sql(`insert into users (privy_did) values ('${PREFIX}D1') returning id`);
    const r = await api("/api/kesiapan", { cookie: sessionCookie(uidD1, `${PREFIX}D1`) });
    cek("akun kosong → 200, tingkat baru, 0 dari 6", r.status === 200 && r.body?.tingkat === "baru" && r.body?.bulanAktif6 === 0, JSON.stringify(r.body));
    cek("tanpa angka 0–100 di respons", r.body && !("skor" in r.body) && !("score" in r.body));
    cek("profil kosong → item profil belum terpenuhi", r.body?.checklist?.find((c) => c.kunci === "profil")?.terpenuhi === false);
    cek("berkas6/berkas12 belum boleh", r.body?.berkas6Boleh === false && r.body?.berkas12Boleh === false);
    cek("tonggakBaru null", r.body?.tonggakBaru === null);
  }
  {
    const uidD2 = sql(`insert into users (privy_did, earner_type) values ('${PREFIX}D2', 'ojol') returning id`);
    for (const m of [0, 1, 2]) seedRollups(uidD2, m, 8);
    const C = sessionCookie(uidD2, `${PREFIX}D2`);
    const r = await api("/api/kesiapan", { cookie: C });
    cek("seed 3 bulan × 8 hari → siap3, 3 dari 6, berkas6 boleh, berkas12 belum",
      r.body?.tingkat === "siap3" && r.body?.bulanAktif6 === 3 && r.body?.berkas6Boleh === true && r.body?.berkas12Boleh === false, JSON.stringify(r.body));
    cek("label per peran ojol → Riwayat Pendapatan", r.body?.labelBerkas === "Riwayat Pendapatan", r.body?.labelBerkas);
    cek("tonggakBaru siap3 (toast belum pernah tampil)", r.body?.tonggakBaru === "siap3", r.body?.tonggakBaru);
    const salah = await api("/api/kesiapan/tonggak", { method: "POST", cookie: C, body: { tingkat: "rutin" } });
    cek("tandai tingkat asing → 400", salah.status === 400, `dapat ${salah.status}`);
    const tandai = await api("/api/kesiapan/tonggak", { method: "POST", cookie: C, body: { tingkat: "siap3" } });
    cek("tandai siap3 → 200", tandai.status === 200 && tandai.body?.ok === true, JSON.stringify(tandai.body));
    const lagi = await api("/api/kesiapan", { cookie: C });
    cek("setelah ditandai: tonggakBaru null (cache dikosongkan oleh POST)", lagi.body?.tonggakBaru === null, lagi.body?.tonggakBaru);
    const dua = await api("/api/kesiapan/tonggak", { method: "POST", cookie: C, body: { tingkat: "siap3" } });
    cek("tandai dua kali → tetap 200 (idempoten)", dua.status === 200);
    cek("satu baris kesiapan_tonggak", sql(`select count(*) from kesiapan_tonggak where user_id='${uidD2}'`) === "1");
  }
  {
    const uidD3 = sql(`insert into users (privy_did, nama_usaha, kota, kategori_id) values ('${PREFIX}D3', 'Warung Uji', 'Bekasi', (select id from categories where slug='kuliner')) returning id`);
    for (const m of [1, 2, 3, 4, 5, 6]) seedRollups(uidD3, m, 8);
    const r = await api("/api/kesiapan", { cookie: sessionCookie(uidD3, `${PREFIX}D3`) });
    cek("seed 6 bulan penuh sebelum bulan ini → siap6, berkas12 boleh, bulan ini 0 hari",
      r.body?.tingkat === "siap6" && r.body?.berkas12Boleh === true && r.body?.hariAktifBulanIni === 0, JSON.stringify(r.body));
    cek("profil lengkap → item profil terpenuhi", r.body?.checklist?.find((c) => c.kunci === "profil")?.terpenuhi === true);
    cek("tonggakBaru siap6 (yang tertinggi saja)", r.body?.tonggakBaru === "siap6", r.body?.tonggakBaru);
    const C = sessionCookie(uidD3, `${PREFIX}D3`);
    await api("/api/kesiapan/tonggak", { method: "POST", cookie: C, body: { tingkat: "siap6" } });
    cek("tandai siap6 juga menandai siap3", sql(`select count(*) from kesiapan_tonggak where user_id='${uidD3}'`) === "2");
  }

  console.log("\n── 18. Berkas Pengajuan (Batch 5, §1.5, migrasi 0035) ──");
  const uidE = sql(`insert into users (privy_did, earner_type, nama_usaha, kota, kategori_id) values ('${PREFIX}E', 'dagang', 'Warung Uji Berkas', 'Depok', (select id from categories where slug='kuliner')) returning id`);
  const E = sessionCookie(uidE, `${PREFIX}E`);
  for (const m of [1, 2, 3]) seedRollups(uidE, m, 8); // siap3 (3 bulan penuh sebelum bulan ini)
  {
    const r = await api("/api/berkas/pratinjau", { method: "POST", body: { kode: "berkas6" } });
    cek("pratinjau tanpa sesi → 401", r.status === 401, `dapat ${r.status}`);
    const buruk = await api("/api/berkas/pratinjau", { method: "POST", cookie: E, body: { kode: "berkas99" } });
    cek("kode asing → 400", buruk.status === 400, `dapat ${buruk.status}`);
  }
  {
    const res = await fetch(`${BASE}/api/berkas/pratinjau`, { method: "POST", headers: { "content-type": "application/json", cookie: E }, body: JSON.stringify({ kode: "berkas6" }) });
    const buf = Buffer.from(await res.arrayBuffer());
    cek("pratinjau → 200 application/pdf", res.status === 200 && (res.headers.get("content-type") ?? "").includes("application/pdf"), `${res.status} ${res.headers.get("content-type")}`);
    cek("pratinjau berkas PDF sungguhan", buf.subarray(0, 4).toString() === "%PDF");
    cek("pratinjau tidak di-cache", (res.headers.get("cache-control") ?? "").includes("no-store"));
    const teks = pdfText(buf);
    if (teks !== null) {
      // Tanda air PRATINJAU adalah teks miring absolut yang tidak diekstrak
      // pdftotext (diperiksa visual); yang bisa dibuktikan dari teks: satu
      // halaman saja, dan tempat nomor dokumen berbunyi "terbit setelah pembelian".
      cek("pratinjau satu halaman & 'Terbit setelah pembelian' di tempat nomor", teks.includes("Terbit setelah pembelian") && teks.includes("Halaman 1 dari 1"));
      cek("pratinjau memakai label peran dagang 'Berkas Usaha 6 Bulan'", teks.includes("Berkas Usaha 6 Bulan"));
      // Nama domain `ai.idmtoken.com` di URL verifikasi bukan kata salinan, dan
      // "kriptografis" adalah frasa yang §0.2 justru wajibkan — keduanya dikecualikan.
      cek("pratinjau tanpa kata laba/layak/KUR/token/kripto/wallet", !/\blaba\b|\blayak|\bKUR\b|token|kripto(?!grafis)|opBNB|wallet/i.test(teks.replace(/idmtoken\.com/g, "")));
    }
    cek("premium_events mencatat lihat_pratinjau", sql(`select count(*) from premium_events where user_id='${uidE}' and aksi='lihat_pratinjau' and kode='berkas6'`) === "1");
  }
  {
    const uidF = sql(`insert into users (privy_did) values ('${PREFIX}F') returning id`);
    const r = await api("/api/berkas/pesan", { method: "POST", cookie: sessionCookie(uidF, `${PREFIX}F`), body: { kode: "berkas6" } });
    cek("pesan di bawah syarat tingkat → 409 BELUM_MEMENUHI_SYARAT", r.status === 409 && r.body?.kode === "BELUM_MEMENUHI_SYARAT", `${r.status} ${JSON.stringify(r.body)}`);
    cek("klik tetap tercatat walau ditolak", sql(`select count(*) from premium_events where user_id='${uidF}' and aksi='klik_beli'`) === "1");
  }
  let berkasId = null, nomorDok = null, kodeVer = null;
  {
    // Jalur Plus: aktifkan lewat RPC manual (tanpa Midtrans), lalu pesan.
    sql(`select langganan_perpanjang('${uidE}', 365, 'manual')`);
    const r = await api("/api/berkas/pesan", { method: "POST", cookie: E, body: { kode: "berkas6" } });
    cek("Plus aktif → dokumen dibuat (jalur plus, status dibuat — tanpa dompet, notarisasi menunggu)",
      r.status === 200 && r.body?.jalur === "plus" && r.body?.berkas?.status === "dibuat", `${r.status} ${JSON.stringify(r.body)}`);
    berkasId = r.body?.berkas?.id ?? null;
    nomorDok = r.body?.berkas?.nomorDokumen ?? null;
    const baris = sql(`select nomor_dokumen||' '||kode_verifikasi||' '||coalesce(path_pdf,'-')||' '||coalesce(length(sha256)::text,'0')||' '||status||' '||(order_id is null) from berkas_pengajuan where id='${berkasId}'`).split(" ");
    kodeVer = baris[1];
    cek("nomor dokumen BK-YYYYMM-xxxxx", /^BK-\d{6}-\d{5}$/.test(baris[0] ?? ""), baris[0]);
    cek("kode verifikasi 12 karakter", (baris[1] ?? "").length === 12, baris[1]);
    cek("PDF tersimpan di bucket & sha256 64 hex", baris[2] === `${uidE}/${baris[0]}.pdf` && baris[3] === "64", baris.join(" "));
    cek("order_id NULL (lewat Plus)", baris[5] === "true", baris[5]);
    cek("objek ada di storage.objects bucket berkas", sql(`select count(*) from storage.objects where bucket_id='berkas' and name='${uidE}/${baris[0]}.pdf'`) === "1");
    cek("galat menyebut dompet belum siap (notarisasi menunggu, bukan gagal)", sql(`select galat from berkas_pengajuan where id='${berkasId}'`).includes("dompet"));
  }
  {
    const r = await api("/api/berkas", { cookie: E });
    cek("GET /api/berkas memuat dokumen, bisaUnduh true", r.body?.items?.[0]?.id === berkasId && r.body.items[0].bisaUnduh === true, JSON.stringify(r.body));
    const tanpa = await fetch(`${BASE}/api/berkas/${berkasId}/unduh`, { redirect: "manual" });
    cek("unduh tanpa sesi → 401", tanpa.status === 401, `dapat ${tanpa.status}`);
    const dengan = await fetch(`${BASE}/api/berkas/${berkasId}/unduh`, { redirect: "manual", headers: { cookie: E } });
    const lokasi = dengan.headers.get("location") ?? "";
    cek("unduh dengan sesi → 302 ke signed URL", dengan.status === 302 && /berkas/.test(lokasi), `${dengan.status} ${lokasi.slice(0, 60)}`);
    if (dengan.status === 302) {
      const pdf = await fetch(lokasi);
      const buf = Buffer.from(await pdf.arrayBuffer());
      cek("signed URL mengembalikan PDF", pdf.status === 200 && buf.subarray(0, 4).toString() === "%PDF", `${pdf.status}`);
      const teks = pdfText(buf);
      if (teks !== null) {
        cek("dokumen penuh memuat nomor, Ringkasan periode, Rincian, Pernyataan, notarisasi", [nomorDok, "Ringkasan periode", "Rincian", "Pernyataan", "Notarisasi hash kriptografis"].every((k) => teks.includes(k)));
        cek("bulan tanpa catatan tetap ada halamannya", teks.includes("Tidak ada catatan pada bulan ini"));
        cek("dokumen penuh tanpa kata laba/layak/KUR/token/kripto/wallet", !/\blaba\b|\blayak|\bKUR\b|token|kripto(?!grafis)|opBNB|wallet|blockchain/i.test(teks.replace(/idmtoken\.com/g, "")));
        cek("sidik jari tidak dicetak di dalam dokumen (sirkular)", !teks.includes(sql(`select sha256 from berkas_pengajuan where id='${berkasId}'`)));
      }
    }
  }
  {
    const r = await api(`/api/verifikasi/${kodeVer}`);
    cek("verifikasi publik tanpa sesi → 200", r.status === 200, `dapat ${r.status}`);
    cek("memuat nomor, periode, nama usaha, sha256, status notarisasi 'belum'", r.body?.nomor_dokumen === nomorDok && r.body?.nama_usaha === "Warung Uji Berkas" && /^[0-9a-f]{64}$/.test(r.body?.sha256 ?? "") && r.body?.notarisasi?.status === "belum", JSON.stringify(r.body));
    cek("TANPA field keuangan", !["masuk", "keluar", "sisa", "total", "bulanan", "rincian"].some((k) => k in (r.body ?? {})));
    const lower = await api(`/api/verifikasi/${kodeVer.toLowerCase().replace(/0/g, "o")}`);
    cek("kode huruf kecil / O→0 dinormalisasi", lower.status === 200 && lower.body?.nomor_dokumen === nomorDok, `dapat ${lower.status}`);
    const asing = await api("/api/verifikasi/ZZZZZZZZZZZZ");
    cek("kode tak dikenal → 404", asing.status === 404, `dapat ${asing.status}`);
    const pendek = await api("/api/verifikasi/ABC");
    cek("kode panjang salah → 404", pendek.status === 404, `dapat ${pendek.status}`);
  }

  console.log("\n── 19. AIDM Plus tahunan (Batch 6, §1.1) ──");
  {
    const uidG = sql(`insert into users (privy_did, earner_type, nama_usaha, kota, kategori_id) values ('${PREFIX}G', 'freelance', 'Jasa Uji Plus', 'Bogor', (select id from categories where slug='jasa')) returning id`);
    const G = sessionCookie(uidG, `${PREFIX}G`);
    for (const m of [1, 2, 3]) seedRollups(uidG, m, 8);
    const bayar = await api("/api/langganan/bayar", { method: "POST", cookie: G });
    if (bayar.status === 501) {
      console.log("  · Midtrans tidak dikonfigurasi di .env.local — seksi 19 dilewati (bayar → 501)");
    } else {
      cek("POST /api/langganan/bayar → 200 dengan redirectUrl (Snap sandbox)",
        bayar.status === 200 && typeof bayar.body?.redirectUrl === "string" && typeof bayar.body?.orderId === "string",
        `${bayar.status} ${JSON.stringify(bayar.body).slice(0, 120)}`);
      const orderId = bayar.body?.orderId;
      if (orderId) orderUji.push(orderId);
      const baris = sql(`select kode||' '||periode_hari||' '||harga_idr||' '||status from subscription_orders where midtrans_order_id='${orderId}'`);
      cek("pesanan: kode plus, 365 hari, Rp149.000, pending", baris === "plus 365 149000 pending", baris);
      cek("premium_events klik_beli plus", sql(`select count(*) from premium_events where user_id='${uidG}' and kode='plus' and aksi='klik_beli'`) === "1");

      // Notifikasi Midtrans disimulasikan dengan tanda tangan yang sah
      // (sha512(order_id + status_code + gross_amount + server_key)) — tanpa
      // jaringan Midtrans, tanpa uang nyata.
      const kunci = env.MIDTRANS_SERVER_KEY;
      const gross = "149000.00";
      const palsu = await api("/api/langganan/webhook", { method: "POST", body: { order_id: orderId, status_code: "200", gross_amount: gross, transaction_status: "settlement", signature_key: "0".repeat(128) } });
      cek("webhook tanda tangan palsu → 401", palsu.status === 401, `dapat ${palsu.status}`);
      const salahNominal = await api("/api/langganan/webhook", { method: "POST", body: { order_id: orderId, status_code: "200", gross_amount: "49000.00", transaction_status: "settlement", signature_key: crypto.createHash("sha512").update(`${orderId}20049000.00${kunci}`).digest("hex") } });
      cek("webhook nominal tidak cocok → ditolak (pesanan failed, tidak memperpanjang)",
        salahNominal.status === 200 && sql(`select status from subscription_orders where midtrans_order_id='${orderId}'`) === "failed", JSON.stringify(salahNominal.body));
      // Nominal salah menandai failed; untuk alur sukses pakai pesanan baru.
      const bayar2 = await api("/api/langganan/bayar", { method: "POST", cookie: G });
      const orderId2 = bayar2.body?.orderId;
      if (orderId2) orderUji.push(orderId2);
      const sig2 = crypto.createHash("sha512").update(`${orderId2}200${gross}${kunci}`).digest("hex");
      const lunas = await api("/api/langganan/webhook", { method: "POST", body: { order_id: orderId2, status_code: "200", gross_amount: gross, transaction_status: "settlement", signature_key: sig2 } });
      cek("webhook settlement sah → 200 berakhir", lunas.status === 200 && typeof lunas.body?.berakhir === "string", JSON.stringify(lunas.body));
      const hari = Number(sql(`select round(extract(epoch from (berakhir_at - now()))/86400) from subscriptions where user_id='${uidG}'`));
      cek("langganan aktif ≈365 hari", hari >= 364 && hari <= 366, `dapat ${hari} hari`);
      cek("pesanan paid + premium_events bayar_sukses plus",
        sql(`select status from subscription_orders where midtrans_order_id='${orderId2}'`) === "paid" &&
        sql(`select count(*) from premium_events where user_id='${uidG}' and kode='plus' and aksi='bayar_sukses'`) === "1");
      const ulang = await api("/api/langganan/webhook", { method: "POST", body: { order_id: orderId2, status_code: "200", gross_amount: gross, transaction_status: "settlement", signature_key: sig2 } });
      const hari2 = Number(sql(`select round(extract(epoch from (berakhir_at - now()))/86400) from subscriptions where user_id='${uidG}'`));
      cek("notifikasi diulang → 'sudah diproses', masa tidak bertambah", ulang.body?.catatan === "sudah diproses" && hari2 === hari, `${JSON.stringify(ulang.body)} ${hari2}`);
      const st = await api("/api/langganan", { cookie: G });
      cek("GET /api/langganan: status aktif + riwayat memuat plus Rp149.000",
        st.body?.langganan?.status === "aktif" && st.body?.riwayat?.[0]?.kode === "plus" && st.body?.riwayat?.[0]?.hargaIdr === 149000, JSON.stringify(st.body?.riwayat));
      const pesan = await api("/api/berkas/pesan", { method: "POST", cookie: G, body: { kode: "berkas6" } });
      cek("Plus dari pesanan Midtrans memberi berkas tanpa bayar (jalur plus, dibuat)",
        pesan.status === 200 && pesan.body?.jalur === "plus" && pesan.body?.berkas?.status === "dibuat", `${pesan.status} ${JSON.stringify(pesan.body)}`);
      cek("label peran freelance di daftar berkas → Bukti Penghasilan 6 Bulan",
        (await api("/api/berkas", { cookie: G })).body?.items?.[0]?.label === "Bukti Penghasilan 6 Bulan");
    }
  }

  console.log("\n── 20. Misi rantai \"Siap Bank\" (Batch 7, migrasi 0036) ──");
  {
    // Hari aktif kumulatif 365 hari (definisi §1.4) dari daily_rollups —
    // bukan runtun. 5 bulan penuh × 8 hari = 40, ditambah satu hari 200 hari
    // lalu (ikut dihitung) dan satu hari 400 hari lalu (di luar jendela).
    const uidH = sql(`insert into users (privy_did, earner_type) values ('${PREFIX}H', 'ojol') returning id`);
    for (const m of [1, 2, 3, 4, 5]) seedRollups(uidH, m, 8);
    sql(`insert into daily_rollups (user_id, tanggal, total_masuk, total_keluar, jml_transaksi, masuk_terverifikasi)
         values ('${uidH}', (now() at time zone 'Asia/Jakarta')::date - 200, 10000, 0, 1, 0),
                ('${uidH}', (now() at time zone 'Asia/Jakarta')::date - 400, 10000, 0, 1, 0)
         on conflict (user_id, tanggal) do nothing`);
    const r = await api("/api/missions", { cookie: sessionCookie(uidH, `${PREFIX}H`) });
    cek("GET /api/missions → 200", r.status === 200, `dapat ${r.status}`);
    const misi = Object.fromEntries((r.body?.misi ?? []).map((m) => [m.code, m]));
    const tiga = ["aktif_30", "aktif_90", "aktif_180"].map((c) => misi[c]);
    cek("tiga misi Siap Bank hadir, tipe once, periodKey once",
      tiga.every((m) => m && m.tipe === "once" && m.periodKey === "once"), JSON.stringify(tiga.map((m) => m?.code)));
    cek("imbalan 100 / 150 / 250 (dari DB 0036)",
      tiga.map((m) => m?.reward).join("/") === "100/150/250", tiga.map((m) => m?.reward).join("/"));
    cek("aktif_30 selesai, progres dipotong di target 30",
      misi.aktif_30?.selesai === true && misi.aktif_30?.progress === 30, JSON.stringify(misi.aktif_30));
    cek("aktif_90 progres 41 (40 + hari ke-200), belum selesai",
      misi.aktif_90?.progress === 41 && misi.aktif_90?.selesai === false, JSON.stringify(misi.aktif_90));
    cek("aktif_180 progres 41 dari target 180; hari ke-400 tidak dihitung",
      misi.aktif_180?.progress === 41 && misi.aktif_180?.target === 180, JSON.stringify(misi.aktif_180));
    cek("deskripsi 180 hari menyebut Berkas Pengajuan",
      typeof misi.aktif_180?.deskripsi === "string" && misi.aktif_180.deskripsi.includes("Berkas Pengajuan"));
    cek("misi lama tetap ada (complete_profile, streak_30_days)",
      Boolean(misi.complete_profile) && Boolean(misi.streak_30_days));
    cek("misi once ikut cap harian: capHarian.batas 250, capBulanan.batas 450 tidak berubah",
      r.body?.capHarian?.batas === 250 && r.body?.capBulanan?.batas === 450, JSON.stringify({ h: r.body?.capHarian, b: r.body?.capBulanan }));
  }

  console.log("\n── 21. Proxy RPC same-origin & keadaan Tukar (Batch 8, migrasi 0037) ──");
  {
    const rpc = (chain, body, opts = {}) => api(`/api/rpc/${chain}`, { method: "POST", body, ...opts });
    const r0 = await rpc("solana", { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] });
    cek("jaringan asing → 404", r0.status === 404, `dapat ${r0.status}`);
    const r1 = await rpc("opbnb-testnet", { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] });
    cek("eth_chainId opbnb-testnet dijawab lokal → 0x15eb", r1.status === 200 && r1.body?.result === "0x15eb", `${r1.status} ${JSON.stringify(r1.body)}`);
    const r1b = await rpc("bsc", { jsonrpc: "2.0", id: 7, method: "eth_chainId", params: [] });
    cek("eth_chainId bsc → 0x38, id dipantulkan", r1b.body?.result === "0x38" && r1b.body?.id === 7, JSON.stringify(r1b.body));
    const r2 = await rpc("opbnb", { jsonrpc: "2.0", id: 2, method: "eth_sendTransaction", params: [{}] });
    cek("method di luar allowlist → 400, kode -32601", r2.status === 400 && r2.body?.error?.code === -32601, `${r2.status} ${JSON.stringify(r2.body)}`);
    const r2b = await rpc("opbnb", { jsonrpc: "2.0", id: 3, method: "debug_traceTransaction", params: [] });
    cek("debug_* ditolak 400", r2b.status === 400, `dapat ${r2b.status}`);
    const batch11 = Array.from({ length: 11 }, (_, i) => ({ jsonrpc: "2.0", id: i, method: "eth_chainId", params: [] }));
    const r3 = await rpc("opbnb", batch11);
    cek("batch 11 → 400 -32600", r3.status === 400 && r3.body?.error?.code === -32600, `${r3.status} ${JSON.stringify(r3.body)}`);
    const sepuluh = batch11.slice(0, 10);
    const r3b = await rpc("opbnb", sepuluh);
    cek("batch 10 eth_chainId → 200, 10 jawaban 0xcc", r3b.status === 200 && Array.isArray(r3b.body) && r3b.body.length === 10 && r3b.body.every((x) => x.result === "0xcc"), `${r3b.status} ${JSON.stringify(r3b.body).slice(0, 80)}`);
    const r4 = await rpc("opbnb", { jsonrpc: "2.0", id: 4, method: "eth_getLogs", params: [{ fromBlock: "0x1", toBlock: "0x1000", address: SWAP_ADDR_A }] });
    cek("eth_getLogs rentang 4.095 blok → 400 -32602", r4.status === 400 && r4.body?.error?.code === -32602, `${r4.status} ${JSON.stringify(r4.body)}`);
    const r4b = await rpc("opbnb", { jsonrpc: "2.0", id: 5, method: "eth_getLogs", params: [{ fromBlock: "0x1", toBlock: "latest" }] });
    cek("eth_getLogs dengan tag 'latest' → 400 (rentang harus eksplisit)", r4b.status === 400, `dapat ${r4b.status}`);
    const r5 = await rpc("opbnb", { jsonrpc: "2.0", id: 6, method: "eth_chainId", params: ["x".repeat(70 * 1024)] });
    cek("body > 64 KB → 413", r5.status === 413, `dapat ${r5.status}`);
    const r6 = await rpc("opbnb", "bukan objek");
    cek("body JSON bukan objek → 400 -32600", r6.status === 400 && r6.body?.error?.code === -32600, `${r6.status}`);

    // Batas laju per kunci sesi: 12 batch × 10 = 120 lolos, ke-13 → 429.
    // Pengguna uji baru supaya penghitungnya mulai dari nol.
    const uidI = sql(`insert into users (privy_did) values ('${PREFIX}I') returning id`);
    const I = sessionCookie(uidI, `${PREFIX}I`);
    const status = [];
    for (let i = 0; i < 13; i++) status.push((await rpc("opbnb", sepuluh, { cookie: I })).status);
    cek("120 permintaan/menit lolos (12 batch × 10), batch ke-13 → 429",
      status.slice(0, 12).every((s) => s === 200) && status[12] === 429, status.join(","));
    cek("penghitung rpc_rate kunci uid tercatat 130",
      sql(`select coalesce(max(jml),0) from rpc_rate where kunci='uid:${uidI}'`) === "130");

    const k0 = await api("/api/swap/keadaan");
    cek("GET /api/swap/keadaan tanpa sesi → 401", k0.status === 401, `dapat ${k0.status}`);
    const k1 = await api("/api/swap/keadaan", { cookie: I });
    if (k1.status === 501) {
      console.log("  · Tukar tidak dikonfigurasi di .env.local — cek keadaan dilewati (501)");
    } else {
      cek("sesi tanpa dompet → 404", k1.status === 404, `dapat ${k1.status}`);
      sql(`insert into wallets (user_id, address) values ('${uidI}', '0x00000000000000000000000000000000000c3d33')`);
      const k2 = await api("/api/swap/keadaan", { cookie: I });
      cek("dengan dompet → 200: pada (epoch), dua kaki berstatus ok|gagal",
        k2.status === 200 && typeof k2.body?.pada === "number" &&
        ["ok", "gagal"].includes(k2.body?.opbnb?.status) && ["ok", "gagal"].includes(k2.body?.bsc?.status),
        `${k2.status} ${JSON.stringify(k2.body).slice(0, 200)}`);
      cek("respons menyebut chain burn & klaim", typeof k2.body?.burnChainId === "number" && typeof k2.body?.claimChainId === "number");
      if (k2.body?.opbnb?.status === "ok") {
        cek("kaki opBNB: saldo/min/jatah/izin string digit (wei), jeda boolean",
          ["saldoIdmx", "minSwap", "sisaJatahMinggu", "izin"].every((f) => /^\d+$/.test(k2.body.opbnb[f])) && typeof k2.body.opbnb.jeda === "boolean");
        const k3 = await api("/api/swap/keadaan", { cookie: I });
        cek("pembacaan kedua <10 dtk dari cache (pada kaki sama)", k3.body?.opbnb?.pada === k2.body.opbnb.pada, `${k3.body?.opbnb?.pada} vs ${k2.body.opbnb.pada}`);
      } else {
        console.log(`  · kaki opBNB gagal dibaca dari server ini: ${k2.body?.opbnb?.galat}`);
      }
      if (k2.body?.bsc?.status === "ok") {
        cek("kaki BSC: kurs & fee string digit", /^\d+$/.test(k2.body.bsc.kurs) && /^\d+$/.test(k2.body.bsc.fee));
      } else {
        console.log(`  · kaki BSC gagal dibaca dari server ini: ${k2.body?.bsc?.galat}`);
      }
    }
    sql(`delete from rpc_rate where kunci = 'uid:${uidI}'`);
  }

  console.log("\n── 22. Modul Pajak OP (Batch 9, migrasi 0038) ──");
  {
    const tahun = Number(new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 4));
    const r0 = await api("/api/pajak");
    cek("GET /api/pajak tanpa sesi → 401", r0.status === 401, `dapat ${r0.status}`);
    const uidJ = sql(`insert into users (privy_did, earner_type, nama_usaha, kota, kategori_id) values ('${PREFIX}J', 'dagang', 'Toko Uji Pajak', 'Bekasi', (select id from categories where slug='kuliner')) returning id`);
    const J = sessionCookie(uidJ, `${PREFIX}J`);
    const k0 = await api("/api/pajak", { cookie: J });
    cek("akun kosong → omzet 0, tidak melewati, pengingat null, wajib false, belum punya paket",
      k0.status === 200 && k0.body?.tahun === tahun && k0.body?.hasil?.omzetTahun === 0 && k0.body?.hasil?.melewati === false &&
      k0.body?.pengingat === null && k0.body?.wajibPajakOp === false && k0.body?.bolehPajak === false && k0.body?.hargaPajakIdr === 59000,
      JSON.stringify(k0.body).slice(0, 200));
    cek("tanpa kata laba/skor di respons", !/laba|skor/i.test(JSON.stringify(k0.body)));
    // Omzet Jan–Mar 200 juta/bulan → kumulatif 600 juta, melewati di Maret.
    sql(`insert into daily_rollups (user_id, tanggal, total_masuk, total_keluar, jml_transaksi, masuk_terverifikasi) values
         ('${uidJ}', '${tahun}-01-15', 200000000, 0, 1, 0), ('${uidJ}', '${tahun}-02-15', 200000000, 0, 1, 0), ('${uidJ}', '${tahun}-03-15', 200000000, 0, 1, 0)
         on conflict (user_id, tanggal) do nothing`);
    const k1 = await api("/api/pajak", { cookie: J });
    const h = k1.body?.hasil;
    cek("omzet 600 juta → melewati sejak Maret", h?.omzetTahun === 600_000_000 && h?.melewati === true && h?.bulanMelewati === `${tahun}-03`, JSON.stringify(h).slice(0, 160));
    cek("Maret: dasar kena 100 juta (selisih di atas batas), setoran 500.000; Jan/Feb 0; total 500.000",
      h?.bulanan?.[2]?.dasarKena === 100_000_000 && h?.bulanan?.[2]?.setoran === 500_000 && h?.bulanan?.[0]?.setoran === 0 && h?.bulanan?.[1]?.setoran === 0 && h?.totalSetoran === 500_000,
      JSON.stringify(h?.bulanan?.slice(0, 3)));
    const patch = await api("/api/me", { method: "PATCH", cookie: J, body: { wajib_pajak_op: true } });
    const me = await api("/api/me", { cookie: J });
    cek("PATCH /api/me wajib_pajak_op true → terbaca di /api/me dan /api/pajak",
      patch.status === 200 && me.body?.user?.wajib_pajak_op === true && (await api("/api/pajak", { cookie: J })).body?.wajibPajakOp === true, JSON.stringify(me.body?.user?.wajib_pajak_op));
    cek("PATCH wajib_pajak_op bukan boolean → diabaikan (tetap true)",
      (await api("/api/me", { method: "PATCH", cookie: J, body: { wajib_pajak_op: "ya" } })).status === 200 && sql(`select wajib_pajak_op from users where id='${uidJ}'`) === "t");

    const tolak = await api("/api/pajak/rincian", { method: "POST", cookie: J, body: { tahun } });
    cek("rincian tanpa Paket Pajak/Plus → 402 PERLU_PAKET_PAJAK", tolak.status === 402 && tolak.body?.kode === "PERLU_PAKET_PAJAK", `${tolak.status} ${JSON.stringify(tolak.body)}`);
    cek("premium_events pajak lihat_pratinjau tercatat", sql(`select count(*) from premium_events where user_id='${uidJ}' and kode='pajak' and aksi='lihat_pratinjau'`) === "1");
    cek("tahun pajak asing → 400", (await api("/api/pajak/rincian", { method: "POST", cookie: J, body: { tahun: 1999 } })).status === 400);

    sql(`select langganan_perpanjang('${uidJ}', 30, 'manual')`);
    const rinci = await api("/api/pajak/rincian", { method: "POST", cookie: J, body: { tahun } });
    cek("Plus → rincian dibuat (dibuat|pending_segel|confirmed) + unduhUrl",
      rinci.status === 200 && ["dibuat", "pending_segel", "confirmed"].includes(rinci.body?.dokumen?.status) && typeof rinci.body?.unduhUrl === "string",
      `${rinci.status} ${JSON.stringify(rinci.body).slice(0, 200)}`);
    const barisR = sql(`select jenis||'|'||tahun_pajak||'|'||coalesce(path_pdf,'')||'|'||coalesce(sha256,'') from dokumen_pajak where user_id='${uidJ}' and jenis='rincian'`).split("|");
    cek("baris rincian: tahun, path_pdf di bucket, sha256 64 hex", barisR[1] === String(tahun) && barisR[2].startsWith(`${uidJ}/PJ-${tahun}-`) && /^[0-9a-f]{64}$/.test(barisR[3]), barisR.join(" | "));
    cek("nomor dokumen PJ-YYYY-xxxxx", /^PJ-\d{4}-\d{5}$/.test(rinci.body?.dokumen?.nomorDokumen ?? ""), rinci.body?.dokumen?.nomorDokumen);
    if (rinci.body?.unduhUrl) {
      const pdfRes = await fetchAsli(rinci.body.unduhUrl);
      const buf = Buffer.from(await pdfRes.arrayBuffer());
      cek("PDF rincian terunduh dari signed URL (magic %PDF)", pdfRes.status === 200 && buf.subarray(0, 4).toString() === "%PDF", `${pdfRes.status} ${buf.subarray(0, 8)}`);
      cek("sha256 PDF = sha256 di DB", crypto.createHash("sha256").update(buf).digest("hex") === barisR[3]);
      const teks = pdfText(buf);
      if (teks !== null) {
        cek("isi rincian: judul, bahan pengisian SPT, Kena PPh Final, Bukan nasihat pajak",
          /Rincian Peredaran Bruto per Bulan/.test(teks) && /pengisian SPT/.test(teks) && /Kena PPh Final/.test(teks) && /Bukan nasihat pajak/.test(teks));
        // §0.2: nol kata token/kripto/wallet/opBNB sebagai KATA — "idmtoken.com"
        // (domain URL verifikasi) dan "kriptografis" (istilah yang justru
        // diwajibkan) bukan pelanggaran, maka URL dibuang dan batas kata dipakai.
        const teksTanpaUrl = teks.replace(/https?:\/\/\S+/g, " ");
        const terlarang = teksTanpaUrl.match(/\b(token|wallet|opbnb|kripto|laba)\b/gi) ?? [];
        cek("rincian: nol kata token/wallet/opBNB/kripto/laba (di luar URL)", terlarang.length === 0, terlarang.join(","));
        cek("rincian memuat Rp600.000.000 dan setoran Rp500.000", /Rp600\.000\.000/.test(teks) && /Rp500\.000(?![.\d])/.test(teks));
      } else console.log("  · pdftotext tidak tersedia — cek isi PDF dilewati");
      const unduh = await fetchAsli(`${BASE}/api/pajak/dokumen/${sql(`select id from dokumen_pajak where user_id='${uidJ}' and jenis='rincian'`)}/unduh`, { headers: { cookie: J }, redirect: "manual" });
      cek("GET /api/pajak/dokumen/:id/unduh → 302 signed URL", unduh.status === 302 && /\/storage\//.test(unduh.headers.get("location") ?? ""), `${unduh.status}`);
    }

    const npwpUji = "12.345.678.9-012.000";
    const tolak2 = await api("/api/pajak/pernyataan", { method: "POST", cookie: J, body: { tahun, nama: "Uji Pajak", npwp: npwpUji } });
    cek("pernyataan tahun yang melewati batas → 409 MELEWATI_BATAS", tolak2.status === 409 && tolak2.body?.kode === "MELEWATI_BATAS", `${tolak2.status} ${JSON.stringify(tolak2.body)}`);
    cek("NPWP 3 digit → 400 NPWP_TIDAK_SAH", (await api("/api/pajak/pernyataan", { method: "POST", cookie: J, body: { tahun: tahun - 1, nama: "Uji", npwp: "123" } })).body?.kode === "NPWP_TIDAK_SAH");
    const sp = await fetchAsli(`${BASE}/api/pajak/pernyataan`, { method: "POST", headers: { "content-type": "application/json", cookie: J }, body: JSON.stringify({ tahun: tahun - 1, nama: "Uji Pajak", npwp: npwpUji }) });
    const spBuf = Buffer.from(await sp.arrayBuffer());
    const nomorSp = sp.headers.get("x-nomor-dokumen") ?? "";
    cek("pernyataan tahun lalu (omzet 0) → 200 application/pdf, nomor PJ-, attachment",
      sp.status === 200 && (sp.headers.get("content-type") ?? "").startsWith("application/pdf") && /^PJ-\d{4}-\d{5}$/.test(nomorSp) && /attachment/.test(sp.headers.get("content-disposition") ?? "") && spBuf.subarray(0, 4).toString() === "%PDF",
      `${sp.status} ${sp.headers.get("content-type")} ${nomorSp}`);
    const barisP = sql(`select coalesce(path_pdf,'<null>')||'|'||coalesce(sha256,'')||'|'||status||'|'||kode_verifikasi from dokumen_pajak where user_id='${uidJ}' and jenis='pernyataan'`).split("|");
    cek("baris pernyataan: path_pdf NULL (tidak disimpan), sha256 = hash PDF yang dikirim",
      barisP[0] === "<null>" && barisP[1] === crypto.createHash("sha256").update(spBuf).digest("hex"), barisP.slice(0, 3).join(" | "));
    cek("NPWP tidak tersimpan di mana pun (dokumen_pajak, users, premium_events)",
      sql(`select count(*) from dokumen_pajak where to_jsonb(dokumen_pajak)::text like '%123456789012000%'`) === "0" &&
      sql(`select count(*) from users where to_jsonb(users)::text like '%123456789012000%' or to_jsonb(users)::text like '%${npwpUji}%'`) === "0");
    cek("PDF pernyataan tidak ada di bucket (hanya 1 berkas milik J: rincian)",
      sql(`select count(*) from storage.objects where bucket_id='berkas' and name like '${uidJ}/%'`) === "1");
    const teksSp = pdfText(spBuf);
    if (teksSp !== null) {
      cek("isi surat: SURAT PERNYATAAN, nama, NPWP digit, Tahun Pajak <spasi> adalah, di bawah Rp500.000.000, Bukan nasihat pajak",
        /SURAT PERNYATAAN/.test(teksSp) && /Uji Pajak/.test(teksSp) && /123456789012000/.test(teksSp) && new RegExp(`Tahun Pajak ${tahun - 1} adalah`).test(teksSp) &&
        /di bawah Rp500\.000\.000/i.test(teksSp) && /Bukan nasihat pajak/.test(teksSp),
        JSON.stringify(teksSp.slice(0, 300)));
      const terlarangSp = teksSp.replace(/https?:\/\/\S+/g, " ").match(/\b(token|wallet|opbnb|kripto|laba)\b/gi) ?? [];
      cek("surat: nol kata token/wallet/opBNB/kripto/laba (di luar URL)", terlarangSp.length === 0, terlarangSp.join(","));
    }
    const ver = await api(`/api/verifikasi/${barisP[3]}`);
    cek("verifikasi publik dokumen pajak → 200 dengan label Surat Pernyataan + sha256, tanpa angka keuangan",
      ver.status === 200 && /Surat Pernyataan/.test(ver.body?.label ?? "") && ver.body?.sha256 === barisP[1] && !("omzet" in (ver.body ?? {})), `${ver.status} ${JSON.stringify(ver.body).slice(0, 160)}`);
    const k2 = await api("/api/pajak", { cookie: J });
    cek("daftar dokumen: 2 baris; rincian bisa diunduh, pernyataan tidak",
      k2.body?.dokumen?.length === 2 && k2.body.dokumen.find((d) => d.jenis === "rincian")?.bisaUnduh === true && k2.body.dokumen.find((d) => d.jenis === "pernyataan")?.bisaUnduh === false, JSON.stringify(k2.body?.dokumen));
    cek("sumber akses plus", k2.body?.bolehPajak === true && k2.body?.sumberAkses === "plus");

    // Paket Pajak dibeli sendiri (tanpa Plus): pesanan Midtrans kode pajak + webhook sah.
    const uidK = sql(`insert into users (privy_did, earner_type) values ('${PREFIX}K', 'freelance') returning id`);
    const K = sessionCookie(uidK, `${PREFIX}K`);
    const bayar = await api("/api/langganan/bayar", { method: "POST", cookie: K, body: { kode: "pajak" } });
    if (bayar.status === 501) {
      console.log("  · Midtrans tidak dikonfigurasi — alur beli Paket Pajak dilewati (501)");
    } else {
      cek("POST /api/langganan/bayar {kode: pajak} → 200 redirectUrl", bayar.status === 200 && typeof bayar.body?.redirectUrl === "string", `${bayar.status} ${JSON.stringify(bayar.body).slice(0, 120)}`);
      const orderId = bayar.body?.orderId;
      if (orderId) orderUji.push(orderId);
      cek("pesanan: kode pajak, 365 hari, Rp59.000", sql(`select kode||' '||periode_hari||' '||harga_idr from subscription_orders where midtrans_order_id='${orderId}'`) === "pajak 365 59000");
      const sig = crypto.createHash("sha512").update(`${orderId}20059000.00${env.MIDTRANS_SERVER_KEY}`).digest("hex");
      const lunas = await api("/api/langganan/webhook", { method: "POST", body: { order_id: orderId, status_code: "200", gross_amount: "59000.00", transaction_status: "settlement", signature_key: sig } });
      cek("webhook settlement pajak → paket pajak, langganan Plus TIDAK dibuat", lunas.status === 200 && lunas.body?.paket === "pajak" && sql(`select count(*) from subscriptions where user_id='${uidK}' and status<>'tidak_aktif'`) === "0", JSON.stringify(lunas.body));
      cek("premium_events pajak klik_beli + bayar_sukses", sql(`select count(*) from premium_events where user_id='${uidK}' and kode='pajak' and aksi in ('klik_beli','bayar_sukses')`) === "2");
      const kK = await api("/api/pajak", { cookie: K });
      cek("akses pajak dari pesanan lunas: bolehPajak true, sumber 'pajak'", kK.body?.bolehPajak === true && kK.body?.sumberAkses === "pajak", JSON.stringify({ b: kK.body?.bolehPajak, s: kK.body?.sumberAkses }));
    }
  }

  console.log("\n── 23. Ojol: platform per pendapatan & biaya kendaraan (Batch 10, migrasi 0039) ──");
  {
    const uidL = sql(`insert into users (privy_did, earner_type, nama_usaha, kota) values ('${PREFIX}L', 'ojol', 'Driver Uji', 'Depok') returning id`);
    const L = sessionCookie(uidL, `${PREFIX}L`);
    const hariIni = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    const bulanIni = hariIni.slice(0, 7);
    // Transaksi ditanam langsung (deterministik; parser diuji di test:parser korpus ojol).
    const ojek = sql(`select id from categories where slug='ojek'`);
    const ops = sql(`select id from categories where slug='operasional'`);
    const trp = sql(`select id from categories where slug='transportasi'`);
    sql(`insert into transactions (user_id, jenis, amount, kategori_id, sub_kategori, occurred_at, status) values
      ('${uidL}','masuk',150000,'${ojek}','gojek','${bulanIni}-02T12:00:00+07:00','confirmed'),
      ('${uidL}','masuk',80000,'${ojek}','grab','${bulanIni}-02T13:00:00+07:00','confirmed'),
      ('${uidL}','masuk',20000,'${ojek}',null,'${bulanIni}-03T12:00:00+07:00','confirmed'),
      ('${uidL}','keluar',30000,'${ops}','bbm','${bulanIni}-02T12:00:00+07:00','confirmed'),
      ('${uidL}','keluar',5000,'${trp}','parkir','${bulanIni}-03T12:00:00+07:00','confirmed'),
      ('${uidL}','keluar',15000,'${ops}',null,'${bulanIni}-03T12:30:00+07:00','confirmed')`);
    // Rollup harian dibangun trigger dari transactions (0011/0012) → hari aktif 2.
    const r = await api(`/api/laporan?period=${bulanIni}`, { cookie: L });
    const o = r.body?.ojol;
    cek("GET /api/laporan untuk ojol memuat blok `ojol`", r.status === 200 && o && Array.isArray(o.platform), JSON.stringify(r.body?.ojol).slice(0, 200));
    cek("platform: gojek 150.000, grab 80.000, tanpa platform 20.000; total 250.000",
      o?.platform?.find((p) => p.platform === "gojek")?.total === 150000 && o?.platform?.find((p) => p.platform === "grab")?.total === 80000 &&
      o?.platform?.find((p) => p.platform === null)?.total === 20000 && o?.totalOjek === 250000, JSON.stringify(o?.platform));
    cek("persen gojek 0,6", Math.abs((o?.platform?.find((p) => p.platform === "gojek")?.persen ?? 0) - 0.6) < 1e-9);
    cek("kendaraan: bbm 30.000 + parkir 5.000 = 35.000 (operasional tanpa sub tidak ikut)",
      o?.kendaraan?.find((k) => k.sub === "bbm")?.total === 30000 && o?.kendaraan?.find((k) => k.sub === "parkir")?.total === 5000 && o?.totalKendaraan === 35000, JSON.stringify(o?.kendaraan));
    cek("bersih harian rata-rata = (250.000 − 50.000) ÷ 2 hari aktif = 100.000", o?.bersihHarianRata === 100000 && o?.hariAktif === 2, `${o?.bersihHarianRata} / ${o?.hariAktif}`);
    cek("tanpa kata laba di blok ojol", !/laba/i.test(JSON.stringify(o)));
    const uidM = sql(`insert into users (privy_did, earner_type) values ('${PREFIX}M', 'dagang') returning id`);
    const rm = await api(`/api/laporan?period=${bulanIni}`, { cookie: sessionCookie(uidM, `${PREFIX}M`) });
    cek("peran dagang: tanpa blok ojol", rm.status === 200 && rm.body?.ojol === undefined, JSON.stringify(rm.body?.ojol));
    // Parser lewat rute Catat: sub_kategori kalau terisi harus platform yang sah.
    const c = await api("/api/catat", { method: "POST", cookie: L, body: { text: "narik gojek 120rb" } });
    const sub = c.body?.entries?.[0]?.subKategori ?? c.body?.entries?.[0]?.sub_kategori ?? null;
    cek("catat 'narik gojek 120rb' → kategori ojek, sub_kategori gojek (atau null bila model tidak mengisi)",
      c.status === 200 && c.body?.entries?.[0]?.kategori === "ojek" && (sub === "gojek" || sub === null), `${c.status} ${JSON.stringify(c.body?.entries?.[0]).slice(0, 160)}`);
    cek("sub_kategori tersimpan sebagai platform sah di DB", ["gojek", null].includes(sql(`select sub_kategori from transactions where user_id='${uidL}' order by created_at desc limit 1`) || null));
  }

  console.log("\n── 12. DELETE /api/akun (§12 hak penghapusan) ──");
  {
    const uidC = sql(
      `insert into users (privy_did) values ('${PREFIX}C') returning id`,
    );
    const C = sessionCookie(uidC, `${PREFIX}C`);
    sql(`insert into transactions (user_id, jenis, amount, payment_method, occurred_at, source, parsed_by, status)
      values ('${uidC}','masuk',90000,'tunai','${wibHariIni}T09:00:00+07:00','manual','manual','confirmed')`);
    sql(`insert into kasbon (user_id, tipe, pihak, amount)
      values ('${uidC}','piutang','Bu Uji',20000)`);
    sql(`insert into kesiapan_tonggak (user_id, tingkat) values ('${uidC}','siap3')`);
    sql(`insert into premium_events (user_id, kode, aksi, harga_idr) values ('${uidC}','berkas6','klik_beli',49000)`);
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
    // Kasbon menyimpan nama orang ketiga — hak hapus pemilik akun harus
    // membawanya pergi juga (0031: on delete cascade).
    cek("kasbon ikut terhapus (cascade)",
      sql(`select count(*) from kasbon where user_id='${uidC}'`) === "0");
    cek("kesiapan_tonggak ikut terhapus (cascade 0034)",
      sql(`select count(*) from kesiapan_tonggak where user_id='${uidC}'`) === "0");
    cek("premium_events ikut terhapus (cascade 0035)",
      sql(`select count(*) from premium_events where user_id='${uidC}'`) === "0");
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
  // PDF uji di bucket `berkas` tidak ikut cascade penghapusan users, dan
  // Supabase MENOLAK delete langsung ke storage.objects (trigger
  // storage.protect_delete) — hapus lewat Storage API dengan kunci service
  // role. Dibungkus try/catch: kegagalan bersih-bersih tidak boleh menutupi
  // galat asli dari main().
  try {
    await hapusPdfUji();
  } catch (err) {
    console.error("(bersih-bersih PDF uji gagal — periksa bucket `berkas` secara manual)", err);
  }
  sql(`delete from users where privy_did like '${PREFIX}%'`);
  if (orderUji.length > 0) {
    sql(`delete from subscription_orders where midtrans_order_id in (${orderUji.map((o) => `'${o}'`).join(",")})`);
    console.log(`  (pesanan uji dihapus: ${orderUji.length})`);
  }
  console.log("(user uji dibersihkan)");
}
process.exit(gagal.length === 0 ? 0 : 1);
