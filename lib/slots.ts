// Pure slot-generation logic. No I/O, no framework imports, so it can be
// unit-tested in plain Node. Rules:
// - A date override wins over weekly hours (custom hours, or blocked all day).
// - Slots step by slotStepMinutes from the window start; a slot is offered
//   only if it fits fully inside the window.
// - A slot must not overlap any confirmed booking.
// - A slot must start at least minNoticeMinutes after `now`.
// - Only today onward, up to maxDaysAhead (calendar days in `timeZone`).
// - Availability windows are wall-clock times in `timeZone`; everything is
//   stored and compared as UTC instants.
import {
  addDaysToDateString,
  dateStringInTimeZone,
  parseDateString,
  parseTimeToMinutes,
  weekdayOfDateString,
  zonedTimeToUtc,
} from "./timezone";

export type WeeklyHoursEntry = {
  day: number; // 0 = Sunday
  start: string; // "HH:MM"
  end: string; // "HH:MM"
};

export type DateOverrideInput = {
  date: string; // "YYYY-MM-DD"
  start_time: string | null; // "HH:MM" or null
  end_time: string | null; // "HH:MM" or null
  is_unavailable: boolean;
};

export type BookingWindowInput = {
  start: Date;
  end: Date;
};

/** Availability window for a date, or null if the day is closed. */
export function windowForDate(
  date: string,
  weeklyHours: (WeeklyHoursEntry | null)[],
  overrides: DateOverrideInput[]
): { start: string; end: string } | null {
  const ov = overrides.find((o) => o.date === date);
  if (ov) {
    if (ov.is_unavailable) return null;
    if (ov.start_time && ov.end_time) {
      return { start: ov.start_time, end: ov.end_time };
    }
    return null;
  }
  const weekday = weekdayOfDateString(date);
  if (weekday < 0) return null;
  const entry = weeklyHours.find((e) => e !== null && e.day === weekday) ?? null;
  if (!entry) return null;
  return { start: entry.start, end: entry.end };
}

/** True if the day has any availability window (bookings ignored). */
export function dayHasAvailability(
  date: string,
  weeklyHours: (WeeklyHoursEntry | null)[],
  overrides: DateOverrideInput[]
): boolean {
  return windowForDate(date, weeklyHours, overrides) !== null;
}

export type GenerateSlotsInput = {
  date: string; // "YYYY-MM-DD" in timeZone
  durationMinutes: number;
  weeklyHours: (WeeklyHoursEntry | null)[];
  overrides: DateOverrideInput[];
  bookings: BookingWindowInput[];
  now: Date;
  minNoticeMinutes: number;
  slotStepMinutes: number;
  maxDaysAhead: number;
  timeZone: string;
};

/** Slot start times (UTC instants) offered for one date. */
export function generateSlots(input: GenerateSlotsInput): Date[] {
  const { date } = input;
  const parsed = parseDateString(date);
  if (!parsed) return [];
  if (input.durationMinutes <= 0 || input.slotStepMinutes <= 0) return [];

  const today = dateStringInTimeZone(input.now, input.timeZone);
  if (date < today) return []; // past date (ISO strings compare lexicographically)
  const lastAllowed = addDaysToDateString(today, input.maxDaysAhead);
  if (date > lastAllowed) return [];

  const win = windowForDate(date, input.weeklyHours, input.overrides);
  if (!win) return [];
  const startMin = parseTimeToMinutes(win.start);
  const endMin = parseTimeToMinutes(win.end);
  if (startMin === null || endMin === null || endMin <= startMin) return [];

  const earliest = new Date(input.now.getTime() + input.minNoticeMinutes * 60000);
  const out: Date[] = [];
  for (
    let t = startMin;
    t + input.durationMinutes <= endMin;
    t += input.slotStepMinutes
  ) {
    const slotStart = zonedTimeToUtc(
      parsed.year,
      parsed.month,
      parsed.day,
      Math.floor(t / 60),
      t % 60,
      input.timeZone
    );
    const slotEnd = new Date(slotStart.getTime() + input.durationMinutes * 60000);
    if (slotStart < earliest) continue;
    if (input.bookings.some((b) => slotStart < b.end && slotEnd > b.start)) continue;
    out.push(slotStart);
  }
  return out;
}
