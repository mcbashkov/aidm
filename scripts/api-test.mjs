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
import { readFileSync } from "node:fs";
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
const PREFIX = "did:privy:__test__";

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
      full join daily_rollups r on r.user_id='${uidA}' and r.tanggal=n.d
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

  console.log(`\n━━ ${lulus} lulus, ${gagal.length} gagal ━━`);
  if (gagal.length) {
    console.log("\nGagal:");
    for (const g of gagal) console.log(`  ✗ ${g}`);
  }
}

try {
  await main();
} finally {
  sql(`delete from users where privy_did like '${PREFIX}%'`);
  console.log("(user uji dibersihkan)");
}
process.exit(gagal.length === 0 ? 0 : 1);
