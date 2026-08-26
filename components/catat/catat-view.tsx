"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, CloudOff, MessageSquarePlus } from "lucide-react";
import { MicButton } from "@/components/catat/mic-button";
import { EntryCard } from "@/components/catat/entry-card";
import { TransactionSheet } from "@/components/transaksi/transaction-sheet";
import { useMe } from "@/components/providers/me-provider";
import { catatChips, type EarnerType } from "@/lib/earner";
import { parseFallback, bacaNominalJawaban } from "@/lib/parse/fallback";
import {
  kirimCatat,
  konfirmasiDraft,
  ubahTransaksi,
  hapusTransaksi,
  hidrasiCatat,
  type BarisCatat,
} from "@/lib/catat/client";
import {
  useKueri,
  useBatalkanKueri,
} from "@/components/providers/kueri-provider";
import { BelumTersinkron } from "@/components/ui/belum-tersinkron";
import { Skeleton } from "@/components/ui/skeleton";
import {
  tambahAntrean,
  bacaAntrean,
  hapusAntrean,
} from "@/lib/offline/antrean";
import type { Transaction } from "@/lib/transactions";
import { cn } from "@/lib/utils";
import { todayWib } from "@/lib/wib";

/** Satu gelembung percakapan di tab Catat. `qid` mengikat kartu pratinjau
 *  offline ke item antrean IndexedDB-nya. */
type Bubble =
  | { kind: "user"; id: string; text: string }
  | { kind: "entry"; id: string; tx: Transaction; antre: boolean; qid?: string }
  | { kind: "agent"; id: string; text: string };

let counter = 0;
const nextId = () => `b${++counter}`;

/**
 * Bangun ulang thread dari transaksi hari ini.
 *
 * Yang bisa dipulihkan: kalimat asli pengguna (`raw_input`) dan kartu entri.
 * Yang TIDAK: balasan agen — dan itu memang tidak dikarang di sini. Balasan di
 * jalur gratis hanyalah copy tetap yang tidak membawa informasi, jadi
 * menuliskannya kembali seolah agen pernah mengatakannya adalah memalsukan
 * percakapan. Draft tetap terbaca sebagai pertanyaan yang menunggu, karena
 * `EntryCard` sendiri yang menampilkan "Menunggu nominal…" — keterangannya
 * datang dari keadaan barisnya, bukan dari kalimat yang kita reka.
 *
 * Satu kalimat yang melahirkan beberapa entri tampil sebagai satu gelembung
 * diikuti beberapa kartu berurutan. Itu pengelompokan yang NYATA: baris-baris
 * itu memang berbagi `raw_input` yang sama karena lahir dari satu permintaan.
 */
function threadDariServer(items: BarisCatat[]): Bubble[] {
  const keluar: Bubble[] = [];
  let kalimatSebelumnya: string | null = null;
  for (const it of items) {
    const teks = it.rawInput?.trim();
    if (teks && teks !== kalimatSebelumnya) {
      keluar.push({ kind: "user", id: nextId(), text: teks });
    }
    kalimatSebelumnya = teks ?? null;
    keluar.push({ kind: "entry", id: nextId(), tx: it, antre: false });
  }
  return keluar;
}

/** Entri lokal (demo/offline) memakai id ber-prefiks — TIDAK boleh dikirim
 *  ke PATCH/DELETE server. */
const isLokalId = (id: string) => id.startsWith("local-");

/** Tinggi maksimum kolom input sebelum isinya menggulir sendiri (§5). */
const INPUT_MAX_H = 120;
/** Ambang deteksi keyboard: selisih sekecil ini masih toolbar browser. */
const KEYBOARD_MIN_H = 80;
/** Breakpoint desktop — sama dengan `lg:` di seluruh shell aplikasi. */
const DESKTOP_MQ = "(min-width: 1024px)";

/**
 * Bottom-nav disembunyikan saat keyboard terbuka supaya komposer bisa
 * menempel tepat di atas keyboard. Aturannya dirender bersama layar Catat
 * (bukan di globals.css) agar efeknya benar-benar terbatas di layar ini.
 * Nav top-bar ikut cocok dengan selektor ini, tapi tidak masalah: aturannya
 * dibatasi <1024px, di mana top-bar memang sudah tersembunyi.
 */
const KEYBOARD_CSS =
  '@media (max-width:1023.98px){html[data-catat-keyboard="open"] nav[aria-label="Navigasi utama"]{display:none}}';

interface CatatViewProps {
  earnerType?: EarnerType;
}

/**
 * Tab Catat (§7.2 / §13 layar 3) — pembalikan dari tab Riset lama: pengguna
 * memberi tahu, agen mencatat.
 *
 * Tata letak mengikuti pola komposer AI: kolom setinggi viewport dengan area
 * pesan yang menggulir sendiri, dan komposer yang menempel di bawah — di
 * mobile `fixed` tepat di atas bottom-nav (atau di atas keyboard saat terbuka),
 * di desktop ikut lebar kolom konten.
 *
 * Jalur data (§9.2): online → POST /api/catat (LLM + fallback server-side);
 * offline → antrean IndexedDB + pratinjau parser lokal, sinkron otomatis;
 * server belum dikonfigurasi (401/501) → mode demo dengan parser lokal.
 */
export function CatatView({ earnerType: earnerProp = "dagang" }: CatatViewProps) {
  const me = useMe();
  // Chip & parser lokal mengikuti peran dari profil begitu /api/me termuat.
  const earnerType = (me?.user?.earner_type as EarnerType) ?? earnerProp;

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [interim, setInterim] = useState("");
  const [offline, setOffline] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  /** id draft server yang sedang menunggu jawaban nominal (§7.2 alur #6). */
  const pendingDraftRef = useRef<string | null>(null);
  /** true setelah server menjawab 401/501 — jalur demo lokal, hemat bolak-balik. */
  const demoRef = useRef(false);
  const sedangSinkronRef = useRef(false);

  /**
   * Thread hari ini dari server. Inilah yang membuat tab Catat bertahan: dulu
   * `bubbles` hanya `useState([])`, jadi berpindah tab meng-unmount komponen
   * dan seluruh percakapan lenyap — lalu layar menampilkan "Belum ada catatan
   * hari ini" untuk hari yang jelas-jelas sudah ada catatannya. Kalimat itu
   * bukan kesimpulan yang salah; ia keadaan awal yang dipajang sebagai fakta,
   * kelas bug P0-1 yang sama.
   */
  const hidrasi = useKueri<{ items: BarisCatat[] }>(
    "catat:hari-ini",
    hidrasiCatat,
  );
  const batalkanKueri = useBatalkanKueri();
  const sudahHidrasi = useRef(false);

  /**
   * Buang cache yang menjadi basi karena tulisan barusan. Tanpa ini, mencatat
   * lalu pindah ke Beranda akan menampilkan total LAMA dari cache — dan angka
   * uang yang tertinggal satu langkah lebih buruk daripada angka yang datang
   * sedetik lebih lambat.
   */
  const segarkanSetelahTulis = useCallback(() => {
    batalkanKueri("catat:hari-ini");
    batalkanKueri("beranda:ringkas");
  }, [batalkanKueri]);

  const rootRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** Hasil ukur tata letak; 0 = belum terukur (render pertama / SSR). */
  const [metrics, setMetrics] = useState({
    columnH: 0,
    composerH: 0,
    bottom: 0,
    keyboard: false,
    desktop: false,
  });
  const [fade, setFade] = useState({ left: false, right: false });

  const chips = catatChips(earnerType);

  // Status koneksi dibaca setelah mount — `navigator` tidak ada di server.
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  /**
   * Ukur ruang yang tersedia untuk kolom chat. Semua angka DIUKUR, bukan
   * dihardcode, supaya aman terhadap safe-area, tinggi bottom-nav, dan
   * padding `main` yang berbeda per breakpoint.
   *
   * Keyboard dideteksi lewat visualViewport: `innerHeight` (layout viewport)
   * tidak menyusut saat keyboard muncul, jadi selisihnya = tinggi keyboard.
   */
  useEffect(() => {
    function measure() {
      const root = rootRef.current;
      if (!root) return;

      const vv = window.visualViewport;
      const innerH = window.innerHeight;
      const keyboardH = vv
        ? Math.max(0, innerH - vv.height - vv.offsetTop)
        : 0;
      const keyboard = keyboardH > KEYBOARD_MIN_H;
      const desktop = window.matchMedia(DESKTOP_MQ).matches;

      // Ruang terpakai di bawah kolom chat.
      let reserved: number;
      if (desktop) {
        // Padding bawah <main>; komposer ikut arus di dalam kolom.
        const main = root.parentElement;
        reserved = main
          ? parseFloat(getComputedStyle(main).paddingBottom) || 0
          : 0;
      } else if (keyboard) {
        reserved = keyboardH;
      } else {
        // Bottom-nav. Nav top-bar punya aria-label sama tapi induknya
        // `display:none` di mobile, jadi tingginya 0 — ambil yang terbesar.
        const navs = Array.from(
          document.querySelectorAll<HTMLElement>(
            'nav[aria-label="Navigasi utama"]',
          ),
        );
        reserved = navs.reduce(
          (max, n) => Math.max(max, n.getBoundingClientRect().height),
          0,
        );
      }

      const top = root.getBoundingClientRect().top;
      const columnH = Math.max(240, Math.round(innerH - reserved - top));
      const composerH = Math.round(
        composerRef.current?.getBoundingClientRect().height ?? 0,
      );

      setMetrics((prev) =>
        prev.columnH === columnH &&
        prev.composerH === composerH &&
        prev.bottom === reserved &&
        prev.keyboard === keyboard &&
        prev.desktop === desktop
          ? prev
          : { columnH, composerH, bottom: reserved, keyboard, desktop },
      );
    }

    measure();

    const vv = window.visualViewport;
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    vv?.addEventListener("resize", measure);
    vv?.addEventListener("scroll", measure);

    // Komposer berubah tinggi saat input auto-grow / chip membungkus.
    const ro = new ResizeObserver(measure);
    if (composerRef.current) ro.observe(composerRef.current);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      vv?.removeEventListener("resize", measure);
      vv?.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, []);

  /**
   * Tandai keyboard terbuka di <html> supaya bottom-nav bisa disembunyikan
   * (aturannya ikut dirender komponen ini — lihat <style> di bawah).
   */
  useEffect(() => {
    const el = document.documentElement;
    if (metrics.keyboard) el.dataset.catatKeyboard = "open";
    else delete el.dataset.catatKeyboard;
    return () => {
      delete el.dataset.catatKeyboard;
    };
  }, [metrics.keyboard]);

  /** Fade di tepi baris chip — petunjuk masih ada chip lain (§3). */
  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const sync = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setFade({
        left: scrollLeft > 4,
        right: Math.ceil(scrollLeft + clientWidth) < scrollWidth - 4,
      });
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [chips]);

  /** Kolom input tumbuh mengikuti isi, lalu menggulir di dalam (§5). */
  const autoGrow = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_H)}px`;
  }, []);

  useEffect(() => {
    autoGrow();
  }, [draft, interim, autoGrow]);

  // Pesan terbaru selalu terlihat — gulir area pesan, bukan halaman.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [bubbles]);

  /** Pratinjau lokal via parser fallback — jalur demo & offline. */
  const parseLokal = useCallback(
    (text: string, antre: boolean, qid?: string): Bubble[] => {
      const hasil = parseFallback(text, {
        today: todayWib(),
        earner: earnerType,
      });
      const baru: Bubble[] = [];
      for (const e of hasil.entries) {
        baru.push({
          kind: "entry",
          id: nextId(),
          antre,
          qid,
          tx: {
            id: `local-${nextId()}`,
            jenis: e.jenis,
            amount: e.amount ?? 0,
            kategori: e.kategori,
            paymentMethod: e.paymentMethod,
            catatan: e.catatan,
            occurredAt: `${e.occurredAt}T12:00:00+07:00`,
            source: "chat",
            parsedBy: "fallback",
            status: e.amount === null ? "draft" : "confirmed",
          },
        });
      }
      if (hasil.pertanyaan) {
        baru.push({ kind: "agent", id: nextId(), text: hasil.pertanyaan });
      }
      if (hasil.tidakDikenali) {
        baru.push({ kind: "agent", id: nextId(), text: hasil.tidakDikenali });
      }
      return baru;
    },
    [earnerType],
  );

  /** Simpan teks ke antrean IndexedDB + tampilkan pratinjau "menunggu sinkron". */
  const antrekan = useCallback(
    async (text: string, source: "chat" | "voice") => {
      const item = await tambahAntrean(text, source);
      setBubbles((prev) => [...prev, ...parseLokal(text, true, item?.id)]);
    },
    [parseLokal],
  );

  const kirim = useCallback(
    (teks: string, source: "chat" | "voice" = "chat") => {
      const text = teks.trim();
      if (!text) return;

      setBubbles((prev) => [...prev, { kind: "user", id: nextId(), text }]);
      setDraft("");
      setInterim("");

      void (async () => {
        // Offline → antre di IndexedDB, kirim ulang saat online (§7.2 #6).
        if (offline || !navigator.onLine) {
          await antrekan(text, source);
          return;
        }
        // Mode demo (server belum dikonfigurasi) → parser lokal.
        if (demoRef.current) {
          setBubbles((prev) => [...prev, ...parseLokal(text, false)]);
          return;
        }

        // Sedang ada draft menunggu nominal & teks ini terbaca sebagai angka
        // → jawaban klarifikasi, bukan catatan baru (§7.2 alur #6).
        const draftId = pendingDraftRef.current;
        if (draftId && bacaNominalJawaban(text) !== null) {
          const res = await konfirmasiDraft(draftId, text);
          if (res.ok && res.data.ok && res.data.entry) {
            const entry = res.data.entry;
            pendingDraftRef.current = null;
            segarkanSetelahTulis();
            setBubbles((prev) =>
              prev.map((b) =>
                b.kind === "entry" && b.tx.id === entry.id
                  ? { ...b, tx: entry }
                  : b,
              ),
            );
            return;
          }
          if (res.ok && !res.data.ok) {
            setBubbles((prev) => [
              ...prev,
              {
                kind: "agent",
                id: nextId(),
                text:
                  res.data.pertanyaan ??
                  "Aku masih belum menangkap angkanya — coba tulis nominalnya saja.",
              },
            ]);
            return;
          }
          // Gagal jaringan/server: JANGAN jatuh ke alur catat biasa — angka
          // telanjang akan terbaca sebagai transaksi BARU (catatan ganda).
          setBubbles((prev) => [
            ...prev,
            {
              kind: "agent",
              id: nextId(),
              text: "Jawabanmu belum sampai ke server. Coba kirim angkanya sekali lagi ya.",
            },
          ]);
          return;
        }

        const res = await kirimCatat(text, source);
        if (res.ok) {
          const { entries, pertanyaan, tidak_dikenali } = res.data;
          const baru: Bubble[] = entries.map((tx) => ({
            kind: "entry" as const,
            id: nextId(),
            antre: false,
            tx,
          }));
          const draftBaru = entries.find((t) => t.status === "draft");
          if (pertanyaan && draftBaru) {
            pendingDraftRef.current = draftBaru.id;
            baru.push({ kind: "agent", id: nextId(), text: pertanyaan });
          }
          if (tidak_dikenali) {
            baru.push({ kind: "agent", id: nextId(), text: tidak_dikenali });
          }
          setBubbles((prev) => [...prev, ...baru]);
          segarkanSetelahTulis();
          return;
        }
        if (res.offline) {
          setOffline(true);
          await antrekan(text, source);
          return;
        }
        if (res.demo) {
          demoRef.current = true;
          setBubbles((prev) => [...prev, ...parseLokal(text, false)]);
          return;
        }
        // 429 / 500 — beri tahu apa adanya, jangan diam.
        setBubbles((prev) => [
          ...prev,
          { kind: "agent", id: nextId(), text: res.error },
        ]);
      })();
    },
    [offline, antrekan, parseLokal, segarkanSetelahTulis],
  );

  /**
   * Seed thread SEKALI per mount. Revalidasi berikutnya (fokus/online) tidak
   * boleh menyemai ulang — gelembung yang ditambahkan sesi ini akan
   * terduplikasi. Yang sudah tampil di layar adalah kebenaran yang lebih baru
   * daripada salinan server mana pun.
   */
  useEffect(() => {
    if (sudahHidrasi.current) return;
    if (hidrasi.keadaan !== "terbaca") return;
    sudahHidrasi.current = true;

    const awal = threadDariServer(hidrasi.data.items);
    if (awal.length === 0) return;
    // Disisipkan DI DEPAN: gelembung lokal yang sempat lahir sebelum hidrasi
    // selesai memang terjadi belakangan.
    setBubbles((prev) => [...awal, ...prev]);

    // Draft terakhir yang belum berjawab kembali menunggu, supaya mengetik
    // angka telanjang tetap terbaca sebagai jawaban — bukan transaksi baru.
    const draftMenunggu = [...hidrasi.data.items]
      .reverse()
      .find((t) => t.status === "draft");
    if (draftMenunggu) pendingDraftRef.current = draftMenunggu.id;
  }, [hidrasi]);

  /**
   * Sinkron antrean offline: saat mount, saat kembali online, dan tiap 20
   * detik selagi online (AC §7.2: tersinkron ≤30 dtk setelah online).
   */
  useEffect(() => {
    let hidup = true;

    async function drain() {
      if (!hidup || sedangSinkronRef.current) return;
      if (!navigator.onLine || demoRef.current) return;
      sedangSinkronRef.current = true;
      try {
        const items = await bacaAntrean();
        for (const it of items) {
          if (!hidup) break;
          const res = await kirimCatat(it.text, it.source);
          if (res.ok) {
            await hapusAntrean(it.id);
            segarkanSetelahTulis();
            const serverEntries = res.data.entries;
            setBubbles((prev) => {
              // Kartu pratinjau qid ini ditukar dengan entri server.
              const keluar: Bubble[] = [];
              let sudahTukar = false;
              for (const b of prev) {
                if (b.kind === "entry" && b.qid === it.id) {
                  if (!sudahTukar) {
                    sudahTukar = true;
                    keluar.push(
                      ...serverEntries.map((tx) => ({
                        kind: "entry" as const,
                        id: nextId(),
                        antre: false,
                        tx,
                      })),
                    );
                  }
                } else {
                  keluar.push(b);
                }
              }
              return keluar;
            });
          } else if (res.demo) {
            demoRef.current = true;
            break;
          } else if (res.offline || res.status === 429) {
            break; // coba lagi nanti — item TIDAK dibuang
          } else {
            // 4xx permanen (teks kosong dsb.) — buang agar antrean tak macet.
            await hapusAntrean(it.id);
          }
        }
      } finally {
        sedangSinkronRef.current = false;
      }
    }

    void drain();
    const onOnline = () => void drain();
    window.addEventListener("online", onOnline);
    const timer = setInterval(() => void drain(), 20_000);
    return () => {
      hidup = false;
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
    };
  }, [segarkanSetelahTulis]);

  function simpanEdit(tx: Transaction) {
    // Optimistic: kartu diperbarui dulu, server menyusul.
    setBubbles((prev) =>
      prev.map((b) =>
        b.kind === "entry" && b.tx.id === tx.id ? { ...b, tx } : b,
      ),
    );
    if (isLokalId(tx.id) || demoRef.current) return;
    void ubahTransaksi(tx.id, {
      jenis: tx.jenis,
      amount: tx.amount,
      kategori: tx.kategori,
      payment_method: tx.paymentMethod,
      occurred_at: tx.occurredAt,
      catatan: tx.catatan ?? null,
    }).then((res) => {
      if (res.ok) {
        segarkanSetelahTulis();
        if (pendingDraftRef.current === tx.id) pendingDraftRef.current = null;
        setBubbles((prev) =>
          prev.map((b) =>
            b.kind === "entry" && b.tx.id === tx.id
              ? { ...b, tx: res.data.entry }
              : b,
          ),
        );
      } else if (!res.demo) {
        setBubbles((prev) => [
          ...prev,
          {
            kind: "agent",
            id: nextId(),
            text: `Perubahan belum tersimpan ke server: ${res.error}`,
          },
        ]);
      }
    });
  }

  function hapus(id: string) {
    setBubbles((prev) =>
      prev.filter((b) => !(b.kind === "entry" && b.tx.id === id)),
    );
    if (pendingDraftRef.current === id) pendingDraftRef.current = null;
    if (isLokalId(id) || demoRef.current) return;
    void hapusTransaksi(id).then((res) => {
      if (res.ok) segarkanSetelahTulis();
      if (!res.ok && !res.demo && res.status !== 404) {
        setBubbles((prev) => [
          ...prev,
          {
            kind: "agent",
            id: nextId(),
            text: `Gagal menghapus di server: ${res.error}`,
          },
        ]);
      }
    });
  }

  /**
   * Enter mengirim di desktop, Shift+Enter baris baru. Di mobile Enter =
   * baris baru (kirim lewat tombol) — keyboard virtual tidak punya Shift
   * yang nyaman dijangkau.
   */
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;
    // Jangan potong konfirmasi IME (mis. papan ketik prediktif).
    if ((e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) {
      return;
    }
    if (!metrics.desktop) return;
    e.preventDefault();
    kirim(draft);
  }

  /**
   * Tiga keadaan, bukan dua (lib/api/keadaan.ts). "Belum ada catatan hari ini"
   * adalah pernyataan tentang catatan pengguna, dan ia hanya boleh diucapkan
   * SETELAH server menjawab dan jawabannya memang kosong. Sebelum itu:
   * skeleton. Kalau pembacaannya gagal: katakan gagal — jangan pernah
   * memetakannya jadi "kamu belum mencatat apa pun".
   */
  const adaIsi = bubbles.length > 0;
  const memuatThread = !adaIsi && hidrasi.keadaan === "memuat";
  const gagalThread = !adaIsi && hidrasi.keadaan === "gagal";
  const kosong = !adaIsi && hidrasi.keadaan === "terbaca";
  const adaTeks = draft.trim().length > 0;

  return (
    <div
      ref={rootRef}
      // -mb-28 menetralkan padding bawah <main> yang disediakan untuk
      // bottom-nav: di layar ini komposer sendiri yang mengelola ruang bawah,
      // dan sisa padding akan membuat halaman ikut menggulir.
      className="-mb-28 flex flex-col lg:mb-0"
      style={metrics.columnH ? { height: metrics.columnH } : undefined}
    >
      {/* Aturan lokal layar Catat: sembunyikan bottom-nav saat keyboard
          terbuka supaya komposer bisa menempel tepat di atas keyboard.
          Hidup-mati bersama layar ini — tidak menyentuh komponen nav.
          `dangerouslySetInnerHTML` dipakai supaya tanda kutip di selektor
          tidak di-escape berbeda antara server dan klien (hydration mismatch). */}
      <style dangerouslySetInnerHTML={{ __html: KEYBOARD_CSS }} />

      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h1>Catat</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            Ceritakan saja — nanti aku yang rapikan.
          </p>
        </div>
        {offline ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-surface-warm px-3 py-1.5 text-[12px] font-semibold text-ink-muted">
            <CloudOff className="h-3.5 w-3.5" aria-hidden />
            Offline
          </span>
        ) : null}
      </div>

      {offline ? (
        <div
          role="status"
          className="mb-4 shrink-0 rounded-card bg-gold-tint px-5 py-3 text-[12px] leading-relaxed text-ink-muted"
        >
          Kamu sedang offline. Catatan tetap tersimpan di perangkat dan dikirim
          otomatis begitu internet kembali.
        </div>
      ) : null}

      {/* Area pesan — menggulir sendiri, isi tumbuh dari bawah ke atas. */}
      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* `mt-auto` (bukan justify-end) supaya pesan paling atas tetap
            terjangkau saat isinya lebih tinggi dari area gulir. */}
        <div className="flex min-h-full flex-col">
          <div
            className={cn(
              "space-y-3",
              kosong || memuatThread || gagalThread ? "m-auto" : "mt-auto",
            )}
          >
            {memuatThread ? (
              <div className="space-y-3" aria-label="Memuat catatan hari ini">
                <Skeleton className="ml-auto h-9 w-2/3 rounded-card" />
                <Skeleton className="h-[86px] w-full rounded-card" />
                <Skeleton className="ml-auto h-9 w-1/2 rounded-card" />
              </div>
            ) : gagalThread ? (
              <div className="card flex flex-col items-center gap-2 p-8 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-warm">
                  <CloudOff className="h-6 w-6 text-ink-muted" aria-hidden />
                </span>
                <h2 className="mt-1">Catatan hari ini belum bisa dimuat</h2>
                <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted">
                  Catatanmu aman tersimpan. Kamu tetap bisa mencatat sekarang —
                  yang kamu tulis akan tersimpan begitu sambungan pulih.
                </p>
                <button
                  type="button"
                  onClick={hidrasi.muatUlang}
                  className="btn-primary mt-2 max-w-[220px]"
                >
                  Coba lagi
                </button>
              </div>
            ) : kosong ? (
              <div className="card flex flex-col items-center gap-2 p-8 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-tint">
                  <MessageSquarePlus
                    className="h-6 w-6 text-gold-deep"
                    aria-hidden
                  />
                </span>
                <h2 className="mt-1">Belum ada catatan hari ini</h2>
                <p className="max-w-xs text-[14px] leading-relaxed text-ink-muted">
                  Tulis atau ucapkan apa yang terjadi — misalnya{" "}
                  <span className="text-ink">
                    &ldquo;jual 3 nasi goreng 45rb bayar QRIS&rdquo;
                  </span>
                  . Mencatat selalu gratis.
                </p>
              </div>
            ) : (
              <>
              {hidrasi.keadaan === "terbaca" && !hidrasi.tersinkron ? (
                <div className="flex justify-center">
                  <BelumTersinkron />
                </div>
              ) : null}
              {bubbles.map((b) => {
                if (b.kind === "user") {
                  return (
                    <div key={b.id} className="flex justify-end">
                      <p className="max-w-[85%] animate-fade-up whitespace-pre-wrap rounded-card rounded-br-lg bg-cta px-4 py-2.5 text-[14px] leading-relaxed text-ink-invert">
                        {b.text}
                      </p>
                    </div>
                  );
                }
                if (b.kind === "agent") {
                  return (
                    <p
                      key={b.id}
                      className="max-w-[85%] animate-fade-up rounded-card rounded-bl-lg bg-surface-warm px-4 py-2.5 text-[14px] leading-relaxed text-ink"
                    >
                      {b.text}
                    </p>
                  );
                }
                return (
                  <EntryCard
                    key={b.id}
                    tx={b.tx}
                    antre={b.antre}
                    onEdit={setEditing}
                  />
                );
              })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Penahan ruang untuk komposer yang `fixed` di mobile. */}
      <div
        aria-hidden
        className="shrink-0 lg:hidden"
        style={{ height: metrics.composerH }}
      />

      {/* Komposer: mobile menempel di atas bottom-nav / keyboard; desktop ikut
          arus sebagai anak terakhir kolom, jadi lebarnya = lebar konten. */}
      <div
        ref={composerRef}
        className="fixed inset-x-0 z-30 bg-bg lg:static lg:z-auto"
        style={
          metrics.desktop ? undefined : { bottom: `${metrics.bottom}px` }
        }
      >
        <div className="mx-auto w-full max-w-2xl px-4 pb-2 pt-2 lg:max-w-none lg:px-0 lg:pb-0 lg:pt-3">
          {/* Chip contoh (§7.2 alur #7) — gulir penuh, tanpa label. */}
          <div className="relative -mx-4 lg:mx-0">
            <div
              ref={chipsRef}
              className="no-scrollbar flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 lg:scroll-px-0 lg:px-0"
            >
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => kirim(c)}
                  className="chip shrink-0 snap-start whitespace-nowrap"
                >
                  {c}
                </button>
              ))}
              {/* Jaga jarak chip terakhir dari tepi (padding-right pada
                  kontainer gulir tidak konsisten di semua mesin render). */}
              <span aria-hidden className="w-2 shrink-0" />
            </div>
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-bg to-transparent transition-opacity duration-200",
                fade.left ? "opacity-100" : "opacity-0",
              )}
            />
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent transition-opacity duration-200",
                fade.right ? "opacity-100" : "opacity-0",
              )}
            />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              kirim(draft);
            }}
            // Radius 27px = setengah tinggi saat satu baris, jadi bentuknya
            // pill penuh saat diam. Sengaja TIDAK memakai rounded-pill: pada
            // tinggi maksimum (120px) lengkung stadion menutupi baris pertama
            // dan terakhir teks.
            className="flex items-end gap-2 rounded-[27px] border border-line bg-surface p-1 pl-4 shadow-card transition-shadow focus-within:ring-2 focus-within:ring-gold focus-within:shadow-float"
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={interim || draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setInterim("");
              }}
              onKeyDown={onKeyDown}
              placeholder="Ketik atau ucapkan transaksimu…"
              aria-label="Catat transaksi"
              className={cn(
                // Cincin fokus dipindah ke kapsul pembungkus (focus-within):
                // outline global menggambar persegi di DALAM pill.
                "min-w-0 flex-1 resize-none self-center bg-transparent py-2.5 text-[15px] leading-6 text-ink outline-none placeholder:text-ink-subtle focus-visible:outline-none",
                interim && "italic text-ink-muted",
              )}
              style={{ maxHeight: INPUT_MAX_H }}
            />
            {adaTeks ? (
              <button
                type="submit"
                aria-label="Catat"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cta text-ink-invert transition-colors hover:bg-gold hover:text-cta"
              >
                <ArrowUp className="h-5 w-5" aria-hidden />
              </button>
            ) : (
              <MicButton
                onTranscript={(t) => kirim(t, "voice")}
                onInterim={setInterim}
              />
            )}
          </form>
        </div>
      </div>

      <TransactionSheet
        transaction={editing}
        onClose={() => setEditing(null)}
        onSave={simpanEdit}
        onDelete={hapus}
      />
    </div>
  );
}
