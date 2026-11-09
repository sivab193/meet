import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminSessionValue, timingSafeEqualStr } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** POST /api/admin/login { password } — sets the httpOnly admin session cookie. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) {
    return NextResponse.json({ error: "admin login is not configured" }, { status: 503 });
  }
  try {
    if (!(await checkRateLimit(clientIp(request), "/api/admin/login", 10, 15 * 60_000))) {
      return NextResponse.json({ error: "too many login attempts" }, { status: 429 });
    }
  } catch (error) {
    console.error("[admin login rate limit]", error);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (!password || !timingSafeEqualStr(password, configured)) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminSessionValue() ?? "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
