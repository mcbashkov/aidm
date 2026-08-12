import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopNav } from "@/components/layout/top-nav";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { HeaderStats } from "@/components/layout/header-stats";
import { MeProvider } from "@/components/providers/me-provider";

/** Shell aplikasi: top nav (tablet/desktop) + header & bottom nav (mobile). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <MeProvider>
      <div className="min-h-dvh bg-bg">
        <TopNav right={<HeaderStats />} />
        <MobileTopBar />
        {/* Kolom konten 860px (§13) — latar ivory mengisi sisa viewport */}
        <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 md:max-w-[860px] md:px-6 md:pb-12 md:pt-8">
          {children}
        </main>
        <BottomNav />
      </div>
    </MeProvider>
  );
}
