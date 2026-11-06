import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { insertBookingAtomic, listConfirmedWindowsForDay } from "@/lib/bookings";
import { sendBookingConfirmationEmails } from "@/lib/booking-email";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { getAppUrl, getMeetLink, getTimeZone, loadOverrides, loadSettings } from "@/lib/settings";
import { generateSlots } from "@/lib/slots";
import { addDaysToDateString, parseDateString, zonedTimeToUtc } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/book
 * Body: { date, startUtc, duration, name, email, notes?, honeypot, eventType? }
 * Rate limited: 5/hour per IP. Returns { bookingId, meetLink, cancelUrl }.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  try {
    const ip = clientIp(request);
    if (!(await checkRateLimit(ip, "/api/book", 5, 3_600_000))) {
      return NextResponse.json(
        { error: "too many booking attempts, try again later" },
        { status: 429 }
      );
    }

    // Honeypot: a human never fills this field; bots usually do.
    if (typeof body.honeypot === "string" && body.honeypot.length > 0) {
      return NextResponse.json({ error: "invalid request" }, { status: 400 });
    }

    const date = typeof body.date === "string" ? body.date : "";
    const startUtc = typeof body.startUtc === "string" ? body.startUtc : "";
    const duration = typeof body.duration === "number" ? body.duration : NaN;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const eventType = typeof body.eventType === "string" ? body.eventType : undefined;

    const parsedDate = parseDateString(date);
    const start = new Date(startUtc);
    if (!parsedDate || Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "invalid date or start time" }, { status: 400 });
    }
    if (name.length === 0 || name.length > 100) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 200) {
      return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
    }
    if (notes.length > 1000) {
      return NextResponse.json({ error: "notes are too long" }, { status: 400 });
    }

    const settings = await loadSettings();
    const event =
      settings.event_types.find((e) => e.id === eventType) ?? settings.event_types[0];
    if (!event || !event.durations.includes(duration)) {
      return NextResponse.json({ error: "invalid duration" }, { status: 400 });
    }

    // Recompute the offered slots server-side and require an exact match.
    // This enforces windows, min notice, and bookings regardless of the client.
    const tz = getTimeZone();
    const dayStart = zonedTimeToUtc(parsedDate.year, parsedDate.month, parsedDate.day, 0, 0, tz);
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
    if (!slots.some((s) => s.getTime() === start.getTime())) {
      return NextResponse.json(
        { error: "that time is no longer available" },
        { status: 400 }
      );
    }

    const end = new Date(start.getTime() + duration * 60000);
    const cancelToken = randomBytes(16).toString("hex"); // 32 chars
    const inserted = await insertBookingAtomic({
      eventType: event.id,
      startUtc: start.toISOString(),
      endUtc: end.toISOString(),
      bookerName: name,
      bookerEmail: email,
      notes: notes || null,
      cancelToken,
    });
    if (!inserted) {
      return NextResponse.json(
        { error: "that time was just taken, please pick another" },
        { status: 409 }
      );
    }

    const booking = {
      id: inserted.id,
      event_type: event.id,
      start_utc: start.toISOString(),
      end_utc: end.toISOString(),
      booker_name: name,
      booker_email: email,
      notes: notes || null,
      status: "confirmed",
      cancel_token: cancelToken,
      created_at: new Date().toISOString(),
    };
    // Emails are best effort: the booking stands even if sending fails.
    await sendBookingConfirmationEmails(booking);

    return NextResponse.json({
      bookingId: inserted.id,
      meetLink: getMeetLink(),
      cancelUrl: `${getAppUrl()}/manage?token=${cancelToken}`,
    });
  } catch (err) {
    console.error("[book]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
