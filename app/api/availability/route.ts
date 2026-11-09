import { NextResponse } from "next/server";
import {
  hostOverrideRangeForViewerMonth,
  viewerDateHasAvailability,
} from "@/lib/public-slots";
import { getTimeZone, loadOverrides, loadSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?month=YYYY-MM
 * { days: { "YYYY-MM-DD": true/false } } — true if the day has any
 * availability window per weekly hours + overrides (bookings ignored).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? "";
  const eventType = searchParams.get("eventType") ?? "";
  const viewerTimeZone = searchParams.get("timeZone") ?? "UTC";
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
    if (!settings.event_types.some((event) => event.id === eventType)) {
      return NextResponse.json({ error: "unknown event type" }, { status: 404 });
    }
    const hostTimeZone = getTimeZone();
    const range = hostOverrideRangeForViewerMonth(year, mon, viewerTimeZone, hostTimeZone);
    if (!range) {
      return NextResponse.json({ error: "invalid timezone" }, { status: 400 });
    }
    const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
    const overrides = await loadOverrides(range.from, range.to);
    const days: Record<string, boolean> = {};
    for (let d = 1; d <= lastDay; d++) {
      const ds = `${month}-${String(d).padStart(2, "0")}`;
      days[ds] = viewerDateHasAvailability({
        date: ds,
        viewerTimeZone,
        hostTimeZone,
        settings,
        overrides,
      });
    }
    return NextResponse.json({ eventType, days, timeZone: viewerTimeZone, hostTimeZone });
  } catch (err) {
    console.error("[availability]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
