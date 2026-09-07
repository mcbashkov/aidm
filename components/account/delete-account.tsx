"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Trash2, ChevronRight, AlertTriangle, KeyRound } from "lucide-react";
import { isPrivyConfigured } from "@/lib/privy/config";
import { useSaldoIdmx } from "@/components/providers/me-provider";

const FRASA = "HAPUS";

/**
 * Hapus akun permanen (§12 privasi / UU PDP hak penghapusan).
 *
 * Konfirmasi memakai ketik-ulang frasa, bukan tombol "Yakin?" biasa: yang
 * hilang di sini adalah seluruh buku usaha — transaksi, laporan, segel — dan
 * tidak ada undo. Gesekan sengaja dibuat lebih besar daripada hapus satu
 * transaksi (yang cukup dua ketukan) karena akibatnya tidak sebanding.
 *
 * Dipisah dua komponen dengan alasan yang sama seperti `SettingsList`:
 * `usePrivy()` MELEMPAR bila PrivyProvider tidak ada, dan provider itu memang
 * tidak dipasang saat `NEXT_PUBLIC_PRIVY_APP_ID` kosong (mode demo).
 * Memanggil hook-nya di balik `if` bukan jalan keluar — aturan hook
 * melarangnya.
 */
export function DeleteAccount() {
  return isPrivyConfigured ? <HapusTerkonfigurasi /> : <HapusTanpaPrivy />;
}

function HapusTerkonfigurasi() {
  const { logout, exportWallet, authenticated, user } = usePrivy();
  return (
    <PanelHapus
      // Dipanggil SEBELUM DELETE, dan itu bukan urutan yang bebas dipilih.
      // Sesi Privy yang masih hidup akan disinkronkan ulang secara diam-diam
      // oleh `/masuk` dan MEMBANGKITKAN KEMBALI akun yang barusan dihapus —
      // persis yang terjadi di produksi 2026-09-07, tiga kali berturut-turut
      // dalam dua detik. Server juga menghapus identitas Privy-nya, jadi
      // kebangkitan itu kini mustahil dua kali; ini lapis yang lebih dekat ke
      // pengguna dan yang paling cepat bekerja.
      onLogout={logout}
      onEkspor={authenticated && user?.wallet ? exportWallet : null}
    />
  );
}

function HapusTanpaPrivy() {
  return <PanelHapus onLogout={null} onEkspor={null} />;
}

function PanelHapus({
  onLogout,
  onEkspor,
}: {
  onLogout: (() => Promise<void>) | null;
  onEkspor: (() => Promise<void>) | null;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [terbuka, setTerbuka] = useState(false);
  const [frasa, setFrasa] = useState("");
  const [paham, setPaham] = useState(false);
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const saldo = useSaldoIdmx();
  // Hanya saldo yang BENAR-BENAR terbaca dan lebih dari nol yang memunculkan
  // peringatan tambahan. Saldo yang gagal dibaca sengaja tidak memicunya:
  // menahan hak seseorang atas dasar angka yang tidak pernah kita lihat
  // adalah menebak, dan menebak ke arah yang merugikan pengguna.
  const punyaSaldo = saldo.keadaan === "terbaca" && saldo.nilai > 0;
  const jumlahIdmx = saldo.keadaan === "terbaca" ? saldo.nilai : 0;

  useEffect(() => {
    if (!terbuka) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTerbuka(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [terbuka]);

  function tutup() {
    if (memproses) return;
    setTerbuka(false);
    setFrasa("");
    setPaham(false);
    setGalat(null);
  }

  async function ekspor() {
    if (!onEkspor) return;
    setGalat(null);
    try {
      await onEkspor();
    } catch {
      setGalat("Ekspor tidak bisa dibuka sekarang. Coba lagi sebentar lagi.");
    }
  }

  async function hapus() {
    setMemproses(true);
    setGalat(null);
    try {
      // Sesi Privy dimatikan lebih dulu. Bila DELETE di bawah gagal, yang
      // terjadi hanyalah pengguna keluar dari sesi Privy sementara akunnya
      // utuh — ia tinggal masuk lagi. Urutan sebaliknya meninggalkan jendela
      // tempat akun sudah terhapus tapi sesinya masih bisa membangkitkannya.
      if (onLogout) {
        try {
          await onLogout();
        } catch {
          // Bukan alasan membatalkan: server menghapus identitas Privy-nya
          // juga, dan itulah penjaga yang sesungguhnya. Logout di sini
          // mempercepat, bukan menentukan.
        }
      }

      const res = await fetch("/api/akun", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konfirmasi: FRASA }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setGalat(body.error ?? "Gagal menghapus akun. Coba lagi ya.");
        setMemproses(false);
        return;
      }
      // Reload penuh ke halaman konfirmasi — bukan `/masuk`. Tindakan paling
      // tidak bisa dibatalkan di aplikasi ini tidak boleh berakhir di layar
      // yang sama persis seperti sebelum pengguna punya akun.
      window.location.href = "/akun-dihapus";
    } catch {
      setGalat("Jaringan bermasalah. Akunmu belum terhapus.");
      setMemproses(false);
    }
  }

  const siap =
    frasa.trim().toUpperCase() === FRASA && (!punyaSaldo || paham) && !memproses;

  return (
    <>
      <button
        type="button"
        onClick={() => setTerbuka(true)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors active:bg-surface-warm"
      >
        <Trash2 className="h-5 w-5 shrink-0 text-danger" aria-hidden />
        <span className="flex-1 text-[14px] text-danger">Hapus akun</span>
        <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
      </button>

      {terbuka ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <button
            type="button"
            aria-label="Tutup"
            onClick={tutup}
            className="absolute inset-0 animate-fade-in bg-black/50"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="pb-safe relative max-h-[92dvh] w-full animate-slide-up space-y-4 overflow-y-auto rounded-t-sheet bg-surface px-5 pb-5 pt-5 outline-none md:max-w-md md:rounded-sheet"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-danger/10">
                <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
              </span>
              <h2 id={titleId} className="text-[20px]">
                Hapus akun
              </h2>
            </div>

            {/* Yang benar-benar hilang, disebut satu per satu. Kalimat lama
                menyebut "transaksi, laporan, dan segel" lalu menjanjikan
                semuanya "dihapus permanen" — dua pertiga benar, dan bagian
                yang tidak benar justru menyangkut hal yang paling tidak bisa
                ditarik kembali. */}
            <p className="text-[14px] leading-relaxed text-ink-muted">
              Yang akan dihapus permanen:{" "}
              <strong className="text-ink">
                catatan transaksi, laporan, profil usaha, dompet, dan akunmu
              </strong>
              . Tidak bisa dikembalikan. Sebaiknya unduh CSV atau PDF laporanmu
              dulu.
            </p>

            {punyaSaldo ? (
              <div className="space-y-3 rounded-card border border-danger/30 bg-danger/5 p-4">
                <p className="text-[13.5px] leading-relaxed text-ink">
                  Kamu masih punya{" "}
                  <strong>{jumlahIdmx.toLocaleString("id-ID")} IDMX</strong>.
                  Setelah akun dihapus, dompet ini tidak bisa kamu akses lagi
                  lewat AIDM.
                </p>
                <p className="text-[13px] leading-relaxed text-ink-muted">
                  IDMX-nya sendiri tidak lenyap — ia tetap ada di blockchain.
                  Kalau kamu simpan kunci dompetnya sekarang, dompet itu tetap
                  milikmu dan bisa dibuka lewat aplikasi dompet lain. Tanpa
                  kunci itu, tidak ada seorang pun — termasuk kami — yang bisa
                  mengembalikannya.
                </p>
                {onEkspor ? (
                  <button
                    type="button"
                    onClick={ekspor}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-surface px-4 text-[13.5px] font-semibold text-ink"
                  >
                    <KeyRound className="h-4 w-4" aria-hidden />
                    Ekspor wallet dulu
                  </button>
                ) : null}
                <label className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    checked={paham}
                    onChange={(e) => setPaham(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--danger)]"
                  />
                  <span className="text-[13px] leading-relaxed text-ink">
                    Saya paham saldo IDMX saya tidak lagi bisa diakses lewat
                    AIDM, dan saya tetap ingin menghapus akun.
                  </span>
                </label>
              </div>
            ) : null}

            {/* Dua hal yang TIDAK bisa dijanjikan hilang. Disampaikan sebagai
                sifat produk, bukan sebagai permintaan maaf — segel yang bisa
                dihapus belakangan tidak akan pernah bisa membuktikan apa pun. */}
            <div className="space-y-2 rounded-card bg-surface-warm p-4">
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Sidik jari laporan yang sudah kamu segel tetap ada di
                blockchain dan tidak bisa dihapus siapa pun, termasuk kami.
                Isinya tidak ikut — yang tersimpan hanya bukti bahwa laporan
                itu ada dan tidak diubah. Itu sifat blockchain, dan justru itu
                yang membuat laporanmu bisa dibuktikan.
              </p>
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Catatan pembayaran langganan disimpan ter-anonimkan sesuai
                kewajiban pajak — tanpa nama, tanpa kaitan ke akunmu.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="konfirmasi-hapus"
                className="block text-[13px] text-ink-muted"
              >
                Ketik <strong className="text-ink">{FRASA}</strong> untuk
                melanjutkan
              </label>
              <input
                id="konfirmasi-hapus"
                value={frasa}
                onChange={(e) => setFrasa(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                className="min-h-[48px] w-full rounded-card bg-surface-warm px-4 text-[15px] text-ink outline-none focus:ring-2 focus:ring-danger/40"
              />
            </div>

            {galat ? (
              <p className="text-[13px] text-danger" role="alert">
                {galat}
              </p>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={hapus}
                disabled={!siap}
                className="min-h-[48px] flex-1 rounded-pill bg-danger text-[14px] font-semibold text-ink-invert disabled:opacity-40"
              >
                {memproses ? "Menghapus…" : "Hapus akun saya"}
              </button>
              <button
                type="button"
                onClick={tutup}
                disabled={memproses}
                className="min-h-[48px] flex-1 rounded-pill bg-surface-warm text-[14px] font-semibold text-ink disabled:opacity-40"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
