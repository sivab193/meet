import test from "node:test";
import assert from "node:assert/strict";
import { generateSlots, dayHasAvailability, windowForDate } from "../lib/slots";
import { zonedTimeToUtc } from "../lib/timezone";

const TZ = "America/New_York";

// Mon-Fri 09:00-17:00, Sat/Sun closed.
const WEEKDAYS_9_5 = [
  { day: 1, start: "09:00", end: "17:00" },
  { day: 2, start: "09:00", end: "17:00" },
  { day: 3, start: "09:00", end: "17:00" },
  { day: 4, start: "09:00", end: "17:00" },
  { day: 5, start: "09:00", end: "17:00" },
];

const EVERY_DAY_9_5 = [
  { day: 0, start: "09:00", end: "17:00" },
  ...WEEKDAYS_9_5,
  { day: 6, start: "09:00", end: "17:00" },
];

function base(over: Record<string, unknown> = {}) {
  return {
    date: "2026-11-02", // a Monday
    durationMinutes: 30,
    weeklyHours: WEEKDAYS_9_5,
    overrides: [],
    bookings: [],
    now: new Date("2026-10-30T12:00:00Z"),
    minNoticeMinutes: 60,
    slotStepMinutes: 30,
    maxDaysAhead: 60,
    timeZone: TZ,
    ...over,
  };
}

test("basic slot generation: Mon 09:00-17:00, 30-min slots", () => {
  const slots = generateSlots(base());
  // 2026-11-02 is EST (DST ended Nov 1): 09:00 EST = 14:00 UTC.
  assert.equal(slots.length, 16);
  assert.equal(slots[0].toISOString(), "2026-11-02T14:00:00.000Z");
  assert.equal(slots[15].toISOString(), "2026-11-02T21:30:00.000Z");
});

test("60-min duration fits fully inside the window only", () => {
  const slots = generateSlots(base({ durationMinutes: 60 }));
  assert.equal(slots.length, 15);
  assert.equal(slots[0].toISOString(), "2026-11-02T14:00:00.000Z");
  assert.equal(slots[14].toISOString(), "2026-11-02T21:00:00.000Z");
});

test("weekend is closed under Mon-Fri hours", () => {
  assert.deepEqual(generateSlots(base({ date: "2026-11-07" })), []); // Saturday
  assert.equal(dayHasAvailability("2026-11-07", WEEKDAYS_9_5, []), false);
  assert.equal(dayHasAvailability("2026-11-02", WEEKDAYS_9_5, []), true);
});

test("override blocking a day removes all slots", () => {
  const slots = generateSlots(
    base({
      overrides: [
        { date: "2026-11-02", start_time: null, end_time: null, is_unavailable: true },
      ],
    })
  );
  assert.deepEqual(slots, []);
  assert.equal(
    dayHasAvailability("2026-11-02", WEEKDAYS_9_5, [
      { date: "2026-11-02", start_time: null, end_time: null, is_unavailable: true },
    ]),
    false
  );
});

test("override with custom hours replaces weekly hours", () => {
  const slots = generateSlots(
    base({
      overrides: [
        { date: "2026-11-02", start_time: "10:00", end_time: "12:00", is_unavailable: false },
      ],
    })
  );
  assert.equal(slots.length, 4);
  assert.equal(slots[0].toISOString(), "2026-11-02T15:00:00.000Z"); // 10:00 EST
  assert.equal(slots[3].toISOString(), "2026-11-02T16:30:00.000Z"); // 11:30 EST
});

test("override can open a normally closed day", () => {
  const slots = generateSlots(
    base({
      date: "2026-11-07", // Saturday
      overrides: [
        { date: "2026-11-07", start_time: "10:00", end_time: "11:00", is_unavailable: false },
      ],
    })
  );
  assert.equal(slots.length, 2);
  assert.equal(windowForDate("2026-11-07", WEEKDAYS_9_5, [])?.start, undefined);
});

test("booking overlap removes the colliding slots", () => {
  const slots = generateSlots(
    base({
      durationMinutes: 30,
      bookings: [
        { start: new Date("2026-11-02T15:00:00Z"), end: new Date("2026-11-02T15:30:00Z") }, // 10:00-10:30 EST
      ],
    })
  );
  assert.equal(slots.length, 15);
  assert.ok(!slots.some((s) => s.toISOString() === "2026-11-02T15:00:00.000Z"));
  assert.ok(slots.some((s) => s.toISOString() === "2026-11-02T14:30:00.000Z"));
  assert.ok(slots.some((s) => s.toISOString() === "2026-11-02T15:30:00.000Z"));
});

test("booking overlap removes every start that touches it for long durations", () => {
  const slots = generateSlots(
    base({
      durationMinutes: 60,
      bookings: [
        { start: new Date("2026-11-02T15:00:00Z"), end: new Date("2026-11-02T15:30:00Z") },
      ],
    })
  );
  // 60-min slots starting 09:30 and 10:00 EST both overlap 10:00-10:30.
  assert.ok(!slots.some((s) => s.toISOString() === "2026-11-02T14:30:00.000Z"));
  assert.ok(!slots.some((s) => s.toISOString() === "2026-11-02T15:00:00.000Z"));
  assert.ok(slots.some((s) => s.toISOString() === "2026-11-02T15:30:00.000Z"));
});

test("min-notice cutoff", () => {
  // Now 13:00 UTC = 08:00 EST; 60-min notice -> earliest 09:00 EST slot is OK.
  let slots = generateSlots(base({ now: new Date("2026-11-02T13:00:00Z") }));
  assert.equal(slots[0].toISOString(), "2026-11-02T14:00:00.000Z");
  // Now 13:30 UTC = 08:30 EST; earliest 09:30 EST.
  slots = generateSlots(base({ now: new Date("2026-11-02T13:30:00Z") }));
  assert.equal(slots[0].toISOString(), "2026-11-02T14:30:00.000Z");
  // Now 16:00 UTC = 11:00 EST; earliest 12:00 EST.
  slots = generateSlots(base({ now: new Date("2026-11-02T16:00:00Z") }));
  assert.equal(slots[0].toISOString(), "2026-11-02T17:00:00.000Z");
});

test("past dates and dates beyond maxDaysAhead offer nothing", () => {
  assert.deepEqual(generateSlots(base({ date: "2026-10-29" })), []); // before "today" (Oct 30)
  assert.deepEqual(generateSlots(base({ date: "2026-12-31" })), []); // > 60 days ahead
  assert.ok(generateSlots(base({ date: "2026-12-29" })).length > 0); // exactly 60 days ahead
});

test("DST ends 2026-11-01: 09:00 wall = 14:00 UTC (EST)", () => {
  assert.equal(
    zonedTimeToUtc(2026, 11, 1, 9, 0, TZ).toISOString(),
    "2026-11-01T14:00:00.000Z"
  );
  // Day before, still EDT: 09:00 wall = 13:00 UTC.
  assert.equal(
    zonedTimeToUtc(2026, 10, 31, 9, 0, TZ).toISOString(),
    "2026-10-31T13:00:00.000Z"
  );
  // Full slot list on the 25-hour DST-end Sunday still follows wall clock.
  const slots = generateSlots(
    base({
      date: "2026-11-01",
      weeklyHours: EVERY_DAY_9_5,
      now: new Date("2026-10-30T12:00:00Z"),
    })
  );
  assert.equal(slots.length, 16);
  assert.equal(slots[0].toISOString(), "2026-11-01T14:00:00.000Z");
});

test("DST starts 2027-03-14: 09:00 wall = 13:00 UTC (EDT)", () => {
  assert.equal(
    zonedTimeToUtc(2027, 3, 14, 9, 0, TZ).toISOString(),
    "2027-03-14T13:00:00.000Z"
  );
  // Day before, still EST: 09:00 wall = 14:00 UTC.
  assert.equal(
    zonedTimeToUtc(2027, 3, 13, 9, 0, TZ).toISOString(),
    "2027-03-13T14:00:00.000Z"
  );
  const slots = generateSlots(
    base({
      date: "2027-03-14",
      weeklyHours: EVERY_DAY_9_5,
      now: new Date("2027-03-01T12:00:00Z"),
    })
  );
  assert.equal(slots.length, 16);
  assert.equal(slots[0].toISOString(), "2027-03-14T13:00:00.000Z");
});

test("invalid inputs produce no slots", () => {
  assert.deepEqual(generateSlots(base({ date: "not-a-date" })), []);
  assert.deepEqual(generateSlots(base({ date: "2026-02-30" })), []);
  assert.deepEqual(generateSlots(base({ durationMinutes: 0 })), []);
  assert.deepEqual(generateSlots(base({ slotStepMinutes: 0 })), []);
});
