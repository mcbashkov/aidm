"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import {
  MessageSquare,
  Bell,
  Shield,
  KeyRound,
  ChevronRight,
  Check,
} from "lucide-react";
import { panggil } from "@/lib/api/panggil";
import { isPrivyConfigured } from "@/lib/privy/config";

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
  const [terbuka, setTerbuka] = useState<"gaya" | "notif" | null>(null);

  return (
    <>
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

function BarisGaya({
  terbuka,
  onToggle,
}: {
  terbuka: boolean;
  onToggle: () => void;
}) {
  const [gaya, setGaya] = useState<Gaya | null>(null);
  const [simpan, setSimpan] = useState(false);

  useEffect(() => {
    void panggil<{ user?: { gaya_bahasa?: Gaya } }>("/api/me").then((h) => {
      if (h.ok) setGaya(h.data.user?.gaya_bahasa ?? "santai");
    });
  }, []);

  async function pilih(nilai: Gaya) {
    setGaya(nilai);
    setSimpan(true);
    await panggil("/api/me", {
      method: "PATCH",
      body: JSON.stringify({ gaya_bahasa: nilai }),
    });
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
