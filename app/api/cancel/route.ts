import { NextResponse } from "next/server";
import { cancelBookingByToken } from "@/lib/bookings";
import { sendCancellationEmails } from "@/lib/booking-email";

export const dynamic = "force-dynamic";

/** POST /api/cancel { token } — cancels a confirmed booking, notifies both sides. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  try {
    const booking = await cancelBookingByToken(token);
    if (!booking) {
      return NextResponse.json(
        { error: "booking not found or already cancelled" },
        { status: 404 }
      );
    }
    await sendCancellationEmails(booking);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cancel]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
