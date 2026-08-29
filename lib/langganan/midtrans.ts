import { createHash, timingSafeEqual } from "node:crypto";
import { envPertama } from "@/lib/env";

/**
 * Midtrans — pembayaran langganan bulanan.
 *
 * KEPUTUSAN: pembayaran SEKALI-BAYAR yang memperpanjang 30 hari, BUKAN
 * langganan berulang (recurring) Midtrans.
 *
 * Alasannya bukan kemalasan teknis. Midtrans Subscription API menagih ulang
 * lewat kartu tersimpan (`saved_token_id`), dan itu menuntut Core API + kartu
 * kredit. Pelanggan AIDM adalah pedagang mikro Indonesia; alat bayar mereka
 * QRIS dan Virtual Account, dan **keduanya secara sifat tidak bisa ditagih
 * otomatis** — tidak ada instrumen yang tersimpan untuk ditagih. Memaksakan
 * recurring berarti memaksa kartu kredit, yaitu memotong sebagian besar
 * pengguna dari fitur berbayarnya sendiri.
 *
 * Yang dibangun: Snap sekali bayar → webhook → `langganan_perpanjang` 30 hari
 * dari SISA yang masih berjalan. Pelanggan membayar lagi saat mau. Tidak ada
 * tagihan diam-diam, dan tidak ada kartu yang perlu dipercayakan ke siapa pun.
 */

const SANDBOX = "https://app.sandbox.midtrans.com/snap/v1/transactions";
const PRODUKSI = "https://app.midtrans.com/snap/v1/transactions";

export function isMidtransConfigured(): boolean {
  return Boolean(envPertama("MIDTRANS_SERVER_KEY"));
}

function serverKey(): string {
  return envPertama("MIDTRANS_SERVER_KEY") ?? "";
}

/** `true` HANYA bila disetel eksplisit — kosong berarti sandbox (§ aturan
 *  "string tidak kosong" di .env.local.example). */
function produksi(): boolean {
  return (envPertama("MIDTRANS_IS_PRODUCTION") ?? "").toLowerCase() === "true";
}

export interface SnapDibuat {
  token: string;
  redirectUrl: string;
}

/**
 * Buat transaksi Snap. `orderId` HARUS unik dan disimpan lebih dulu di
 * `subscription_orders` — ia yang menjadi kunci idempotensi webhook nanti.
 */
export async function buatSnap(opts: {
  orderId: string;
  jumlahIdr: number;
  email?: string | null;
}): Promise<SnapDibuat> {
  const auth = Buffer.from(`${serverKey()}:`).toString("base64");
  const res = await fetch(produksi() ? PRODUKSI : SANDBOX, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: opts.orderId,
        // Midtrans menolak desimal pada IDR. Nilainya integer rupiah penuh,
        // sama seperti seluruh uang di aplikasi ini (§12 "dilarang float").
        gross_amount: opts.jumlahIdr,
      },
      item_details: [
        {
          id: "aidm-premium-30h",
          price: opts.jumlahIdr,
          quantity: 1,
          name: "AIDM Premium 30 hari",
        },
      ],
      customer_details: opts.email ? { email: opts.email } : undefined,
      // Kartu kredit sengaja TIDAK dimatikan, tapi juga tidak diistimewakan —
      // QRIS dan VA yang dipakai mayoritas pengguna muncul lebih dulu.
      enabled_payments: ["other_qris", "gopay", "shopeepay", "bca_va", "bni_va", "bri_va", "permata_va", "echannel"],
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const teks = await res.text().catch(() => "");
    throw new Error(`Midtrans ${res.status}: ${teks.slice(0, 200)}`);
  }
  const body = (await res.json()) as { token?: string; redirect_url?: string };
  if (!body.token || !body.redirect_url) {
    throw new Error("Midtrans tidak mengembalikan token Snap.");
  }
  return { token: body.token, redirectUrl: body.redirect_url };
}

export interface NotifikasiMidtrans {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
}

/**
 * Verifikasi tanda tangan webhook (§12 "webhook terverifikasi").
 *
 * Ini bagian paling rawan dari seluruh alur pembayaran: webhook yang tidak
 * diverifikasi berarti siapa pun yang tahu URL-nya bisa memberi dirinya
 * langganan seumur hidup dengan satu POST. Rumusnya dari dokumentasi Midtrans:
 *
 *     sha512(order_id + status_code + gross_amount + server_key)
 *
 * Perbandingannya `timingSafeEqual`, bukan `===` — beda waktu eksekusi pada
 * pembandingan string membocorkan tanda tangan yang benar sedikit demi sedikit.
 */
export function tandaTanganCocok(n: NotifikasiMidtrans): boolean {
  const kunci = serverKey();
  if (!kunci) return false;
  const dibawa = (n.signature_key ?? "").toLowerCase();
  if (dibawa.length !== 128) return false; // sha512 hex

  const dihitung = createHash("sha512")
    .update(`${n.order_id ?? ""}${n.status_code ?? ""}${n.gross_amount ?? ""}${kunci}`)
    .digest("hex");

  return timingSafeEqual(Buffer.from(dibawa), Buffer.from(dihitung));
}

/** Pembayaran benar-benar lunas — bukan sekadar "diterima". */
export function lunas(n: NotifikasiMidtrans): boolean {
  const st = n.transaction_status;
  // `capture` hanya sah bila fraud_status accept; `settlement` selalu final.
  if (st === "settlement") return true;
  if (st === "capture") return n.fraud_status === "accept";
  return false;
}

/** Gagal secara final — pesanan boleh ditutup, bukan digantung. */
export function gagalFinal(n: NotifikasiMidtrans): boolean {
  return ["deny", "cancel", "expire", "failure"].includes(
    n.transaction_status ?? "",
  );
}
