import { getSql, queryRows } from "./db";

/**
 * Sliding-window rate limit backed by the rate_limits table.
 * Returns true if the request is allowed (and records it), false if the
 * caller is over the limit.
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  const sql = getSql();
  const since = new Date(Date.now() - windowMs).toISOString();
  try {
    await sql.query("DELETE FROM rate_limits WHERE created_at < now() - interval '2 hours'", []);
  } catch {
    // Best-effort cleanup; a failure here must not block the request.
  }
  const rows = await queryRows<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM rate_limits WHERE ip = $1 AND endpoint = $2 AND created_at > $3::timestamptz",
    [ip, endpoint, since]
  );
  if ((rows[0]?.n ?? 0) >= max) return false;
  await sql.query("INSERT INTO rate_limits (ip, endpoint) VALUES ($1, $2)", [ip, endpoint]);
  return true;
}

/** Best-effort client IP: first entry of X-Forwarded-For (set by Vercel), else X-Real-IP. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
