"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

export default function Dashboard({
  timeZone,
  initialBookings,
  initialAvailability,
}: {
  timeZone: string;
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

  async function refresh() {
    const [b, a] = await Promise.all([
      fetch("/api/admin/bookings").then((r) => r.json()),
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

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10">
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
        <ul className="mt-2 space-y-1 text-sm text-neutral-700">
          {avail.event_types.map((e) => (
            <li key={e.id}>
              <span className="font-medium">{e.name}</span> ({e.id}) —{" "}
              {e.durations.join(", ")} min
              {e.description ? ` — ${e.description}` : ""}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-neutral-500">
          Event types are edited via PUT /api/admin/availability (see README).
        </p>
      </section>
    </main>
  );
}
