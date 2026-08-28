"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  usePrivy,
  useLoginWithEmail,
  useLoginWithOAuth,
} from "@privy-io/react-auth";
import { isPrivyConfigured } from "@/lib/privy/config";
import {
  JEDA_KIRIM_ULANG_DETIK,
  MAKS_PERCOBAAN_KODE,
  kodeGalat,
  pembatalanPengguna,
  pesanKirimKode,
  pesanKode,
  pesanOauth,
} from "@/lib/privy/galat-masuk";
import { simpanTujuanDariUrl } from "@/lib/auth/tujuan";
import { CarouselVerba } from "@/components/auth/carousel-verba";

/**
 * Layar masuk — tampilan mengikuti docs/mockups/aidm-onboarding-fuse.html.
 *
 * TIDAK ADA logo di layar ini. Logo sudah tampil penuh layar di splash beberapa
 * detik sebelumnya; mengulangnya di sini hanya memakan ruang yang seharusnya
 * milik janji produk. Penggantinya adalah carousel verba — Catat, Lapor,
 * Segel, Unduh — empat kata yang mengatakan apa yang akan terjadi.
 *
 * Perubahan di berkas ini murni PRESENTASI. Mesin autentikasinya —
 * `mulaiGoogle`, `kirimKode`, `kirimJawaban`, penukaran sesi, dan seluruh
 * state di bawah — tidak disentuh sama sekali.
 */

/** Cangkang full-bleed: gradien mengisi seluruh viewport, konten satu kolom. */
function Cangkang({
  children,
  form = false,
}: {
  children: ReactNode;
  form?: boolean;
}) {
  return (
    <div className="onboarding ob-masuk">
      <div className={`ob-masuk__kolom${form ? " ob-masuk__kolom--form" : ""}`}>
        {children}
      </div>
    </div>
  );
}

/** Judul layar. Dipakai di semua langkah supaya ukurannya tidak melompat. */
function Judul({ children }: { children: ReactNode }) {
  return <h1 className="ob-headline">{children}</h1>;
}

/** Lambang Google pada tombol primer. */
function IkonGoogle() {
  return (
    <svg className="ob-btn__g" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#fff"
        opacity=".95"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#fff"
        opacity=".8"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#fff"
        opacity=".65"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#fff"
        opacity=".9"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

/** Batas tunggu tukar sesi — server mati/menggantung tidak boleh membuat
 *  tombol membeku di "Menyiapkan akun…" tanpa jalan keluar. */
const SESSION_TIMEOUT_MS = 15_000;

function ConfiguredLogin() {
  const router = useRouter();
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const [syncing, setSyncing] = useState(false);
  /** Langkah alur masuk. Semuanya di dalam /masuk — bukan halaman terpisah,
   *  supaya tombol kembali browser tidak memotong alur di tengah. */
  const [langkah, setLangkah] = useState<"pilih" | "email" | "kode">("pilih");
  const [email, setEmail] = useState("");
  const [kode, setKode] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  /** Dihitung sendiri: Privy tidak mengembalikan sisa percobaan. */
  const [gagalKode, setGagalKode] = useState(0);
  const [hitungMundur, setHitungMundur] = useState(0);
  const kodeRef = useRef<HTMLInputElement>(null);
  // Dibaca dari callback `onError` Privy, yang menangkap nilai state pada saat
  // hook dibuat — ref inilah yang membuatnya selalu melihat hitungan terkini.
  const sisaPercobaanRef = useRef(MAKS_PERCOBAAN_KODE);
  sisaPercobaanRef.current = MAKS_PERCOBAAN_KODE - gagalKode;
  const [syncError, setSyncError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  // Menandai sinkronisasi sudah dimulai. `user` & `getAccessToken` berganti
  // identitas tiap kali state Privy berubah, jadi tanpa penjaga ini effect
  // bisa berjalan berulang: POST /api/auth/session bertubi-tubi + router
  // .replace berulang — persis pola yang bisa membekukan tab.
  const startedRef = useRef(false);

  // Galat dari Privy datang sebagai KODE (PrivyErrorCode), bukan kalimat —
  // seluruh teks yang dilihat pengguna lahir di lib/privy/galat-masuk.ts.
  const { initOAuth, state: oauthState } = useLoginWithOAuth({
    onError: (err) => {
      // Batal sendiri di jendela Google bukan galat; layar cukup kembali diam.
      setGalat(pembatalanPengguna(err) ? null : pesanOauth(err));
    },
  });
  const { sendCode, loginWithCode, state: otpState } = useLoginWithEmail({
    onError: (err) => setGalat(pesanKode(err, sisaPercobaanRef.current)),
  });

  // Hitung mundur kirim ulang. Berhenti sendiri di nol — bukan interval abadi.
  useEffect(() => {
    if (hitungMundur <= 0) return;
    const t = setTimeout(() => setHitungMundur((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [hitungMundur]);

  const mulaiGoogle = useCallback(async () => {
    setGalat(null);
    try {
      await initOAuth({ provider: "google" });
    } catch (err) {
      // initOAuth juga melempar; onError tidak selalu terpanggil untuk
      // kegagalan sebelum alur dimulai (mis. jaringan mati saat /oauth/init).
      if (!pembatalanPengguna(kodeGalat(err))) setGalat(pesanOauth(kodeGalat(err)));
    }
  }, [initOAuth]);

  const kirimKode = useCallback(
    async (alamat: string) => {
      setGalat(null);
      setKode("");
      setGagalKode(0);
      try {
        await sendCode({ email: alamat });
        setLangkah("kode");
        setHitungMundur(JEDA_KIRIM_ULANG_DETIK);
        // Fokus menyusul setelah kotaknya benar-benar terpasang.
        setTimeout(() => kodeRef.current?.focus(), 0);
      } catch (err) {
        setGalat(pesanKirimKode(kodeGalat(err)));
      }
    },
    [sendCode],
  );

  const kirimJawaban = useCallback(
    async (isi: string) => {
      setGalat(null);
      try {
        await loginWithCode({ code: isi });
      } catch (err) {
        // Hitungan dinaikkan HANYA untuk kode yang memang salah — kegagalan
        // jaringan tidak boleh menghabiskan jatah percobaan pengguna.
        const k = kodeGalat(err);
        const salahKode = k === "invalid_credentials";
        const gagalBaru = salahKode ? gagalKode + 1 : gagalKode;
        if (salahKode) setGagalKode(gagalBaru);
        setGalat(pesanKode(k, MAKS_PERCOBAAN_KODE - gagalBaru));
        setKode("");
        kodeRef.current?.focus();
      }
    },
    [loginWithCode, gagalKode],
  );

  /**
   * Pindahkan `?next=` ke sessionStorage lalu bersihkan URL — SEBELUM pengguna
   * sempat menekan apa pun. Privy mengirim `window.location.href` sebagai
   * `redirect_to`, dan query string apa pun di sana membuatnya ditolak
   * `401 Redirect URL is not allowed`. Efek ini yang menjamin URL sudah bersih
   * pada setiap klik, bukan kebetulan halaman sedang tidak berparameter.
   */
  useEffect(() => {
    simpanTujuanDariUrl();
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    setSyncing(true);
    setSyncError(null);

    (async () => {
      try {
        const accessToken = await getAccessToken();
        const authProvider = user?.google
          ? "google"
          : user?.phone
            ? "sms"
            : "email";
        // Hanya token + tombol yang ditekan. Alamat email, nomor telepon, dan
        // alamat dompet TIDAK lagi ikut dikirim: server membacanya sendiri dari
        // Privy memakai DID hasil verifikasi token (app/api/auth/session).
        // Klien tidak boleh menjadi sumber bagi apa pun yang menentukan siapa
        // seseorang atau ke mana rewardnya dibayarkan — dan sekaligus inilah
        // yang menutup `users.email` ditimpa null saat orang berpindah metode.
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, authProvider }),
          signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!cancelled) router.replace("/onboarding/peran");
      } catch (err) {
        // Tanpa cookie sesi, middleware akan memantulkan balik ke /masuk —
        // jadi JANGAN redirect saat gagal. Berhenti di sini dengan jalan keluar.
        console.error("[auth] tukar sesi gagal:", err);
        if (!cancelled) {
          startedRef.current = false;
          setSyncing(false);
          setSyncError(
            "Akun kamu sudah masuk, tapi sesi ke server belum terbentuk. Coba lagi ya.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, user, getAccessToken, router, retry]);

  const pesan = syncError ?? galat;
  const sisaPercobaan = MAKS_PERCOBAAN_KODE - gagalKode;
  const kodeHabis = sisaPercobaan <= 0;
  const sibukOauth = oauthState.status === "loading";
  const mengirimKode = otpState.status === "sending-code";
  const memeriksaKode = otpState.status === "submitting-code";
  const emailSah = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Selama sesi sedang ditukar, tidak ada pilihan yang masih relevan — layar
  // menahan satu pesan saja supaya tidak ada tombol yang mengundang ketukan
  // di tengah proses yang sudah berjalan.
  if (syncing) {
    return (
      <Cangkang>
        <CarouselVerba />
        <div className="ob-sheet">
          <Judul>
            Catat usahamu,
            <br />
            dalam satu ucap.
          </Judul>
          <button type="button" className="ob-btn ob-btn--primer" disabled>
            Menyiapkan akun…
          </button>
        </div>
      </Cangkang>
    );
  }

  if (langkah === "pilih") {
    return (
      <Cangkang>
        <CarouselVerba />

        <div className="ob-sheet">
          <Judul>
            Catat usahamu,
            <br />
            dalam satu ucap.
          </Judul>
          <p className="ob-sub">
            Tulis atau ucapkan transaksimu — AIDM merapikannya jadi laporan
            keuangan yang rapi dan bisa diunduh kapan saja.
          </p>

          <button
            type="button"
            className="ob-btn ob-btn--primer"
            disabled={!ready || sibukOauth}
            onClick={() => {
              if (syncError) {
                setSyncError(null);
                setRetry((n) => n + 1);
                return;
              }
              void mulaiGoogle();
            }}
          >
            {syncError ? null : <IkonGoogle />}
            {sibukOauth
              ? "Membuka Google…"
              : syncError
                ? "Coba lagi"
                : "Lanjut dengan Google"}
          </button>

          <button
            type="button"
            className="ob-btn ob-btn--hantu"
            disabled={!ready || sibukOauth}
            onClick={() => {
              setGalat(null);
              setLangkah("email");
            }}
          >
            Pakai email saja
          </button>

          {pesan ? (
            <Pesan>{pesan}</Pesan>
          ) : (
            <p className="ob-foot">Akunmu langsung siap dipakai mencatat.</p>
          )}
        </div>
      </Cangkang>
    );
  }

  if (langkah === "email") {
    return (
      <Cangkang form>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (emailSah && !mengirimKode) void kirimKode(email.trim());
          }}
        >
          <div>
            <Judul>Masuk pakai email</Judul>
            <p className="ob-sub !mb-0">
              Kami kirim kode 6 angka ke emailmu. Tidak perlu kata sandi.
            </p>
          </div>

          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            aria-label="Alamat email"
            className="w-full rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep"
          />

          <button
            type="submit"
            className="ob-btn ob-btn--primer"
            disabled={!emailSah || mengirimKode}
          >
            {mengirimKode ? "Mengirim…" : "Kirim kode"}
          </button>

          {pesan ? <Pesan>{pesan}</Pesan> : null}

          <button
            type="button"
            className="ob-tautan"
            onClick={() => {
              setGalat(null);
              setLangkah("pilih");
            }}
          >
            ← Pilih cara lain
          </button>
        </form>
      </Cangkang>
    );
  }

  return (
    <Cangkang form>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (kode.length === 6 && !memeriksaKode && !kodeHabis) {
            void kirimJawaban(kode);
          }
        }}
      >
        <div>
          <Judul>Masukkan 6 angka</Judul>
          <p className="ob-sub !mb-0">
            Kode sudah dikirim ke{" "}
            <strong className="text-ink">{email.trim()}</strong>. Cek juga folder
            spam ya.
          </p>
        </div>

        {/*
          SATU kotak, bukan enam. `autocomplete="one-time-code"` hanya bekerja
          pada satu field — dan itulah yang membuat ponsel menawarkan kodenya
          sendiri, sekali ketuk, tanpa mengetik. Enam kotak terpisah terlihat
          lebih rapi tapi mematikan fitur yang justru paling menolong di
          layar ini. Jarak antarhuruf yang membuatnya tetap terbaca per angka.
        */}
        <input
          ref={kodeRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={kode}
          disabled={memeriksaKode || kodeHabis}
          onChange={(e) => {
            const bersih = e.target.value.replace(/\D/g, "").slice(0, 6);
            setKode(bersih);
            // Kirim otomatis begitu enam angka lengkap — tidak ada gunanya
            // menuntut satu ketukan lagi setelah angka terakhir masuk.
            if (bersih.length === 6 && !memeriksaKode && !kodeHabis) {
              void kirimJawaban(bersih);
            }
          }}
          aria-label="Kode 6 angka"
          className="tnum w-full rounded-card border border-line bg-surface px-4 py-3 text-center text-[24px] font-bold tracking-[0.5em] text-ink outline-none focus:border-gold-deep disabled:opacity-50"
        />

        {memeriksaKode ? <p className="ob-foot !mt-0">Memeriksa…</p> : null}

        {pesan ? <Pesan>{pesan}</Pesan> : null}

        <div className="flex items-center justify-center gap-1.5 text-[13px]">
          {hitungMundur > 0 && !kodeHabis ? (
            <span className="text-ink-subtle">
              Kirim ulang dalam{" "}
              <span className="tnum font-semibold text-ink-muted">
                0:{String(hitungMundur).padStart(2, "0")}
              </span>
            </span>
          ) : (
            <button
              type="button"
              className="ob-tautan"
              disabled={mengirimKode}
              onClick={() => void kirimKode(email.trim())}
            >
              {mengirimKode ? "Mengirim…" : "Kirim ulang kode"}
            </button>
          )}
        </div>

        <button
          type="button"
          className="ob-tautan"
          onClick={() => {
            setGalat(null);
            setKode("");
            setGagalKode(0);
            setLangkah("email");
          }}
        >
          ← Ganti email
        </button>
      </form>
    </Cangkang>
  );
}

/** Satu bentuk untuk seluruh pesan galat & keterangan di layar masuk. */
function Pesan({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-3 rounded-card bg-gold-tint px-4 py-3 text-center text-[12px] leading-relaxed text-ink-muted"
    >
      {children}
    </p>
  );
}

function PlaceholderLogin() {
  return (
    <Cangkang form>
      <Judul>Catat usahamu, dalam satu ucap.</Judul>
      <div className="card space-y-1 p-4">
        <p className="text-[13px] font-semibold text-ink">Mode demo</p>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Auth Privy belum dikonfigurasi. Isi{" "}
          <code className="rounded bg-gold-tint px-1 py-0.5 text-[12px]">
            NEXT_PUBLIC_PRIVY_APP_ID
          </code>{" "}
          di <code className="text-[12px]">.env.local</code> untuk mengaktifkan
          masuk lewat Google atau email.
        </p>
      </div>
      <Link href="/beranda" className="ob-btn ob-btn--primer">
        Lihat demo Beranda
      </Link>
    </Cangkang>
  );
}

export function LoginPanel() {
  return isPrivyConfigured ? <ConfiguredLogin /> : <PlaceholderLogin />;
}
