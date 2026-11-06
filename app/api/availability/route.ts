import { NextResponse } from "next/server";
import { getTimeZone, loadOverrides, loadSettings } from "@/lib/settings";
import { dayHasAvailability } from "@/lib/slots";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?month=YYYY-MM
 * { days: { "YYYY-MM-DD": true/false } } — true if the day has any
 * availability window per weekly hours + overrides (bookings ignored).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? "";
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) {
    return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
  }
  try {
    const settings = await loadSettings();
    const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
    const from = `${month}-01`;
    const to = `${month}-${String(lastDay).padStart(2, "0")}`;
    const overrides = await loadOverrides(from, to);
    const days: Record<string, boolean> = {};
    for (let d = 1; d <= lastDay; d++) {
      const ds = `${month}-${String(d).padStart(2, "0")}`;
      days[ds] = dayHasAvailability(ds, settings.weekly_hours, overrides);
    }
    return NextResponse.json({ days, timeZone: getTimeZone() });
  } catch (err) {
    console.error("[availability]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
