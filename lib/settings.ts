import { getSql, queryRows } from "./db";
import { parseTimeToMinutes } from "./timezone";
import type { WeeklyHoursEntry } from "./slots";

export type EventType = {
  id: string;
  name: string;
  durations: number[];
  description?: string;
};

export type OverrideRow = {
  id: string;
  date: string; // "YYYY-MM-DD"
  start_time: string | null; // "HH:MM"
  end_time: string | null; // "HH:MM"
  is_unavailable: boolean;
};

export type Settings = {
  weekly_hours: (WeeklyHoursEntry | null)[];
  min_notice_minutes: number;
  slot_step_minutes: number;
  max_days_ahead: number;
  event_types: EventType[];
};

export const DEFAULT_SETTINGS: Settings = {
  weekly_hours: [
    { day: 1, start: "09:00", end: "17:00" },
    { day: 2, start: "09:00", end: "17:00" },
    { day: 3, start: "09:00", end: "17:00" },
    { day: 4, start: "09:00", end: "17:00" },
    { day: 5, start: "09:00", end: "17:00" },
  ],
  min_notice_minutes: 60,
  slot_step_minutes: 30,
  max_days_ahead: 60,
  event_types: [
    {
      id: "call",
      name: "Call with Sivaganesh",
      durations: [15, 30, 60],
      description: "A video call over Google Meet.",
    },
  ],
};

export function getTimeZone(): string {
  return process.env.TZ_NAME || "America/New_York";
}

export function getMeetLink(): string {
  return process.env.MEET_LINK || "";
}

export function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getHostEmail(): string {
  return process.env.HOST_EMAIL || "";
}

/** Normalize a stored weekly_hours value: keep valid {day,start,end} entries, drop the rest. */
export function normalizeWeeklyHours(value: unknown): (WeeklyHoursEntry | null)[] {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.weekly_hours;
  const out: WeeklyHoursEntry[] = [];
  for (const e of value) {
    if (!e || typeof e !== "object") continue;
    const entry = e as Record<string, unknown>;
    if (
      typeof entry.day === "number" &&
      entry.day >= 0 &&
      entry.day <= 6 &&
      typeof entry.start === "string" &&
      typeof entry.end === "string" &&
      parseTimeToMinutes(entry.start) !== null &&
      parseTimeToMinutes(entry.end) !== null
    ) {
      out.push({ day: entry.day, start: entry.start, end: entry.end });
    }
  }
  out.sort((a, b) => a.day - b.day);
  return out;
}

function normalizeEventTypes(value: unknown): EventType[] {
  if (!Array.isArray(value)) return DEFAULT_SETTINGS.event_types;
  const out: EventType[] = [];
  for (const e of value) {
    if (!e || typeof e !== "object") continue;
    const entry = e as Record<string, unknown>;
    if (
      typeof entry.id === "string" &&
      typeof entry.name === "string" &&
      Array.isArray(entry.durations) &&
      entry.durations.length > 0 &&
      entry.durations.every((d) => typeof d === "number" && d > 0)
    ) {
      out.push({
        id: entry.id,
        name: entry.name,
        durations: entry.durations as number[],
        description: typeof entry.description === "string" ? entry.description : undefined,
      });
    }
  }
  return out.length > 0 ? out : DEFAULT_SETTINGS.event_types;
}

function asPositiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

/** Load settings from the DB, merged over the built-in defaults. */
export async function loadSettings(): Promise<Settings> {
  const rows = await queryRows<{ key: string; value: unknown }>(
    "SELECT key, value FROM settings",
    []
  );
  const merged: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key === "weekly_hours") {
      merged.weekly_hours = normalizeWeeklyHours(row.value);
    } else if (row.key === "min_notice_minutes") {
      merged.min_notice_minutes = asPositiveInt(row.value, DEFAULT_SETTINGS.min_notice_minutes);
    } else if (row.key === "slot_step_minutes") {
      merged.slot_step_minutes = asPositiveInt(row.value, DEFAULT_SETTINGS.slot_step_minutes);
    } else if (row.key === "max_days_ahead") {
      merged.max_days_ahead = asPositiveInt(row.value, DEFAULT_SETTINGS.max_days_ahead);
    } else if (row.key === "event_types") {
      merged.event_types = normalizeEventTypes(row.value);
    }
  }
  return merged;
}

/** Upsert one or more settings keys. */
export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const sql = getSql();
  const entries: [string, unknown][] = [];
  if (patch.weekly_hours !== undefined) entries.push(["weekly_hours", patch.weekly_hours]);
  if (patch.min_notice_minutes !== undefined) entries.push(["min_notice_minutes", patch.min_notice_minutes]);
  if (patch.slot_step_minutes !== undefined) entries.push(["slot_step_minutes", patch.slot_step_minutes]);
  if (patch.max_days_ahead !== undefined) entries.push(["max_days_ahead", patch.max_days_ahead]);
  if (patch.event_types !== undefined) entries.push(["event_types", patch.event_types]);
  for (const [key, value] of entries) {
    await sql.query(
      "INSERT INTO settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [key, JSON.stringify(value)]
    );
  }
}

function normalizeTime(value: string | null): string | null {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  // Postgres TIME comes back as "HH:MM:SS"; keep "HH:MM".
  return value.slice(0, 5);
}

/** Date overrides, optionally bounded by date range (inclusive). */
export async function loadOverrides(from?: string, to?: string): Promise<OverrideRow[]> {
  const rows = await queryRows<{
    id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    is_unavailable: boolean;
  }>(
    "SELECT id, date::text AS date, start_time::text AS start_time, end_time::text AS end_time, is_unavailable " +
      "FROM date_overrides " +
      "WHERE ($1::date IS NULL OR date >= $1::date) AND ($2::date IS NULL OR date <= $2::date) " +
      "ORDER BY date",
    [from ?? null, to ?? null]
  );
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    start_time: normalizeTime(r.start_time),
    end_time: normalizeTime(r.end_time),
    is_unavailable: r.is_unavailable,
  }));
}

export async function upsertOverride(input: {
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_unavailable: boolean;
}): Promise<OverrideRow> {
  const rows = await queryRows<OverrideRow>(
    "INSERT INTO date_overrides (date, start_time, end_time, is_unavailable) VALUES ($1, $2::time, $3::time, $4) " +
      "ON CONFLICT (date) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, is_unavailable = EXCLUDED.is_unavailable " +
      "RETURNING id, date::text AS date, start_time::text AS start_time, end_time::text AS end_time, is_unavailable",
    [input.date, input.start_time, input.end_time, input.is_unavailable]
  );
  const r = rows[0];
  return {
    id: r.id,
    date: r.date,
    start_time: normalizeTime(r.start_time),
    end_time: normalizeTime(r.end_time),
    is_unavailable: r.is_unavailable,
  };
}

export async function deleteOverride(id: string): Promise<boolean> {
  const rows = await queryRows<{ id: string }>(
    "DELETE FROM date_overrides WHERE id = $1 RETURNING id",
    [id]
  );
  return rows.length > 0;
}
