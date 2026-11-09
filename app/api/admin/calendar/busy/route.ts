import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

type BusyEvent = {
  id: string;
  startUtc: string;
  endUtc: string;
  summary?: string;
};

function validDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

export async function PUT(request: Request) {
  if (!(await checkAdminAccess(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const source = typeof body.source === "string" ? body.source.trim() : "";
  const fromUtc = body.fromUtc;
  const toUtc = body.toUtc;
  const events = body.events;
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(source)) {
    return NextResponse.json({ error: "source must be a short lowercase identifier" }, { status: 400 });
  }
  if (!validDate(fromUtc) || !validDate(toUtc) || new Date(toUtc) <= new Date(fromUtc)) {
    return NextResponse.json({ error: "fromUtc/toUtc must be a valid increasing range" }, { status: 400 });
  }
  if (!Array.isArray(events) || events.length > 1000) {
    return NextResponse.json({ error: "events must be an array of at most 1000 items" }, { status: 400 });
  }

  const normalized: BusyEvent[] = [];
  for (const value of events) {
    const event = value as Record<string, unknown>;
    if (
      !event ||
      typeof event !== "object" ||
      typeof event.id !== "string" ||
      event.id.length === 0 ||
      event.id.length > 200 ||
      !validDate(event.startUtc) ||
      !validDate(event.endUtc) ||
      new Date(event.endUtc) <= new Date(event.startUtc)
    ) {
      return NextResponse.json({ error: "each event needs id and a valid UTC window" }, { status: 400 });
    }
    normalized.push({
      id: event.id,
      startUtc: new Date(event.startUtc).toISOString(),
      endUtc: new Date(event.endUtc).toISOString(),
      summary: typeof event.summary === "string" ? event.summary.slice(0, 200) : undefined,
    });
  }

  try {
    const sql = getSql();
    await sql.query(
      "DELETE FROM calendar_busy WHERE source = $1 AND start_utc < $3::timestamptz AND end_utc > $2::timestamptz",
      [source, new Date(fromUtc).toISOString(), new Date(toUtc).toISOString()]
    );
    for (const event of normalized) {
      await sql.query(
        "INSERT INTO calendar_busy (source, external_id, start_utc, end_utc, summary) " +
          "VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5) " +
          "ON CONFLICT (source, external_id) DO UPDATE SET start_utc = EXCLUDED.start_utc, end_utc = EXCLUDED.end_utc, summary = EXCLUDED.summary, updated_at = now()",
        [source, event.id, event.startUtc, event.endUtc, event.summary ?? null]
      );
    }
    return NextResponse.json({ ok: true, source, imported: normalized.length });
  } catch (error) {
    console.error("[calendar busy sync]", error);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
