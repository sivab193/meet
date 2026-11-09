import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/settings";

export function GET() {
  const baseUrl = getAppUrl();
  return NextResponse.json({
    name: "Schedule with Sivaganesh",
    homepage: baseUrl,
    openapi: `${baseUrl}/api/openapi`,
    mcp: `${baseUrl}/api/mcp`,
    privacy: "Public integrations can read open slots only; booking details and calendar events require owner authentication.",
  });
}
