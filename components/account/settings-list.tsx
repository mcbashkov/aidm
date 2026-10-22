"use client";

import { useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import {
  MessageSquare,
  Bell,
  Shield,
  KeyRound,
  ChevronRight,
  Check,
  Briefcase,
} from "lucide-react";
import { panggil } from "@/lib/api/panggil";
import { useMe, useMeKeadaan } from "@/components/providers/me-provider";
import { isPrivyConfigured } from "@/lib/privy/config";
import { EARNER_OPTIONS, earnerLabel, type EarnerType } from "@/lib/earner";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Gaya = "santai" | "netral" | "formal";

const GAYA: { nilai: Gaya; label: string; contoh: string }[] = [
  {
    nilai: "santai",
    label: "Santai",
    contoh: "“Coba deh naikin harga es teh-mu seribu, untungmu ikut naik.”",
  },
  {
    nilai: "netral",
    label: "Netral",
    contoh: "“Menaikkan harga es teh Rp1.000 akan menambah margin per gelas.”",
  },
  {
    nilai: "formal",
    label: "Formal",
    contoh:
      "“Penyesuaian harga sebesar Rp1.000 per unit berpotensi meningkatkan marjin.”",
  },
];

/**
 * Daftar Pengaturan di /akun (§13).
 *
 * Sebelumnya keempat barisnya adalah `<button>` tanpa `onClick` — terlihat
 * bisa ditekan, tidak melakukan apa pun. Tombol mati lebih buruk daripada
 * tidak ada tombol: ia menghabiskan kepercayaan pengguna sekali per ketukan.
 *
 * Sekarang tiga di antaranya benar-benar bekerja. Yang keempat (notifikasi)
 * mengatakan apa adanya bahwa ia belum tersedia — juga sebuah jawaban, dan
 * jauh lebih jujur daripada berpura-pura.
 */
export function SettingsList() {
  const [terbuka, setTerbuka] = useState<"profil" | "gaya" | "notif" | null>(
    null,
  );

  return (
    <>
      <BarisProfilUsaha
        terbuka={terbuka === "profil"}
        onToggle={() => setTerbuka((t) => (t === "profil" ? null : "profil"))}
      />

      <BarisGaya
        terbuka={terbuka === "gaya"}
        onToggle={() => setTerbuka((t) => (t === "gaya" ? null : "gaya"))}
      />

      <BarisNotif
        terbuka={terbuka === "notif"}
        onToggle={() => setTerbuka((t) => (t === "notif" ? null : "notif"))}
      />

      <Link
        href="/kebijakan-privasi"
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors active:bg-surface-warm"
      >
        <Shield className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
        <span className="flex-1 text-[14px] text-ink">
          Kebijakan privasi (UU PDP)
        </span>
        <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
      </Link>

      <BarisEksporWallet />
    </>
  );
}

/**
 * Peran & profil usaha — satu-satunya jalur mengubah `earner_type`, bidang,
 * nama usaha, dan kota SETELAH onboarding.
 *
 * Sebelum baris ini ada, peran hanya bisa dipilih sekali di /onboarding/peran
 * dan tidak pernah lagi: salah pilih berarti chip Catat dan konteks parser
 * salah selamanya (kasus nyata 2026-10-22: akun "Warung Abadi" berperan
 * "Freelance / jasa", chipnya "Beli lisensi software"). `PATCH /api/me` sudah
 * menerima keempat field sejak v3.0 — yang hilang cuma pintunya.
 *
 * Pilihannya memakai kelas `chip` yang sama dengan layar onboarding usaha,
 * bukan kartu besar: di dalam baris pengaturan, lima kartu ikon menjadi satu
 * layar penuh untuk keputusan yang hanya butuh satu ketukan.
 */
function BarisProfilUsaha({
  terbuka,
  onToggle,
}: {
  terbuka: boolean;
  onToggle: () => void;
}) {
  const me = useMe();
  const meK = useMeKeadaan();
  const [peran, setPeran] = useState<EarnerType | null>(null);
  const [kategori, setKategori] = useState<string | null>(null);
  const [namaUsaha, setNamaUsaha] = useState<string | null>(null);
  const [kota, setKota] = useState<string | null>(null);
  const [simpan, setSimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  // Nilai layar = suntingan lokal bila ada, kalau tidak nilai profil tersimpan.
  const peranKini =
    peran ?? ((me?.user?.earner_type as EarnerType | undefined) ?? null);
  const kategoriKini = kategori ?? me?.user?.kategori_slug ?? null;
  const namaKini = namaUsaha ?? me?.user?.nama_usaha ?? "";
  const kotaKini = kota ?? me?.user?.kota ?? "";
  const adaPerubahan =
    peran !== null || kategori !== null || namaUsaha !== null || kota !== null;

  async function simpanProfil() {
    setSimpan(true);
    setGalat(null);
    const hasil = await panggil("/api/me", {
      method: "PATCH",
      body: JSON.stringify({
        earner_type: peranKini ?? undefined,
        kategori_slug: kategoriKini ?? undefined,
        nama_usaha: namaKini.trim() || undefined,
        kota: kotaKini.trim() || undefined,
      }),
    });
    setSimpan(false);
    if (!hasil.ok) {
      setGalat(
        hasil.offline
          ? "Kamu sedang offline. Coba lagi saat tersambung."
          : "Belum tersimpan. Coba lagi ya.",
      );
      return;
    }
    // Baca ulang identitas lewat cache yang sama, dengan salinan lama tetap
    // tampil sampai yang baru datang (`muatUlang` = paksa, bukan `batalkan`):
    // membuang cache membuat header Akun jatuh ke skeleton tanpa ada yang
    // menjadwalkan pembacaan ulang sampai jendela kembali fokus.
    if (meK.keadaan !== "memuat") meK.muatUlang();
    setPeran(null);
    setKategori(null);
    setNamaUsaha(null);
    setKota(null);
    onToggle();
  }

  const ringkas = me
    ? [earnerLabel(me.user?.earner_type), me.user?.kota].filter(Boolean).join(" · ")
    : "…";

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors active:bg-surface-warm"
      >
        <Briefcase className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
        <span className="flex-1 text-[14px] text-ink">Peran & profil usaha</span>
        <span className="max-w-[45%] truncate text-[13px] text-ink-subtle">
          {ringkas}
        </span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-ink-subtle transition-transform ${terbuka ? "rotate-90" : ""}`}
          aria-hidden
        />
      </button>

      {terbuka ? (
        <div className="space-y-4 bg-surface-warm px-5 pb-5 pt-1">
          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            Chip contoh di tab Catat dan tebakan kategori mengikuti peran dan
            bidang usaha ini.
          </p>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-ink">
              Kamu berpenghasilan dari mana?
            </p>
            <div className="flex flex-wrap gap-2">
              {EARNER_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setPeran(o.value)}
                  aria-pressed={peranKini === o.value}
                  disabled={simpan}
                  className={cn("chip", peranKini === o.value && "chip-active")}
                >
                  {o.title}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-ink">Bidang usaha</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setKategori(c.slug)}
                  aria-pressed={kategoriKini === c.slug}
                  disabled={simpan}
                  className={cn("chip", kategoriKini === c.slug && "chip-active")}
                >
                  {c.nama}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-ink">
                Nama usaha
              </span>
              <input
                value={namaKini}
                onChange={(e) => setNamaUsaha(e.target.value)}
                placeholder="mis. Warung Bu Sari"
                disabled={simpan}
                className="w-full rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-ink">
                Kota / kabupaten
              </span>
              <input
                value={kotaKini}
                onChange={(e) => setKota(e.target.value)}
                placeholder="mis. Bekasi"
                disabled={simpan}
                className="w-full rounded-card border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-subtle focus:border-gold-deep"
              />
            </label>
          </div>

          {galat ? (
            <p role="alert" className="text-[12.5px] text-ink-muted">
              {galat}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void simpanProfil()}
            disabled={simpan || !adaPerubahan || !peranKini}
            className="btn-primary disabled:opacity-50"
          >
            {simpan ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BarisGaya({
  terbuka,
  onToggle,
}: {
  terbuka: boolean;
  onToggle: () => void;
}) {
  // Dibaca dari cache bersama, BUKAN permintaan ketiga ke `/api/me`. Halaman
  // Akun dulu menembak endpoint yang sama tiga kali per muat — dari
  // MeProvider, dari halaman ini, dan dari baris ini.
  const me = useMe();
  const meK = useMeKeadaan();
  const [pilihan, setPilihan] = useState<Gaya | null>(null);
  const [simpan, setSimpan] = useState(false);
  const gaya: Gaya | null =
    pilihan ?? ((me?.user?.gaya_bahasa as Gaya | undefined) ?? (me ? "santai" : null));

  async function pilih(nilai: Gaya) {
    setPilihan(nilai);
    setSimpan(true);
    await panggil("/api/me", {
      method: "PATCH",
      body: JSON.stringify({ gaya_bahasa: nilai }),
    });
    // Cache identitas kini basi. Dibaca ulang dengan `muatUlang` (paksa,
    // salinan lama tetap tampil sampai yang baru tiba) — BUKAN `batalkan`:
    // membuang entri cache menjatuhkan header Akun dan kartu Wallet ke
    // skeleton, dan tidak ada yang menjadwalkan pembacaan ulang sampai jendela
    // kembali fokus. Itu "Menyiapkan…" tanpa akhir versi kecil (§7c).
    if (meK.keadaan !== "memuat") meK.muatUlang();
    setSimpan(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors active:bg-surface-warm"
      >
        <MessageSquare
          className="h-5 w-5 shrink-0 text-ink-subtle"
          aria-hidden
        />
        <span className="flex-1 text-[14px] text-ink">
          Gaya bahasa jawaban AI
        </span>
        <span className="text-[13px] text-ink-subtle">
          {gaya ? GAYA.find((g) => g.nilai === gaya)?.label : "…"}
        </span>
        <ChevronRight
          className={`h-4 w-4 text-ink-subtle transition-transform ${terbuka ? "rotate-90" : ""}`}
          aria-hidden
        />
      </button>

      {terbuka ? (
        <div className="space-y-2 bg-surface-warm px-5 pb-5 pt-1">
          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            Mengubah cara AI menulis jawabannya. Isi dan angkanya tidak berubah
            — hanya nada bicaranya.
          </p>
          {GAYA.map((g) => (
            <button
              key={g.nilai}
              type="button"
              onClick={() => pilih(g.nilai)}
              disabled={simpan}
              className={`flex w-full items-start gap-3 rounded-card border p-3 text-left transition-colors ${
                gaya === g.nilai
                  ? "border-gold bg-gold-tint"
                  : "border-line bg-surface"
              }`}
            >
              <span className="flex-1">
                <span className="block text-[13.5px] font-medium text-ink">
                  {g.label}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-muted">
                  {g.contoh}
                </span>
              </span>
              {gaya === g.nilai ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BarisNotif({
  terbuka,
  onToggle,
}: {
  terbuka: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors active:bg-surface-warm"
      >
        <Bell className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
        <span className="flex-1 text-[14px] text-ink">Notifikasi</span>
        <span className="text-[13px] text-ink-subtle">Belum tersedia</span>
        <ChevronRight
          className={`h-4 w-4 text-ink-subtle transition-transform ${terbuka ? "rotate-90" : ""}`}
          aria-hidden
        />
      </button>

      {terbuka ? (
        <div className="bg-surface-warm px-5 pb-5 pt-1">
          <p className="text-[12.5px] leading-relaxed text-ink-muted">
            Pengingat mencatat belum bisa kami kirim. Ini bukan setelan yang
            sedang mati — infrastrukturnya memang belum dibangun, dan kami tidak
            mau meminta izin notifikasi untuk sesuatu yang belum ada.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
            Sampai saat itu tiba, runtun harian di tab Misi adalah pengingat
            yang paling dekat.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Ekspor wallet menyerahkan kunci privat ke tangan pengguna. Privy menampilkan
 * modalnya sendiri lengkap dengan peringatan keamanan — kita tidak membuat
 * ulang layar itu, dan tidak pernah menyentuh kuncinya.
 *
 * Dipisah dua komponen dengan alasan yang sama seperti LogoutButton:
 * `usePrivy()` MELEMPAR bila PrivyProvider tidak ada, dan provider itu memang
 * tidak dipasang saat `NEXT_PUBLIC_PRIVY_APP_ID` kosong (mode demo). Memanggil
 * hook-nya di balik `if` bukan jalan keluar — aturan hook melarangnya.
 */
function EksporTerkonfigurasi() {
  const { exportWallet, authenticated, user } = usePrivy();
  const [galat, setGalat] = useState<string | null>(null);

  const bisa = authenticated && !!user?.wallet;

  async function ekspor() {
    setGalat(null);
    try {
      await exportWallet();
    } catch {
      setGalat("Ekspor tidak bisa dibuka sekarang. Coba lagi sebentar lagi.");
    }
  }

  return (
    <div>
      <BarisEksporTombol onClick={ekspor} disabled={!bisa} />
      {galat ? (
        <p role="alert" className="px-5 pb-4 text-[12.5px] text-ink-muted">
          {galat}
        </p>
      ) : null}
    </div>
  );
}

function BarisEksporTombol({
  onClick,
  disabled,
}: {
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors active:bg-surface-warm disabled:opacity-60"
    >
      <KeyRound className="h-5 w-5 shrink-0 text-ink-subtle" aria-hidden />
      <span className="flex-1 text-[14px] text-ink">Ekspor wallet</span>
      <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
    </button>
  );
}

function BarisEksporWallet() {
  if (!isPrivyConfigured) {
    return <BarisEksporTombol disabled />;
  }
  return <EksporTerkonfigurasi />;
}
