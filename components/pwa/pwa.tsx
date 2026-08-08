"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Registrasi service worker + prompt "Pasang" kontekstual (muncul setelah
 * aktivitas ke-2, bukan kunjungan pertama — §9.5).
 */
export function Pwa() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      const visits =
        Number(localStorage.getItem("aidm_visits") ?? "0") + 1;
      localStorage.setItem("aidm_visits", String(visits));
      const dismissed =
        localStorage.getItem("aidm_install_dismissed") === "1";
      setDeferred(e as BeforeInstallPromptEvent);
      if (visits >= 2 && !dismissed) setShow(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show || !deferred) return null;

  async function install() {
    await deferred?.prompt();
    setShow(false);
  }
  function dismiss() {
    localStorage.setItem("aidm_install_dismissed", "1");
    setShow(false);
  }

  return (
    <div className="pb-safe fixed inset-x-0 bottom-16 z-50 mx-auto max-w-md px-4 md:bottom-4">
      <div className="card flex items-center gap-3 p-4 shadow-float">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt=""
          className="h-10 w-10 rounded-xl"
          width={40}
          height={40}
        />
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-ink">Pasang AIDM</p>
          <p className="text-[12px] text-ink-subtle">
            Akses cepat dari layar utama.
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          className="rounded-pill bg-cta px-4 py-2 text-[12px] font-semibold text-ink-invert"
        >
          Pasang
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup"
          className="tap grid place-items-center text-ink-subtle"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
