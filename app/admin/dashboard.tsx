"use client";

import {
  CalendarDays,
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  ListChecks,
  LogOut,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, Badge, Button, Card, cn, inputClass } from "@/components/ui";
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

const smallInput = cn(inputClass, "w-auto px-2.5 py-1.5");

function SectionHeader({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          {icon}
        </span>
        <div>
          <h2 className="font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
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

  const isError = message !== null && /fail|error|required|pick/i.test(message);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Times use {timeZone}.</p>
        </div>
        <Button variant="secondary" onClick={logout}>
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>

      {message && (
        <div className="mt-5">
          <Alert tone={isError ? "danger" : "success"}>{message}</Alert>
        </div>
      )}

      <Card className="mt-8 p-5 sm:p-6">
        <SectionHeader
          icon={<CalendarDays className="size-4" />}
          title="Private calendar"
          description="Full booking details are visible only in this signed-in workspace."
        >
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" aria-label="Previous month" onClick={() => shiftCalendarMonth(-1)} className="size-8 px-0">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-semibold">{monthLabel}</span>
            <Button variant="ghost" size="sm" aria-label="Next month" onClick={() => shiftCalendarMonth(1)} className="size-8 px-0">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </SectionHeader>
        <div className="mt-5 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {calendarCells.map((date, index) => {
            if (!date) return <div key={`empty-${index}`} className="min-h-24 bg-muted/50" />;
            const items = calendarBookings[date] ?? [];
            return (
              <div key={date} className="min-h-24 bg-card p-2">
                <div className="text-xs font-semibold text-muted-foreground">{Number(date.slice(-2))}</div>
                <div className="mt-1 space-y-1">
                  {items.map((booking) => (
                    <div
                      key={booking.id}
                      title={`${booking.booker_name} · ${booking.booker_email}${booking.notes ? ` · ${booking.notes}` : ""}`}
                      className={cn(
                        "truncate rounded-md px-1.5 py-1 text-[11px] leading-tight",
                        booking.status === "confirmed"
                          ? "bg-primary-soft text-primary-soft-foreground"
                          : "bg-muted text-muted-foreground line-through"
                      )}
                    >
                      {new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(booking.start_utc))} {booking.booker_name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <SectionHeader icon={<Users className="size-4" />} title="Upcoming bookings">
          <Badge tone="primary">{upcoming.length} confirmed</Badge>
        </SectionHeader>
        {upcoming.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            No upcoming bookings.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 bg-background/40 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {b.booker_name}{" "}
                    <span className="font-normal text-muted-foreground">· {fmtWhen(b.start_utc, timeZone)}</span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {b.booker_email}
                    {b.notes ? ` · ${b.notes}` : ""}
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => cancelBooking(b.id)}>
                  <X className="size-3.5" />
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        )}
        {past.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            {past.length} cancelled booking{past.length === 1 ? "" : "s"} in this range.
          </p>
        )}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={<Clock className="size-4" />}
            title="Weekly hours"
            description={`Times are in ${timeZone}. Unchecked days are closed.`}
          />
          <div className="mt-5 space-y-2">
            {days.map((d, i) => (
              <div key={DAY_NAMES[i]} className="flex flex-wrap items-center gap-3">
                <label className="flex w-32 items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={d.on}
                    className="size-4 accent-[var(--primary)]"
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
                  className={smallInput}
                />
                <span className="text-sm text-muted-foreground">to</span>
                <input
                  type="time"
                  value={d.end}
                  disabled={!d.on}
                  onChange={(e) =>
                    setDays(days.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))
                  }
                  className={smallInput}
                />
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-muted-foreground">
              Min notice (min)
              <input type="number" min={0} value={minNotice} onChange={(e) => setMinNotice(Number(e.target.value))} className={cn(inputClass, "mt-1 py-1.5")} />
            </label>
            <label className="text-sm text-muted-foreground">
              Slot step (min)
              <input type="number" min={5} value={slotStep} onChange={(e) => setSlotStep(Number(e.target.value))} className={cn(inputClass, "mt-1 py-1.5")} />
            </label>
            <label className="text-sm text-muted-foreground">
              Max days ahead
              <input type="number" min={1} value={maxDays} onChange={(e) => setMaxDays(Number(e.target.value))} className={cn(inputClass, "mt-1 py-1.5")} />
            </label>
          </div>
          <Button onClick={saveHours} disabled={saving} className="mt-5">
            <Save className="size-4" />
            {saving ? "Saving…" : "Save hours & settings"}
          </Button>
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionHeader
            icon={<CalendarOff className="size-4" />}
            title="Date overrides"
            description="One-off changes for specific dates. An override wins over weekly hours."
          />
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <input type="date" value={ovDate} onChange={(e) => setOvDate(e.target.value)} className={smallInput} />
            <input type="time" value={ovStart} disabled={ovUnavailable} onChange={(e) => setOvStart(e.target.value)} className={smallInput} />
            <span className="text-sm text-muted-foreground">to</span>
            <input type="time" value={ovEnd} disabled={ovUnavailable} onChange={(e) => setOvEnd(e.target.value)} className={smallInput} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ovUnavailable}
                className="size-4 accent-[var(--primary)]"
                onChange={(e) => setOvUnavailable(e.target.checked)}
              />
              Unavailable all day
            </label>
          </div>
          <Button onClick={addOverride} disabled={saving} className="mt-4">
            <Plus className="size-4" />
            Add override
          </Button>
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {avail.overrides.length === 0 && (
              <li className="px-4 py-4 text-center text-sm text-muted-foreground">No overrides yet.</li>
            )}
            {avail.overrides.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 bg-background/40 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-mono font-medium">{o.date}</span>{" "}
                  <span className="text-muted-foreground">
                    · {o.is_unavailable ? "Unavailable all day" : `${o.start_time} – ${o.end_time}`}
                  </span>
                </span>
                <Button variant="ghost" size="sm" aria-label={`Delete override for ${o.date}`} onClick={() => deleteOverride(o.id)} className="size-8 px-0">
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <SectionHeader
          icon={<ListChecks className="size-4" />}
          title="Event types"
          description="Each slug becomes a public booking link. Visitors see open slots, never private calendar details."
        />
        <div className="mt-5 space-y-3">
          {avail.event_types.map((event, index) => (
            <div key={`${event.id}-${index}`} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Name
                  <input value={event.name} onChange={(e) => updateEvent(index, { name: e.target.value })} className={cn(inputClass, "mt-1 font-normal")} />
                </label>
                <label className="text-sm font-medium">Link slug
                  <input value={event.id} onChange={(e) => updateEvent(index, { id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })} className={cn(inputClass, "mt-1 font-mono font-normal")} />
                </label>
                <label className="text-sm font-medium sm:col-span-2">Description
                  <input value={event.description ?? ""} onChange={(e) => updateEvent(index, { description: e.target.value })} className={cn(inputClass, "mt-1 font-normal")} />
                </label>
                <label className="text-sm font-medium">Durations (minutes, comma separated)
                  <input value={event.durations.join(", ")} onChange={(e) => updateEvent(index, { durations: e.target.value.split(",").map(Number).filter((value) => Number.isInteger(value) && value > 0) })} className={cn(inputClass, "mt-1 font-normal")} />
                </label>
                <div className="flex items-end justify-between gap-3">
                  <a href={`/${event.id}`} target="_blank" className="inline-flex items-center gap-1.5 break-all pb-2.5 font-mono text-sm text-primary hover:underline">
                    /{event.id}
                    <ExternalLink className="size-3.5" />
                  </a>
                  <Button variant="danger" onClick={() => removeEvent(index)}>
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={addEvent}>
            <Plus className="size-4" />
            Add event type
          </Button>
          <Button onClick={saveEvents} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving…" : "Save event types"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
