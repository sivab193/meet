import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import { cancelBookingById } from "@/lib/bookings";
import { sendCancellationEmails } from "@/lib/booking-email";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/bookings/[id]/cancel — admin/Jarvis cancel.
 * Auth: x-api-key == JARVIS_API_KEY, or the admin session cookie.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdminAccess(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const booking = await cancelBookingById(id);
    if (!booking) {
      return NextResponse.json(
        { error: "booking not found or already cancelled" },
        { status: 404 }
      );
    }
    await sendCancellationEmails(booking);
    return NextResponse.json({ ok: true, booking });
  } catch (err) {
    console.error("[admin/cancel]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
