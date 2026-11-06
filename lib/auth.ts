import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "meet_admin";

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function sha256Buf(s: string): Buffer {
  return createHash("sha256").update(s).digest();
}

/** Constant-time string comparison (via SHA-256 digests, so lengths need not match). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  return timingSafeEqual(sha256Buf(a), sha256Buf(b));
}

/** Value stored in the admin session cookie: sha256 hex of the admin password. */
export function adminSessionValue(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return sha256Hex(pw);
}

export async function isAdminSession(): Promise<boolean> {
  const expected = adminSessionValue();
  if (!expected) return false;
  const jar = await cookies();
  const got = jar.get(ADMIN_COOKIE)?.value ?? "";
  return got.length > 0 && timingSafeEqualStr(got, expected);
}

/** Jarvis API-key check: x-api-key header == JARVIS_API_KEY. */
export function checkApiKey(request: Request): boolean {
  const key = process.env.JARVIS_API_KEY;
  if (!key) return false;
  const provided = request.headers.get("x-api-key") ?? "";
  return provided.length > 0 && timingSafeEqualStr(provided, key);
}

/**
 * Access for /api/admin/*: either Jarvis (API key) or the admin dashboard
 * (session cookie set by POST /api/admin/login).
 */
export async function checkAdminAccess(request: Request): Promise<boolean> {
  if (checkApiKey(request)) return true;
  return isAdminSession();
}
