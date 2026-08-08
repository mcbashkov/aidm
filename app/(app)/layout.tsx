import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { TopNav } from "@/components/layout/top-nav";
import { AuthStatus } from "@/components/layout/auth-status";

/** Shell aplikasi: top nav (tablet/desktop) + bottom nav (mobile). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <TopNav right={<AuthStatus />} />
      {/* Kolom konten 860px (§13) — latar ivory mengisi sisa viewport */}
      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 md:max-w-[860px] md:px-6 md:pb-12 md:pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
