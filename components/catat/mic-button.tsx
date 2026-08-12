"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bentuk minimal Web Speech API — belum ada di lib.dom TypeScript. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  resultIndex: number;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface MicButtonProps {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  disabled?: boolean;
}

/**
 * Input suara on-device via Web Speech API (§9.1 — gratis, tanpa biaya server).
 * Tombol DISEMBUNYIKAN saat browser tidak mendukung, bukan ditampilkan mati:
 * kontrol yang terlihat tapi tak pernah bekerja lebih membingungkan daripada
 * kontrol yang tidak ada.
 */
export function MicButton({
  onTranscript,
  onInterim,
  disabled,
}: MicButtonProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  // Deteksi dilakukan setelah mount: `window` tidak ada saat render server,
  // dan menebaknya akan membuat markup server dan klien berbeda.
  useEffect(() => {
    setSupported(getSpeechRecognition() !== null);
    return () => recRef.current?.stop();
  }, []);

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = "id-ID";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alt = e.results[i][0];
        if (e.results[i].isFinal) final += alt.transcript;
        else interim += alt.transcript;
      }
      if (interim && onInterim) onInterim(interim);
      if (final.trim()) onTranscript(final.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? "Berhenti merekam" : "Catat dengan suara"}
      aria-pressed={listening}
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors",
        listening
          ? "bg-danger text-ink-invert"
          : "bg-surface-warm text-ink-muted hover:bg-gold-tint hover:text-gold-deep",
        disabled && "opacity-50",
      )}
    >
      {listening ? (
        <Square className="h-4 w-4 fill-current" aria-hidden />
      ) : (
        <Mic className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
