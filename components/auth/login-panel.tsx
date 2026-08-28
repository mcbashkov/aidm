"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
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
import { Button } from "@/components/ui/button";

/**
 * Logo + judul + sub jadi satu blok (§ revisi header, logo±32px di atas
 * judul) — AuthLayout tidak lagi merender logo terpisah untuk /masuk supaya
 * seluruh blok bisa di-center bersama di viewport.
 *
 * Di sinilah kunci horizontal IDM TOKEN dipakai, bukan lambang berliannya:
 * layar ini satu-satunya yang punya lebar bebas. Kunci itu sudah memuat
 * wordmark-nya sendiri, jadi teks "AIDM" di sebelahnya dihapus — dua wordmark
 * berdampingan hanya saling berebut perhatian.
 */
function Intro() {
  return (
    <div>
      {/* prefetch dimatikan: /beranda adalah rute TERLINDUNGI, dan di halaman
          ini pengguna menurut definisi belum punya sesi. Prefetch otomatis
          Next akan menembak /beranda → middleware memantulkannya ke
          /masuk?next=/beranda, dan rantai pengalihan itulah yang lewat service
          worker sebelum login selesai. Tidak ada gunanya memuat awal halaman
          yang pasti dipantulkan. */}
      <Link href="/beranda" prefetch={false} className="mb-8 flex">
        {/* 136×30 = rasio asli 1729:381 setelah dipangkas. Angkanya dikunci
            supaya kunci logo tidak pernah gepeng kalau ada yang menyetel
            ulang tinggi blok ini. */}
        <Image
          src="/brand/idmtokenlogo.png"
          alt="IDM TOKEN"
          width={136}
          height={30}
          priority
        />
      </Link>
      <div className="space-y-3">
        <h1>Catat usahamu, dalam satu ucap.</h1>
        <p className="text-[15px] leading-relaxed text-ink-muted">
          Tulis atau ucapkan transaksimu — AIDM merapikannya jadi laporan
          keuangan yang rapi dan bisa diunduh kapan saja.
        </p>
      </div>
    </div>
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
        // Login Google menaruh alamatnya di `user.google.email`, BUKAN di
        // `user.email` — mengirim yang kedua saja membuat `users.email`
        // ditimpa null setiap kali seseorang berpindah metode. Identitasnya
        // tidak terganggu (kuncinya `privy_did`), tapi kolomnya terhapus
        // diam-diam, dan data yang hilang tanpa suara adalah utang.
        const alamatEmail =
          user?.email?.address ?? user?.google?.email ?? undefined;
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            wallet: user?.wallet?.address,
            email: alamatEmail,
            phone: user?.phone?.number,
            authProvider,
          }),
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
      <div className="space-y-6">
        <Intro />
        <Button size="lg" fullWidth disabled>
          Menyiapkan akun…
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Intro />

      {langkah === "pilih" ? (
        <div className="space-y-3">
          <Button
            size="lg"
            fullWidth
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
            {sibukOauth
              ? "Membuka Google…"
              : syncError
                ? "Coba lagi"
                : "Lanjut dengan Google"}
          </Button>

          <button
            type="button"
            disabled={!ready || sibukOauth}
            onClick={() => {
              setGalat(null);
              setLangkah("email");
            }}
            className="w-full py-1 text-center text-[13px] font-semibold text-gold-deep disabled:opacity-40"
          >
            Pakai email saja
          </button>

          {pesan ? <Pesan>{pesan}</Pesan> : (
            <p className="text-center text-[12px] text-ink-subtle">
              Akunmu langsung siap dipakai mencatat.
            </p>
          )}
        </div>
      ) : null}

      {langkah === "email" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (emailSah && !mengirimKode) void kirimKode(email.trim());
          }}
        >
          <div className="space-y-1.5">
            <h2>Masuk pakai email</h2>
            <p className="text-[13px] leading-relaxed text-ink-muted">
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

          <Button
            size="lg"
            fullWidth
            type="submit"
            disabled={!emailSah || mengirimKode}
          >
            {mengirimKode ? "Mengirim…" : "Kirim kode"}
          </Button>

          {pesan ? <Pesan>{pesan}</Pesan> : null}

          <button
            type="button"
            onClick={() => {
              setGalat(null);
              setLangkah("pilih");
            }}
            className="w-full py-1 text-center text-[13px] font-semibold text-ink-muted"
          >
            ← Pilih cara lain
          </button>
        </form>
      ) : null}

      {langkah === "kode" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (kode.length === 6 && !memeriksaKode && !kodeHabis) {
              void kirimJawaban(kode);
            }
          }}
        >
          <div className="space-y-1.5">
            <h2>Masukkan 6 angka</h2>
            <p className="text-[13px] leading-relaxed text-ink-muted">
              Kode sudah dikirim ke <strong className="text-ink">{email.trim()}</strong>.
              Cek juga folder spam ya.
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

          {memeriksaKode ? (
            <p className="text-center text-[12px] text-ink-subtle">Memeriksa…</p>
          ) : null}

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
                disabled={mengirimKode}
                onClick={() => void kirimKode(email.trim())}
                className="font-semibold text-gold-deep disabled:opacity-40"
              >
                {mengirimKode ? "Mengirim…" : "Kirim ulang kode"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setGalat(null);
              setKode("");
              setGagalKode(0);
              setLangkah("email");
            }}
            className="w-full py-1 text-center text-[13px] font-semibold text-ink-muted"
          >
            ← Ganti email
          </button>
        </form>
      ) : null}
    </div>
  );
}

/** Satu bentuk untuk seluruh pesan galat & keterangan di layar masuk. */
function Pesan({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-card bg-gold-tint px-4 py-3 text-center text-[12px] leading-relaxed text-ink-muted"
    >
      {children}
    </p>
  );
}

function PlaceholderLogin() {
  return (
    <div className="space-y-6">
      <Intro />
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
      <Link href="/beranda" className="btn-primary">
        Lihat demo Beranda
      </Link>
    </div>
  );
}

export function LoginPanel() {
  return isPrivyConfigured ? <ConfiguredLogin /> : <PlaceholderLogin />;
}
