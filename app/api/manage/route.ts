import { NextResponse } from "next/server";
import { getBookingByToken } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/** GET /api/manage?token= — booking details for the token holder. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  try {
    const booking = await getBookingByToken(token);
    if (!booking) {
      return NextResponse.json({ error: "booking not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: booking.id,
      event_type: booking.event_type,
      start_utc: booking.start_utc,
      end_utc: booking.end_utc,
      booker_name: booking.booker_name,
      booker_email: booking.booker_email,
      notes: booking.notes,
      status: booking.status,
      created_at: booking.created_at,
    });
  } catch (err) {
    console.error("[manage]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
