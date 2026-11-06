// Timezone helpers. All availability windows are wall-clock times in TZ_NAME;
// all storage and comparison is in UTC. Nothing here relies on the server's
// local timezone.

export type DateParts = {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function dtf(timeZone: string): Intl.DateTimeFormat {
  let f = dtfCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    dtfCache.set(timeZone, f);
  }
  return f;
}

/** Calendar parts of an instant, as seen in `timeZone`. */
export function partsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = dtf(timeZone).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
    weekday: WEEKDAYS.indexOf(weekdayStr),
  };
}

/** Offset (ms) that must be added to a UTC instant to get wall-clock time in `timeZone`. */
function tzOffsetMs(date: Date, timeZone: string): number {
  const p = partsInTimeZone(date, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - date.getTime();
}

/**
 * Convert a wall-clock time (year/month/day hour:minute) in `timeZone` to a
 * UTC instant. Two offset passes handle DST transitions; for an ambiguous
 * wall time (fall-back hour) the first occurrence is returned.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset1 = tzOffsetMs(new Date(guess), timeZone);
  let utc = guess - offset1;
  const offset2 = tzOffsetMs(new Date(utc), timeZone);
  if (offset2 !== offset1) utc = guess - offset2;
  return new Date(utc);
}

/** "YYYY-MM-DD" for an instant, as seen in `timeZone`. */
export function dateStringInTimeZone(date: Date, timeZone: string): string {
  const p = partsInTimeZone(date, timeZone);
  return toDateString(p.year, p.month, p.day);
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse "YYYY-MM-DD" (strict, rejects impossible dates). Returns null if invalid. */
export function parseDateString(
  s: string
): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** Weekday (0 = Sunday) of a calendar date. Timezone-independent. */
export function weekdayOfDateString(s: string): number {
  const p = parseDateString(s);
  if (!p) return -1;
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

export function addDaysToDateString(s: string, days: number): string {
  const p = parseDateString(s);
  if (!p) throw new Error(`Invalid date: ${s}`);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return toDateString(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** "HH:MM" for minutes since midnight. */
export function minutesToTimeString(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Minutes since midnight for "HH:MM", or null if invalid. */
export function parseTimeToMinutes(t: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
