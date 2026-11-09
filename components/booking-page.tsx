"use client";

import { useEffect, useMemo, useState } from "react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function calendarCells(y: number, m: number): (string | null)[] {
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(dateKey(y, m, d));
  return cells;
}

function todayInZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

type BookingResult = { bookingId: string; meetLink: string; cancelUrl: string };
type PublicEventType = {
  id: string;
  name: string;
  durations: number[];
  description?: string;
};

export default function BookingPage({ eventType }: { eventType: PublicEventType }) {
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [availability, setAvailability] = useState<Record<string, boolean> | null>(null);
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [duration, setDuration] = useState(
    eventType.durations.includes(30) ? 30 : eventType.durations[0]
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  const detectedTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
    []
  );
  const [displayTimeZone, setDisplayTimeZone] = useState(detectedTimeZone);
  const timeZones = useMemo(() => {
    const api = Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    };
    const zones = api.supportedValuesOf?.("timeZone") ?? [
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Europe/London",
      "Europe/Paris",
      "Asia/Kolkata",
      "Asia/Singapore",
      "Asia/Tokyo",
      "Australia/Sydney",
    ];
    return zones.includes(detectedTimeZone) ? zones : [detectedTimeZone, ...zones];
  }, [detectedTimeZone]);
  const todayForViewer = todayInZone(displayTimeZone);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/availability?month=${monthKey(month.y, month.m)}&eventType=${encodeURIComponent(eventType.id)}&timeZone=${encodeURIComponent(displayTimeZone)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAvailability(data.days ?? {});
        if (data.hostTimeZone) setTimeZone(data.hostTimeZone);
      })
      .catch(() => {
        if (!cancelled) setAvailability({});
      });
    return () => {
      cancelled = true;
    };
  }, [month, eventType.id, displayTimeZone]);

  async function loadSlots(date: string, dur: number) {
    setSlotsLoading(true);
    setSlots(null);
    setSelectedSlot(null);
    try {
      const r = await fetch(
        `/api/slots?date=${date}&duration=${dur}&eventType=${encodeURIComponent(eventType.id)}&timeZone=${encodeURIComponent(displayTimeZone)}`
      );
      const data = await r.json();
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  function shiftMonth(delta: number) {
    const d = new Date(month.y, month.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    setAvailability(null);
    setSelectedDate(null);
    setSlots(null);
    setSelectedSlot(null);
  }

  const isPrevDisabled =
    month.y === now.getFullYear() && month.m === now.getMonth();

  function fmtSlot(iso: string): string {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: displayTimeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  function fmtLong(iso: string): string {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: displayTimeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  }

  /** Format a "YYYY-MM-DD" host date without timezone shifting. */
  function fmtDateStr(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  }

  function fmtInZone(iso: string, tz: string): string {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          startUtc: selectedSlot,
          duration,
          name,
          email,
          notes,
          honeypot,
          eventType: eventType.id,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Booking failed. Please try again.");
        return;
      }
      setResult(data as BookingResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const cells = calendarCells(month.y, month.m);
  const slotEnd =
    selectedSlot !== null
      ? new Date(new Date(selectedSlot).getTime() + duration * 60000).toISOString()
      : null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
          meet.siv19.dev
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{eventType.name}</h1>
        <p className="mt-2 text-neutral-600">
          {eventType.description ||
            "Pick a time that works for you. You will get a confirmation email with the meeting link."}
        </p>
      </header>

      {result && selectedSlot && slotEnd ? (
        <section className="rounded-xl border border-green-300 bg-green-50 p-6">
          <h2 className="text-xl font-semibold text-green-900">You are booked!</h2>
          <p className="mt-3 text-neutral-800">
            {fmtLong(selectedSlot)} · {fmtSlot(selectedSlot)} –{" "}
            {fmtSlot(slotEnd)} ({displayTimeZone})
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            {fmtInZone(selectedSlot, timeZone)} – {fmtInZone(slotEnd, timeZone)} (
            {timeZone})
          </p>
          {result.meetLink && (
            <p className="mt-4">
              <span className="font-medium">Meet link: </span>
              <a
                className="break-all text-blue-700 underline"
                href={result.meetLink}
                target="_blank"
                rel="noreferrer"
              >
                {result.meetLink}
              </a>
            </p>
          )}
          <p className="mt-2 text-sm text-neutral-600">
            A confirmation email with a calendar invite is on its way. Need to cancel?
          </p>
          <p className="mt-1">
            <a className="text-blue-700 underline" href={result.cancelUrl}>
              Cancel this booking
            </a>
          </p>
          <button
            className="mt-6 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium"
            onClick={() => {
              setResult(null);
              setSelectedDate(null);
              setSlots(null);
              setSelectedSlot(null);
            }}
          >
            Book another time
          </button>
        </section>
      ) : (
        <>
          <section className="mb-6">
            <label className="mb-2 block text-sm font-semibold uppercase tracking-wide text-neutral-500" htmlFor="timezone">
              Your timezone
            </label>
            <select
              id="timezone"
              value={displayTimeZone}
              onChange={(e) => {
                setDisplayTimeZone(e.target.value);
                setAvailability(null);
                setSelectedDate(null);
                setSlots(null);
                setSelectedSlot(null);
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
            >
              {timeZones.map((zone) => (
                <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-500">
              Detected automatically. All available times are displayed in this timezone.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Duration
            </h2>
            <div className="flex gap-2">
              {eventType.durations.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDuration(d);
                    if (selectedDate) void loadSlots(selectedDate, d);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium ${
                    duration === d
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white hover:border-neutral-500"
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {MONTH_LABELS[month.m]} {month.y}
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  disabled={isPrevDisabled}
                  className="rounded-lg border border-neutral-300 px-3 py-1 text-sm disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="rounded-lg border border-neutral-300 px-3 py-1 text-sm"
                >
                  Next →
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-500">
              {WEEKDAY_LABELS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((dateStr, i) => {
                if (!dateStr) return <div key={`blank-${i}`} />;
                const dayNum = Number(dateStr.slice(-2));
                const isPast = dateStr < todayForViewer;
                const hasAvailability = availability?.[dateStr] === true;
                const disabled = isPast || !hasAvailability;
                const selected = selectedDate === dateStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={disabled || availability === null}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      void loadSlots(dateStr, duration);
                    }}
                    className={`aspect-square rounded-lg border text-sm font-medium ${
                      selected
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : disabled
                          ? "border-neutral-100 bg-neutral-50 text-neutral-300"
                          : "border-neutral-200 bg-white hover:border-neutral-500"
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Dates and times are shown in your selected timezone ({displayTimeZone}).
              Sivaganesh&apos;s availability is converted automatically from {timeZone}.
            </p>
          </section>

          {selectedDate && (
            <section className="mb-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Available times — {fmtDateStr(selectedDate)}
              </h2>
              {slotsLoading && <p className="text-sm text-neutral-500">Loading times…</p>}
              {!slotsLoading && slots !== null && slots.length === 0 && (
                <p className="text-sm text-neutral-500">
                  No times left on this day. Try another date.
                </p>
              )}
              {!slotsLoading && slots !== null && slots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                        selectedSlot === s
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 bg-white hover:border-neutral-500"
                      }`}
                    >
                      {fmtSlot(s)}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {selectedDate && selectedSlot && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Your details
              </h2>
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium" htmlFor="notes">
                    Notes <span className="font-normal text-neutral-500">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2"
                    rows={2}
                    placeholder="Anything Sivaganesh should know beforehand?"
                  />
                </div>
                {/* Honeypot: must stay empty. Bots fill it; humans never see it. */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    type="text"
                    autoComplete="off"
                    tabIndex={-1}
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-neutral-900 px-4 py-3 font-medium text-white disabled:opacity-50"
                >
                  {submitting
                    ? "Booking…"
                    : `Confirm — ${fmtDateStr(selectedDate)} at ${fmtSlot(selectedSlot)}`}
                </button>
              </form>
            </section>
          )}
        </>
      )}
    </main>
  );
}
