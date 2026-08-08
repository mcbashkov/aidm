import type { Metadata } from "next";
import { LoginPanel } from "@/components/auth/login-panel";

export const metadata: Metadata = { title: "Masuk" };

export default function MasukPage() {
  return <LoginPanel />;
}
