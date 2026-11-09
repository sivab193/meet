import { listConfirmedWindowsForDay } from "./bookings";
import { loadOverrides, type Settings } from "./settings";
import { generateSlots, windowForDate } from "./slots";
import {
  addDaysToDateString,
  dateStringInTimeZone,
  parseDateString,
  parseTimeToMinutes,
  zonedTimeToUtc,
} from "./timezone";

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function utcBoundsForViewerDate(date: string, timeZone: string): { start: Date; end: Date } | null {
  const parsed = parseDateString(date);
  if (!parsed || !isValidTimeZone(timeZone)) return null;
  const start = zonedTimeToUtc(parsed.year, parsed.month, parsed.day, 0, 0, timeZone);
  const next = parseDateString(addDaysToDateString(date, 1));
  if (!next) return null;
  const end = zonedTimeToUtc(next.year, next.month, next.day, 0, 0, timeZone);
  return { start, end };
}

function hostDatesOverlapping(start: Date, end: Date, hostTimeZone: string): string[] {
  const first = dateStringInTimeZone(start, hostTimeZone);
  const last = dateStringInTimeZone(new Date(end.getTime() - 1), hostTimeZone);
  const dates: string[] = [];
  for (let date = first; date <= last; date = addDaysToDateString(date, 1)) dates.push(date);
  return dates;
}

export async function slotsForViewerDate(input: {
  date: string;
  viewerTimeZone: string;
  hostTimeZone: string;
  duration: number;
  settings: Settings;
  now?: Date;
}): Promise<Date[] | null> {
  const bounds = utcBoundsForViewerDate(input.date, input.viewerTimeZone);
  if (!bounds) return null;
  const hostDates = hostDatesOverlapping(bounds.start, bounds.end, input.hostTimeZone);
  const overrides = await loadOverrides(hostDates[0], hostDates.at(-1));
  const busy = await listConfirmedWindowsForDay(bounds.start, bounds.end);
  const slots = hostDates.flatMap((date) =>
    generateSlots({
      date,
      durationMinutes: input.duration,
      weeklyHours: input.settings.weekly_hours,
      overrides,
      bookings: busy,
      now: input.now ?? new Date(),
      minNoticeMinutes: input.settings.min_notice_minutes,
      slotStepMinutes: input.settings.slot_step_minutes,
      maxDaysAhead: input.settings.max_days_ahead,
      timeZone: input.hostTimeZone,
    })
  );
  return slots
    .filter((slot) => slot >= bounds.start && slot < bounds.end)
    .sort((a, b) => a.getTime() - b.getTime());
}

export function viewerDateHasAvailability(input: {
  date: string;
  viewerTimeZone: string;
  hostTimeZone: string;
  settings: Settings;
  overrides: Awaited<ReturnType<typeof loadOverrides>>;
}): boolean {
  const bounds = utcBoundsForViewerDate(input.date, input.viewerTimeZone);
  if (!bounds) return false;
  const hostDates = hostDatesOverlapping(bounds.start, bounds.end, input.hostTimeZone);
  return hostDates.some((date) => {
    const win = windowForDate(date, input.settings.weekly_hours, input.overrides);
    if (!win) return false;
    const parsed = parseDateString(date);
    const startMinutes = parseTimeToMinutes(win.start);
    const endMinutes = parseTimeToMinutes(win.end);
    if (!parsed || startMinutes === null || endMinutes === null) return false;
    const start = zonedTimeToUtc(
      parsed.year,
      parsed.month,
      parsed.day,
      Math.floor(startMinutes / 60),
      startMinutes % 60,
      input.hostTimeZone
    );
    const end = zonedTimeToUtc(
      parsed.year,
      parsed.month,
      parsed.day,
      Math.floor(endMinutes / 60),
      endMinutes % 60,
      input.hostTimeZone
    );
    return start < bounds.end && end > bounds.start;
  });
}

export function hostOverrideRangeForViewerMonth(
  year: number,
  month: number,
  viewerTimeZone: string,
  hostTimeZone: string
): { from: string; to: string } | null {
  if (!isValidTimeZone(viewerTimeZone)) return null;
  const start = zonedTimeToUtc(year, month, 1, 0, 0, viewerTimeZone);
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const end = zonedTimeToUtc(nextMonth.year, nextMonth.month, 1, 0, 0, viewerTimeZone);
  return {
    from: dateStringInTimeZone(start, hostTimeZone),
    to: dateStringInTimeZone(new Date(end.getTime() - 1), hostTimeZone),
  };
}
