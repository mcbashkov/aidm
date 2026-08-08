import crypto from "node:crypto";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Cookie sesi ber-tanda-tangan HMAC (server-only, runtime Node).
 * Isi: id user internal + Privy DID. Tanda tangan mencegah pemalsuan identitas.
 */
export { SESSION_COOKIE };

const SECRET = process.env.SESSION_SECRET || process.env.PRIVY_APP_SECRET || "";

export interface SessionPayload {
  uid: string; // users.id
  did: string; // Privy DID
  iat: number;
}

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createSessionValue(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionValue(value?: string | null): SessionPayload | null {
  if (!value || !SECRET) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    return JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
  } catch {
    return null;
  }
}
