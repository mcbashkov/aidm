"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { isPrivyConfigured } from "@/lib/privy/config";

function PrivyLogout() {
  const router = useRouter();
  const { logout } = usePrivy();

  async function doLogout() {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      /* abaikan */
    }
    try {
      await logout();
    } catch {
      /* abaikan */
    }
    router.push("/masuk");
  }

  return (
    <button
      type="button"
      onClick={doLogout}
      className="w-full rounded-card bg-surface px-4 py-3.5 shadow-card text-[14px] font-medium text-danger"
    >
      Keluar
    </button>
  );
}

export function LogoutButton() {
  if (!isPrivyConfigured) {
    return (
      <Link
        href="/masuk"
        className="block rounded-card bg-surface px-4 py-3.5 shadow-card text-center text-[14px] font-medium text-danger"
      >
        Keluar
      </Link>
    );
  }
  return <PrivyLogout />;
}
