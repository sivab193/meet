import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { slotsForViewerDate } from "@/lib/public-slots";
import { getTimeZone, loadSettings } from "@/lib/settings";
import { parseDateString } from "@/lib/timezone";

export const dynamic = "force-dynamic";

/**
 * GET /api/slots?date=YYYY-MM-DD&duration=30&eventType=call
 * { slots: [ISO UTC strings] }. Rate limited: 60/min per IP.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  const duration = Number(searchParams.get("duration") ?? "");
  const eventType = searchParams.get("eventType") ?? "";
  const viewerTimeZone = searchParams.get("timeZone") ?? "UTC";
  try {
    const ip = clientIp(request);
    if (!(await checkRateLimit(ip, "/api/slots", 60, 60_000))) {
      return NextResponse.json({ error: "too many requests" }, { status: 429 });
    }
    const parsed = parseDateString(date);
    if (!parsed) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }
    const settings = await loadSettings();
    const event = settings.event_types.find((candidate) => candidate.id === eventType);
    if (!event) {
      return NextResponse.json({ error: "unknown event type" }, { status: 404 });
    }
    if (!Number.isInteger(duration) || !event.durations.includes(duration)) {
      return NextResponse.json({ error: "invalid duration" }, { status: 400 });
    }
    const tz = getTimeZone();
    const slots = await slotsForViewerDate({
      date,
      duration,
      viewerTimeZone,
      hostTimeZone: tz,
      settings,
    });
    if (!slots) {
      return NextResponse.json({ error: "invalid timezone" }, { status: 400 });
    }
    return NextResponse.json({
      eventType: event.id,
      duration,
      hostTimeZone: tz,
      timeZone: viewerTimeZone,
      slots: slots.map((s) => s.toISOString()),
    });
  } catch (err) {
    console.error("[slots]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
