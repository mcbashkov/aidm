"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloudOff, Sparkles, MessageSquarePlus } from "lucide-react";
import { MicButton } from "@/components/catat/mic-button";
import { EntryCard } from "@/components/catat/entry-card";
import { TransactionSheet } from "@/components/transaksi/transaction-sheet";
import { catatChips, type EarnerType } from "@/lib/earner";
import { parseFallback } from "@/lib/parse/fallback";
import { MOCK_ANCHOR } from "@/lib/mock/finance";
import type { Transaction } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/** Satu gelembung percakapan di tab Catat. */
type Bubble =
  | { kind: "user"; id: string; text: string }
  | { kind: "entry"; id: string; tx: Transaction; antre: boolean }
  | { kind: "agent"; id: string; text: string };

let counter = 0;
const nextId = () => `b${++counter}`;

interface CatatViewProps {
  earnerType?: EarnerType;
}

/**
 * Tab Catat (§7.2 / §13 layar 3) — pembalikan dari tab Riset lama: pengguna
 * memberi tahu, agen mencatat.
 *
 * SEMENTARA: entri dibuat oleh parser aturan di klien (§7.2 fallback) dan
 * disimpan di state, belum ke `transactions`. Bentuk datanya sudah sama dengan
 * kontrak API §11 supaya penggantian ke POST /api/catat tidak menyentuh UI.
 */
export function CatatView({ earnerType = "dagang" }: CatatViewProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [interim, setInterim] = useState("");
  const [offline, setOffline] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bubbles]);

  const kirim = useCallback(
    (teks: string) => {
      const text = teks.trim();
      if (!text) return;

      const hasil = parseFallback(text, {
        today: MOCK_ANCHOR,
        earner: earnerType,
      });
      const antre = offline;
      const baru: Bubble[] = [{ kind: "user", id: nextId(), text }];

      for (const e of hasil.entries) {
        // Entri tanpa nominal berstatus draft sampai pertanyaan terjawab
        // (§7.2 alur #6) — tetap disimpan, tidak dibuang.
        baru.push({
          kind: "entry",
          id: nextId(),
          antre,
          tx: {
            id: `tx-${nextId()}`,
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

      setBubbles((prev) => [...prev, ...baru]);
      setDraft("");
      setInterim("");
    },
    [earnerType, offline],
  );

  function simpanEdit(tx: Transaction) {
    setBubbles((prev) =>
      prev.map((b) =>
        b.kind === "entry" && b.tx.id === tx.id ? { ...b, tx } : b,
      ),
    );
  }

  function hapus(id: string) {
    setBubbles((prev) =>
      prev.filter((b) => !(b.kind === "entry" && b.tx.id === id)),
    );
  }

  const kosong = bubbles.length === 0;

  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
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
          className="mb-4 rounded-card bg-gold-tint px-5 py-3 text-[12px] leading-relaxed text-ink-muted"
        >
          Kamu sedang offline. Catatan tetap tersimpan di perangkat dan
          dikirim otomatis begitu internet kembali.
        </div>
      ) : null}

      {/* Percakapan */}
      <div className="flex-1 space-y-3">
        {kosong ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-tint">
              <MessageSquarePlus className="h-6 w-6 text-gold-deep" aria-hidden />
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
          bubbles.map((b) => {
            if (b.kind === "user") {
              return (
                <div key={b.id} className="flex justify-end">
                  <p className="max-w-[85%] animate-fade-up rounded-card rounded-br-lg bg-cta px-4 py-2.5 text-[14px] leading-relaxed text-ink-invert">
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
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Chip saran kontekstual (§7.2 alur #7) */}
      <div className="sticky bottom-0 -mx-4 mt-4 bg-bg px-4 pb-2 pt-3 md:-mx-6 md:px-6">
        <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">
            <Sparkles className="h-3 w-3" aria-hidden />
            Contoh
          </span>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => kirim(c)}
              className="chip whitespace-nowrap"
            >
              {c}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            kirim(draft);
          }}
          className="flex items-center gap-2 rounded-pill bg-surface p-1.5 pl-5 shadow-card transition-shadow focus-within:shadow-float"
        >
          <input
            value={interim || draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setInterim("");
            }}
            placeholder="Ketik atau ucapkan transaksimu…"
            aria-label="Catat transaksi"
            className={cn(
              "min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-subtle",
              interim && "italic text-ink-muted",
            )}
          />
          <MicButton onTranscript={kirim} onInterim={setInterim} />
          <button
            type="submit"
            aria-label="Catat"
            disabled={draft.trim().length === 0}
            className="btn-send"
          >
            <MessageSquarePlus className="h-5 w-5" aria-hidden />
          </button>
        </form>
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
