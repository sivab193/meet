import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import { listBookings } from "@/lib/bookings";
import { getTimeZone } from "@/lib/settings";
import { addDaysToDateString, dateStringInTimeZone, parseDateString } from "@/lib/timezone";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Lists bookings in the range (defaults: today .. today+30d in TZ_NAME).
 * Auth: x-api-key == JARVIS_API_KEY, or the admin session cookie.
 */
export async function GET(request: Request) {
  if (!(await checkAdminAccess(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const tz = getTimeZone();
  const today = dateStringInTimeZone(new Date(), tz);
  const from = searchParams.get("from") ?? today;
  const to = searchParams.get("to") ?? addDaysToDateString(today, 30);
  if (!parseDateString(from) || !parseDateString(to)) {
    return NextResponse.json({ error: "from/to must be YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const bookings = await listBookings(
      `${from}T00:00:00Z`,
      `${addDaysToDateString(to, 1)}T00:00:00Z`
    );
    return NextResponse.json({ bookings });
  } catch (err) {
    console.error("[admin/bookings]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
