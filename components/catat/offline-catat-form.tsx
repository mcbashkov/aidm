"use client";

import { useEffect, useState } from "react";
import { Check, CloudOff, MessageSquarePlus } from "lucide-react";

const ANTREAN_KEY = "aidm:antrean-catat";

interface Antre {
  text: string;
  createdAt: string;
}

function bacaAntrean(): Antre[] {
  try {
    const raw = localStorage.getItem(ANTREAN_KEY);
    return raw ? (JSON.parse(raw) as Antre[]) : [];
  } catch {
    return [];
  }
}

/**
 * Form catat offline (§9.5: "offline page wajib memuat form catat offline,
 * bukan hanya riwayat — ini fitur, bukan sekadar degradasi").
 *
 * SEMENTARA antrean disimpan di localStorage; produksi memakai IndexedDB +
 * background sync (§9.1). Kontrak datanya sengaja sederhana — teks mentah dan
 * waktu — supaya sinkronisasi nanti tinggal mengirimnya ke POST /api/catat.
 */
export function OfflineCatatForm() {
  const [text, setText] = useState("");
  const [antrean, setAntrean] = useState<Antre[]>([]);
  const [baruSaja, setBaruSaja] = useState(false);

  useEffect(() => {
    setAntrean(bacaAntrean());
  }, []);

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    const isi = text.trim();
    if (!isi) return;
    const next = [
      ...bacaAntrean(),
      { text: isi, createdAt: new Date().toISOString() },
    ];
    try {
      localStorage.setItem(ANTREAN_KEY, JSON.stringify(next));
    } catch {
      // penyimpanan penuh / mode privat — beri tahu lewat UI, jangan diam
      return;
    }
    setAntrean(next);
    setText("");
    setBaruSaja(true);
    setTimeout(() => setBaruSaja(false), 2500);
  }

  return (
    <div className="w-full max-w-sm space-y-3 text-left">
      <form
        onSubmit={simpan}
        className="flex items-center gap-2 rounded-pill bg-surface p-1.5 pl-5 shadow-card"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Catat sekarang, kirim nanti…"
          aria-label="Catat transaksi offline"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-subtle"
        />
        <button
          type="submit"
          aria-label="Simpan ke antrean"
          disabled={text.trim().length === 0}
          className="btn-send"
        >
          <MessageSquarePlus className="h-5 w-5" aria-hidden />
        </button>
      </form>

      {baruSaja ? (
        <p
          role="status"
          className="flex items-center justify-center gap-1.5 text-[12px] font-semibold text-success"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Tersimpan di perangkat
        </p>
      ) : null}

      {antrean.length > 0 ? (
        <div className="card-warm space-y-2 p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
            <CloudOff className="h-3.5 w-3.5" aria-hidden />
            {antrean.length} catatan menunggu sinkron
          </p>
          <ul className="space-y-1">
            {antrean.slice(-3).map((a) => (
              <li key={a.createdAt} className="truncate text-[12px] text-ink-muted">
                {a.text}
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-ink-subtle">
            Terkirim otomatis begitu internet kembali.
          </p>
        </div>
      ) : null}
    </div>
  );
}
