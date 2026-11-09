"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { BookingRow } from "@/lib/bookings";
import type { EventType, OverrideRow } from "@/lib/settings";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type AvailabilityState = {
  weekly_hours: ({ day: number; start: string; end: string } | null)[];
  overrides: OverrideRow[];
  min_notice_minutes: number;
  slot_step_minutes: number;
  max_days_ahead: number;
  event_types: EventType[];
};

type DayRow = { on: boolean; start: string; end: string };

function toDayRows(weeklyHours: AvailabilityState["weekly_hours"]): DayRow[] {
  return DAY_NAMES.map((_, day) => {
    const e = weeklyHours.find((x) => x !== null && x.day === day) ?? null;
    return e ? { on: true, start: e.start, end: e.end } : { on: false, start: "09:00", end: "17:00" };
  });
}

function fmtWhen(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function dateInZone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const result: (string | null)[] = Array.from({ length: first }, () => null);
  for (let day = 1; day <= count; day++) {
    result.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  return result;
}

export default function Dashboard({
  timeZone,
  calendarFrom,
  calendarTo,
  initialBookings,
  initialAvailability,
}: {
  timeZone: string;
  calendarFrom: string;
  calendarTo: string;
  initialBookings: BookingRow[];
  initialAvailability: AvailabilityState;
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingRow[]>(initialBookings);
  const [avail, setAvail] = useState<AvailabilityState>(initialAvailability);
  const [days, setDays] = useState<DayRow[]>(() => toDayRows(initialAvailability.weekly_hours));
  const [minNotice, setMinNotice] = useState(initialAvailability.min_notice_minutes);
  const [slotStep, setSlotStep] = useState(initialAvailability.slot_step_minutes);
  const [maxDays, setMaxDays] = useState(initialAvailability.max_days_ahead);
  const [ovDate, setOvDate] = useState("");
  const [ovStart, setOvStart] = useState("09:00");
  const [ovEnd, setOvEnd] = useState("17:00");
  const [ovUnavailable, setOvUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const initialCalendarDate = new Date();
  const [calendarMonth, setCalendarMonth] = useState({
    year: initialCalendarDate.getFullYear(),
    month: initialCalendarDate.getMonth(),
  });

  async function refresh() {
    const [b, a] = await Promise.all([
      fetch(`/api/admin/bookings?from=${calendarFrom}&to=${calendarTo}`).then((r) => r.json()),
      fetch("/api/admin/availability").then((r) => r.json()),
    ]);
    if (Array.isArray(b.bookings)) setBookings(b.bookings);
    if (a.weekly_hours) {
      setAvail(a as AvailabilityState);
      setDays(toDayRows(a.weekly_hours));
      setMinNotice(a.min_notice_minutes);
      setSlotStep(a.slot_step_minutes);
      setMaxDays(a.max_days_ahead);
    }
  }

  async function putAvailability(body: Record<string, unknown>) {
    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch("/api/admin/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        setMessage(data.error ?? "Save failed.");
        return;
      }
      setMessage("Saved.");
      await refresh();
    } catch {
      setMessage("Network error.");
    } finally {
      setSaving(false);
    }
  }

  function saveHours() {
    const weekly_hours = days
      .map((d, i) => (d.on ? { day: i, start: d.start, end: d.end } : null))
      .filter((x): x is { day: number; start: string; end: string } => x !== null);
    putAvailability({
      weekly_hours,
      min_notice_minutes: minNotice,
      slot_step_minutes: slotStep,
      max_days_ahead: maxDays,
    });
  }

  function addOverride() {
    if (!ovDate) {
      setMessage("Pick a date for the override.");
      return;
    }
    putAvailability({
      overrides: {
        upsert: [
          {
            date: ovDate,
            start_time: ovUnavailable ? null : ovStart,
            end_time: ovUnavailable ? null : ovEnd,
            is_unavailable: ovUnavailable,
          },
        ],
      },
    });
    setOvDate("");
    setOvUnavailable(false);
  }

  function deleteOverride(id: string) {
    putAvailability({ overrides: { delete: [id] } });
  }

  function updateEvent(index: number, patch: Partial<EventType>) {
    setAvail((current) => ({
      ...current,
      event_types: current.event_types.map((event, i) =>
        i === index ? { ...event, ...patch } : event
      ),
    }));
  }

  function addEvent() {
    const suffix = avail.event_types.length + 1;
    setAvail((current) => ({
      ...current,
      event_types: [
        ...current.event_types,
        { id: `meeting-${suffix}`, name: `Meeting ${suffix}`, durations: [30], description: "" },
      ],
    }));
  }

  function removeEvent(index: number) {
    if (avail.event_types.length === 1) {
      setMessage("At least one event type is required.");
      return;
    }
    setAvail((current) => ({
      ...current,
      event_types: current.event_types.filter((_, i) => i !== index),
    }));
  }

  function saveEvents() {
    putAvailability({ event_types: avail.event_types });
  }

  async function cancelBooking(id: string) {
    setMessage(null);
    const r = await fetch(`/api/admin/bookings/${id}/cancel`, { method: "POST" });
    if (!r.ok) {
      setMessage("Cancel failed.");
      return;
    }
    setMessage("Booking cancelled.");
    await refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  const upcoming = bookings.filter((b) => b.status === "confirmed");
  const past = bookings.filter((b) => b.status !== "confirmed");
  const calendarBookings = useMemo(() => {
    const grouped: Record<string, BookingRow[]> = {};
    for (const booking of bookings) {
      const date = dateInZone(booking.start_utc, timeZone);
      (grouped[date] ??= []).push(booking);
    }
    return grouped;
  }, [bookings, timeZone]);
  const calendarCells = monthCells(calendarMonth.year, calendarMonth.month);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(calendarMonth.year, calendarMonth.month, 1)));

  function shiftCalendarMonth(delta: number) {
    const next = new Date(Date.UTC(calendarMonth.year, calendarMonth.month + delta, 1));
    setCalendarMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <button
          onClick={logout}
          className="rounded-lg border border-neutral-300 px-3 py-1 text-sm"
        >
          Sign out
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-neutral-100 px-3 py-2 text-sm">{message}</p>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Private calendar</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Full booking details are visible only in this signed-in workspace. Times use {timeZone}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => shiftCalendarMonth(-1)} className="rounded-lg border border-neutral-300 px-3 py-1 text-sm">←</button>
            <span className="min-w-40 text-center text-sm font-semibold">{monthLabel}</span>
            <button onClick={() => shiftCalendarMonth(1)} className="rounded-lg border border-neutral-300 px-3 py-1 text-sm">→</button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 gap-px">
          {calendarCells.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="min-h-24 bg-neutral-50" />;
            const items = calendarBookings[date] ?? [];
            return (
              <div key={date} className="min-h-24 bg-white p-2">
                <div className="text-xs font-semibold text-neutral-500">{Number(date.slice(-2))}</div>
                <div className="mt-1 space-y-1">
                  {items.map((booking) => (
                    <div
                      key={booking.id}
                      title={`${booking.booker_name} · ${booking.booker_email}${booking.notes ? ` · ${booking.notes}` : ""}`}
                      className={`truncate rounded px-1.5 py-1 text-[11px] leading-tight ${booking.status === "confirmed" ? "bg-emerald-100 text-emerald-900" : "bg-neutral-100 text-neutral-500 line-through"}`}
                    >
                      {new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(booking.start_utc))} {booking.booker_name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Upcoming bookings (next 30 days)</h2>
        {upcoming.length === 0 && (
          <p className="mt-2 text-sm text-neutral-500">No upcoming bookings.</p>
        )}
        <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {upcoming.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">
                  {b.booker_name} · {fmtWhen(b.start_utc, timeZone)} (ET)
                </p>
                <p className="text-sm text-neutral-600">
                  {b.booker_email}
                  {b.notes ? ` — ${b.notes}` : ""}
                </p>
              </div>
              <button
                onClick={() => cancelBooking(b.id)}
                className="shrink-0 rounded-lg border border-red-300 px-3 py-1 text-sm text-red-700"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
        {past.length > 0 && (
          <p className="mt-2 text-sm text-neutral-500">
            {past.length} cancelled booking{past.length === 1 ? "" : "s"} in this range.
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Weekly hours</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Times are in America/New_York. Unchecked days are closed.
        </p>
        <div className="mt-3 space-y-2">
          {days.map((d, i) => (
            <div key={DAY_NAMES[i]} className="flex items-center gap-3">
              <label className="flex w-32 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={d.on}
                  onChange={(e) =>
                    setDays(days.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))
                  }
                />
                {DAY_NAMES[i]}
              </label>
              <input
                type="time"
                value={d.start}
                disabled={!d.on}
                onChange={(e) =>
                  setDays(days.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))
                }
                className="rounded-lg border border-neutral-300 px-2 py-1 text-sm disabled:opacity-40"
              />
              <span className="text-sm text-neutral-500">to</span>
              <input
                type="time"
                value={d.end}
                disabled={!d.on}
                onChange={(e) =>
                  setDays(days.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))
                }
                className="rounded-lg border border-neutral-300 px-2 py-1 text-sm disabled:opacity-40"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="text-sm">
            Min notice (min)
            <input
              type="number"
              min={0}
              value={minNotice}
              onChange={(e) => setMinNotice(Number(e.target.value))}
              className="ml-2 w-20 rounded-lg border border-neutral-300 px-2 py-1"
            />
          </label>
          <label className="text-sm">
            Slot step (min)
            <input
              type="number"
              min={5}
              value={slotStep}
              onChange={(e) => setSlotStep(Number(e.target.value))}
              className="ml-2 w-20 rounded-lg border border-neutral-300 px-2 py-1"
            />
          </label>
          <label className="text-sm">
            Max days ahead
            <input
              type="number"
              min={1}
              value={maxDays}
              onChange={(e) => setMaxDays(Number(e.target.value))}
              className="ml-2 w-20 rounded-lg border border-neutral-300 px-2 py-1"
            />
          </label>
        </div>
        <button
          onClick={saveHours}
          disabled={saving}
          className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save hours & settings"}
        </button>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Date overrides</h2>
        <p className="mt-1 text-sm text-neutral-500">
          One-off changes for specific dates. An override wins over weekly hours.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={ovDate}
            onChange={(e) => setOvDate(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
          />
          <input
            type="time"
            value={ovStart}
            disabled={ovUnavailable}
            onChange={(e) => setOvStart(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm disabled:opacity-40"
          />
          <span className="text-sm text-neutral-500">to</span>
          <input
            type="time"
            value={ovEnd}
            disabled={ovUnavailable}
            onChange={(e) => setOvEnd(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-1 text-sm disabled:opacity-40"
          />
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={ovUnavailable}
              onChange={(e) => setOvUnavailable(e.target.checked)}
            />
            Unavailable all day
          </label>
          <button
            onClick={addOverride}
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
          >
            Add override
          </button>
        </div>
        <ul className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {avail.overrides.length === 0 && (
            <li className="px-4 py-3 text-sm text-neutral-500">No overrides yet.</li>
          )}
          {avail.overrides.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <span>
                <span className="font-medium">{o.date}</span> —{" "}
                {o.is_unavailable
                  ? "Unavailable all day"
                  : `${o.start_time} – ${o.end_time}`}
              </span>
              <button
                onClick={() => deleteOverride(o.id)}
                className="rounded-lg border border-neutral-300 px-2 py-0.5 text-xs"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Event types</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Each slug becomes a public booking link. Visitors see open slots, never private calendar details.
        </p>
        <div className="mt-3 space-y-3">
          {avail.event_types.map((event, index) => (
            <div key={`${event.id}-${index}`} className="rounded-xl border border-neutral-200 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Name
                  <input value={event.name} onChange={(e) => updateEvent(index, { name: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
                </label>
                <label className="text-sm font-medium">Link slug
                  <input value={event.id} onChange={(e) => updateEvent(index, { id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono font-normal" />
                </label>
                <label className="text-sm font-medium sm:col-span-2">Description
                  <input value={event.description ?? ""} onChange={(e) => updateEvent(index, { description: e.target.value })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
                </label>
                <label className="text-sm font-medium">Durations (minutes, comma separated)
                  <input value={event.durations.join(", ")} onChange={(e) => updateEvent(index, { durations: e.target.value.split(",").map(Number).filter((value) => Number.isInteger(value) && value > 0) })} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-normal" />
                </label>
                <div className="flex items-end justify-between gap-3">
                  <a href={`/${event.id}`} target="_blank" className="break-all pb-2 text-sm text-blue-700 underline">/{event.id}</a>
                  <button onClick={() => removeEvent(index)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={addEvent} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium">Add event type</button>
          <button onClick={saveEvents} disabled={saving} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving…" : "Save event types"}</button>
        </div>
      </section>
    </main>
  );
}
