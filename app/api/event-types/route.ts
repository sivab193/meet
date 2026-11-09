import { NextResponse } from "next/server";
import { getAppUrl, loadSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await loadSettings();
    const baseUrl = getAppUrl();
    return NextResponse.json({
      eventTypes: settings.event_types.map((event) => ({
        ...event,
        bookingUrl: `${baseUrl}/${event.id}`,
      })),
    });
  } catch (error) {
    console.error("[event-types]", error);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
