import { PrivyClient } from "@privy-io/server-auth";

/**
 * Klien Privy server-side untuk verifikasi access token. Null bila kredensial
 * belum diisi (mode placeholder) — API terkait akan membalas 501.
 */
export function getPrivyServerClient(): PrivyClient | null {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) return null;
  return new PrivyClient(appId, appSecret);
}
