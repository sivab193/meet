import { NextResponse } from "next/server";
import { listConfirmedWindowsForDay } from "@/lib/bookings";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { getTimeZone, loadOverrides, loadSettings } from "@/lib/settings";
import { generateSlots } from "@/lib/slots";
import {
  addDaysToDateString,
  parseDateString,
  zonedTimeToUtc,
} from "@/lib/timezone";

export const dynamic = "force-dynamic";

/**
 * GET /api/slots?date=YYYY-MM-DD&duration=30
 * { slots: [ISO UTC strings] }. Rate limited: 60/min per IP.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  const duration = Number(searchParams.get("duration") ?? "");
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
    const allDurations = new Set(settings.event_types.flatMap((e) => e.durations));
    if (!Number.isInteger(duration) || !allDurations.has(duration)) {
      return NextResponse.json({ error: "invalid duration" }, { status: 400 });
    }
    const tz = getTimeZone();
    const dayStart = zonedTimeToUtc(parsed.year, parsed.month, parsed.day, 0, 0, tz);
    const nextDay = parseDateString(addDaysToDateString(date, 1));
    if (!nextDay) {
      return NextResponse.json({ error: "invalid date" }, { status: 400 });
    }
    const dayEnd = zonedTimeToUtc(nextDay.year, nextDay.month, nextDay.day, 0, 0, tz);
    const overrides = await loadOverrides(date, date);
    const bookings = await listConfirmedWindowsForDay(dayStart, dayEnd);
    const slots = generateSlots({
      date,
      durationMinutes: duration,
      weeklyHours: settings.weekly_hours,
      overrides,
      bookings,
      now: new Date(),
      minNoticeMinutes: settings.min_notice_minutes,
      slotStepMinutes: settings.slot_step_minutes,
      maxDaysAhead: settings.max_days_ahead,
      timeZone: tz,
    });
    return NextResponse.json({ slots: slots.map((s) => s.toISOString()) });
  } catch (err) {
    console.error("[slots]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
