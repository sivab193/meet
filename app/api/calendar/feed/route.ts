import { NextResponse } from "next/server";
import { timingSafeEqualStr } from "@/lib/auth";
import { listBookings } from "@/lib/bookings";
import { buildCalendarIcs } from "@/lib/ics";
import { getMeetLink } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const configured = process.env.CALENDAR_FEED_TOKEN ?? "";
  const provided = new URL(request.url).searchParams.get("token") ?? "";
  if (!configured || !provided || !timingSafeEqualStr(provided, configured)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)).toISOString();
  const to = new Date(Date.UTC(now.getUTCFullYear() + 4, 0, 1)).toISOString();
  try {
    const bookings = await listBookings(from, to);
    const meetLink = getMeetLink();
    const ics = buildCalendarIcs(
      bookings.map((booking) => ({
        uid: booking.id,
        start: new Date(booking.start_utc),
        end: new Date(booking.end_utc),
        summary: `${booking.event_type}: ${booking.booker_name}`,
        description: `${booking.booker_name} <${booking.booker_email}>${booking.notes ? `\n${booking.notes}` : ""}`,
        location: meetLink,
        status: booking.status === "confirmed" ? "CONFIRMED" : "CANCELLED",
      }))
    );
    return new NextResponse(ics, {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'inline; filename="meet-siv19-dev.ics"',
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[calendar feed]", error);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
