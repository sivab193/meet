import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth";
import {
  deleteOverride,
  loadOverrides,
  loadSettings,
  normalizeWeeklyHours,
  saveSettings,
  upsertOverride,
} from "@/lib/settings";
import { parseDateString, parseTimeToMinutes } from "@/lib/timezone";
import type { EventType } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/availability
 * { weekly_hours, overrides, min_notice_minutes, slot_step_minutes,
 *   max_days_ahead, event_types }
 *
 * PUT /api/admin/availability
 * Body (all fields optional; only provided fields change):
 * {
 *   weekly_hours?: [{day, start, end} | null],
 *   min_notice_minutes?: number, slot_step_minutes?: number,
 *   max_days_ahead?: number, event_types?: EventType[],
 *   overrides?: {
 *     upsert?: [{ date, start_time: "HH:MM"|null, end_time: "HH:MM"|null, is_unavailable: boolean }],
 *     delete?: [id, ...]
 *   }
 * }
 * Auth: x-api-key == JARVIS_API_KEY, or the admin session cookie.
 */
export async function GET(request: Request) {
  if (!(await checkAdminAccess(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const settings = await loadSettings();
    const overrides = await loadOverrides();
    return NextResponse.json({
      weekly_hours: settings.weekly_hours,
      overrides,
      min_notice_minutes: settings.min_notice_minutes,
      slot_step_minutes: settings.slot_step_minutes,
      max_days_ahead: settings.max_days_ahead,
      event_types: settings.event_types,
    });
  } catch (err) {
    console.error("[admin/availability]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

function validEventTypes(v: unknown): v is EventType[] {
  if (!Array.isArray(v) || v.length === 0) return false;
  return v.every(
    (e) =>
      e &&
      typeof e === "object" &&
      typeof (e as Record<string, unknown>).id === "string" &&
      typeof (e as Record<string, unknown>).name === "string" &&
      Array.isArray((e as Record<string, unknown>).durations) &&
      ((e as Record<string, unknown>).durations as unknown[]).every(
        (d) => typeof d === "number" && d > 0
      )
  );
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
  try {
    const patch: Record<string, unknown> = {};

    if (body.weekly_hours !== undefined) {
      if (!Array.isArray(body.weekly_hours)) {
        return NextResponse.json({ error: "weekly_hours must be an array" }, { status: 400 });
      }
      const normalized = normalizeWeeklyHours(body.weekly_hours);
      if (body.weekly_hours.length > 0 && normalized.length === 0) {
        return NextResponse.json({ error: "weekly_hours has no valid entries" }, { status: 400 });
      }
      patch.weekly_hours = normalized;
    }
    if (body.min_notice_minutes !== undefined) {
      if (!isPositiveInt(body.min_notice_minutes)) {
        return NextResponse.json({ error: "min_notice_minutes must be a positive integer" }, { status: 400 });
      }
      patch.min_notice_minutes = body.min_notice_minutes;
    }
    if (body.slot_step_minutes !== undefined) {
      if (!isPositiveInt(body.slot_step_minutes)) {
        return NextResponse.json({ error: "slot_step_minutes must be a positive integer" }, { status: 400 });
      }
      patch.slot_step_minutes = body.slot_step_minutes;
    }
    if (body.max_days_ahead !== undefined) {
      if (!isPositiveInt(body.max_days_ahead)) {
        return NextResponse.json({ error: "max_days_ahead must be a positive integer" }, { status: 400 });
      }
      patch.max_days_ahead = body.max_days_ahead;
    }
    if (body.event_types !== undefined) {
      if (!validEventTypes(body.event_types)) {
        return NextResponse.json({ error: "event_types is invalid" }, { status: 400 });
      }
      patch.event_types = body.event_types;
    }

    const overrides = body.overrides as
      | { upsert?: unknown[]; delete?: unknown[] }
      | undefined;
    const upserts: { date: string; start_time: string | null; end_time: string | null; is_unavailable: boolean }[] = [];
    if (overrides !== undefined) {
      if (overrides === null || typeof overrides !== "object" || Array.isArray(overrides)) {
        return NextResponse.json({ error: "overrides must be an object" }, { status: 400 });
      }
      if (overrides.upsert !== undefined) {
        if (!Array.isArray(overrides.upsert)) {
          return NextResponse.json({ error: "overrides.upsert must be an array" }, { status: 400 });
        }
        for (const o of overrides.upsert) {
          const item = o as Record<string, unknown>;
          if (!item || typeof item !== "object" || !parseDateString(String(item.date ?? ""))) {
            return NextResponse.json({ error: "override date must be YYYY-MM-DD" }, { status: 400 });
          }
          const isUnavailable = item.is_unavailable === true;
          let start: string | null = null;
          let end: string | null = null;
          if (!isUnavailable) {
            if (
              typeof item.start_time !== "string" ||
              typeof item.end_time !== "string" ||
              parseTimeToMinutes(item.start_time) === null ||
              parseTimeToMinutes(item.end_time) === null
            ) {
              return NextResponse.json(
                { error: "override needs valid start_time/end_time or is_unavailable: true" },
                { status: 400 }
              );
            }
            start = item.start_time;
            end = item.end_time;
          }
          upserts.push({
            date: String(item.date),
            start_time: start,
            end_time: end,
            is_unavailable: isUnavailable,
          });
        }
      }
      if (overrides.delete !== undefined) {
        if (!Array.isArray(overrides.delete) || overrides.delete.some((d) => typeof d !== "string")) {
          return NextResponse.json({ error: "overrides.delete must be an array of ids" }, { status: 400 });
        }
      }
    }

    if (Object.keys(patch).length > 0) await saveSettings(patch as never);
    for (const u of upserts) await upsertOverride(u);
    if (overrides?.delete) {
      for (const id of overrides.delete as string[]) await deleteOverride(id);
    }

    const settings = await loadSettings();
    const allOverrides = await loadOverrides();
    return NextResponse.json({
      weekly_hours: settings.weekly_hours,
      overrides: allOverrides,
      min_notice_minutes: settings.min_notice_minutes,
      slot_step_minutes: settings.slot_step_minutes,
      max_days_ahead: settings.max_days_ahead,
      event_types: settings.event_types,
    });
  } catch (err) {
    console.error("[admin/availability PUT]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
