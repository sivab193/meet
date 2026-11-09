"use client";

import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe2,
  Loader2,
  Mail,
  User,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Label, Monogram, SectionLabel, buttonClass, cn, inputClass } from "./ui";
import { ScrollArea } from "./ui/scroll-area";
import { TimezoneCombobox } from "./ui/timezone-combobox";

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

  const summary = (
    <Card className="p-6 lg:sticky lg:top-24">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        All meeting types
      </Link>

      <div className="mt-5 flex items-center gap-3">
        <Monogram className="size-11 text-base" />
        <div>
          <p className="text-xs text-muted-foreground">Meeting with</p>
          <p className="font-semibold">Sivaganesh Balaganesh</p>
        </div>
      </div>

      <h1 className="mt-5 text-2xl font-bold tracking-tight text-balance">{eventType.name}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {eventType.description ||
          "Pick a time that works for you. You will get a confirmation email with the meeting link."}
      </p>

      <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2.5">
          <Clock className="size-4 text-primary" />
          {duration} minutes
        </li>
        <li className="flex items-center gap-2.5">
          <Video className="size-4 text-primary" />
          Google Meet, link shared after booking
        </li>
        {selectedSlot && slotEnd && (
          <li className="flex items-start gap-2.5 text-foreground">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              {fmtLong(selectedSlot)}
              <br />
              {fmtSlot(selectedSlot)} â€“ {fmtSlot(slotEnd)}
            </span>
          </li>
        )}
      </ul>

      {!result && (
        <>
          <div className="my-6 h-px bg-border" />

          <SectionLabel icon={<Clock className="size-3.5" />}>Duration</SectionLabel>
          <div role="radiogroup" aria-label="Duration" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {eventType.durations.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={duration === d}
                onClick={() => {
                  setDuration(d);
                  if (selectedDate) void loadSlots(selectedDate, d);
                }}
                className={cn(
                  "rounded-lg px-2 py-2 text-sm font-medium transition-all",
                  duration === d
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {d} min
              </button>
            ))}
          </div>

          <SectionLabel icon={<Globe2 className="size-3.5" />} className="mt-6">
            <label htmlFor="timezone">Your timezone</label>
          </SectionLabel>
          <TimezoneCombobox
            id="timezone"
            value={displayTimeZone}
            zones={timeZones}
            detectedZone={detectedTimeZone}
            onValueChange={(zone) => {
              setDisplayTimeZone(zone);
              setAvailability(null);
              setSelectedDate(null);
              setSlots(null);
              setSelectedSlot(null);
            }}
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Detected automatically. Sivaganesh&apos;s hours are converted from {timeZone}.
          </p>
        </>
      )}
    </Card>
  );

  if (result && selectedSlot && slotEnd) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16 md:px-8">
        <Card className="animate-fade-up overflow-hidden">
          <div className="relative border-b border-border bg-success-soft px-6 py-8 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success text-white shadow-lg shadow-success/30 dark:text-[#04140d]">
              <Check className="size-7" strokeWidth={3} />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">You&apos;re booked!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A confirmation email with a calendar invite is on its way.
            </p>
          </div>

          <dl className="space-y-4 px-6 py-6 text-sm">
            <div className="flex gap-3">
              <dt className="sr-only">Meeting</dt>
              <Video className="mt-0.5 size-4 shrink-0 text-primary" />
              <dd className="font-medium">{eventType.name} Â· {duration} min</dd>
            </div>
            <div className="flex gap-3">
              <dt className="sr-only">When</dt>
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
              <dd>
                <p className="font-medium">
                  {fmtLong(selectedSlot)} Â· {fmtSlot(selectedSlot)} â€“ {fmtSlot(slotEnd)}
                </p>
                <p className="text-muted-foreground">{displayTimeZone}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fmtInZone(selectedSlot, timeZone)} â€“ {fmtInZone(slotEnd, timeZone)} ({timeZone})
                </p>
              </dd>
            </div>
            {result.meetLink && (
              <div className="flex gap-3">
                <dt className="sr-only">Meeting link</dt>
                <CalendarPlus className="mt-0.5 size-4 shrink-0 text-primary" />
                <dd className="min-w-0">
                  <a
                    className="break-all font-medium text-primary underline-offset-4 hover:underline"
                    href={result.meetLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.meetLink}
                  </a>
                </dd>
              </div>
            )}
          </dl>

          <div className="flex flex-col gap-2 border-t border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <a href={result.cancelUrl} className="text-sm text-muted-foreground underline-offset-4 hover:text-danger hover:underline">
              Need to cancel this booking?
            </a>
            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setSelectedDate(null);
                setSlots(null);
                setSelectedSlot(null);
              }}
            >
              Book another time
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:py-14 md:px-8 lg:grid-cols-[22rem_1fr]">
      <div className="animate-fade-up">{summary}</div>

      <div className="animate-fade-up space-y-6" style={{ animationDelay: "80ms" }}>
        <Card className="p-5 sm:p-6">
          <div className="grid gap-6 md:grid-cols-[1fr_13rem]">
            <section aria-label="Choose a date">
              <div className="mb-4 flex items-center justify-between">
                <SectionLabel icon={<CalendarDays className="size-3.5" />} className="mb-0 hidden sm:flex">
                  Select a date
                </SectionLabel>
                <div className="flex w-full items-center justify-between gap-1 sm:w-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous month"
                    onClick={() => shiftMonth(-1)}
                    disabled={isPrevDisabled}
                    
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="min-w-32 text-center text-sm font-semibold">
                    {MONTH_LABELS[month.m]} {month.y}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Next month"
                    onClick={() => shiftMonth(1)}
                    
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {WEEKDAY_LABELS.map((d) => (
                  <div key={d} className="py-1.5">
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
                  const isToday = dateStr === todayForViewer;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={disabled || availability === null}
                      aria-pressed={selected}
                      aria-label={fmtDateStr(dateStr)}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        void loadSlots(dateStr, duration);
                      }}
                      className={cn(
                        "relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        availability === null && "animate-pulse",
                        selected
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                          : disabled
                            ? "text-muted-foreground/40"
                            : "bg-primary-soft text-primary-soft-foreground hover:bg-primary hover:text-primary-foreground"
                      )}
                    >
                      {dayNum}
                      {isToday && !selected && (
                        <span className="absolute bottom-1.5 size-1 rounded-full bg-current" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-label="Choose a time" className="md:border-l md:border-border md:pl-6">
              <SectionLabel icon={<Clock className="size-3.5" />}>
                {selectedDate ? fmtDateStr(selectedDate).replace(/, \d{4}$/, "") : "Select a time"}
              </SectionLabel>
              {!selectedDate && (
                <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground md:h-[calc(100%-2rem)]">
                  <CalendarDays className="size-5" />
                  Pick a highlighted date
                  <br />
                  to see open times.
                </div>
              )}
              {selectedDate && slotsLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              )}
              {selectedDate && !slotsLoading && slots !== null && slots.length === 0 && (
                <p className="rounded-xl bg-muted px-3 py-4 text-center text-sm text-muted-foreground">
                  No times left on this day. Try another date.
                </p>
              )}
              {selectedDate && !slotsLoading && slots !== null && slots.length > 0 && (
                <ScrollArea viewportClassName="max-h-80" className="-mr-3">
                  <div className="grid grid-cols-3 gap-2 pr-3 sm:grid-cols-4 md:grid-cols-1">
                    {slots.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={selectedSlot === s}
                        onClick={() => setSelectedSlot(s)}
                        className={cn(
                          "h-10 rounded-xl border text-sm font-medium transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                          selectedSlot === s
                            ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                            : "border-border bg-background hover:border-primary hover:text-primary"
                        )}
                      >
                        {fmtSlot(s)}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </section>
          </div>
          <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe2 className="size-3.5" />
            Times shown in {displayTimeZone.replaceAll("_", " ")}
          </p>
        </Card>

        {selectedDate && selectedSlot && (
          <Card className="animate-fade-up p-5 sm:p-6">
            <SectionLabel icon={<User className="size-3.5" />}>Your details</SectionLabel>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={cn(inputClass, "pl-9")}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn(inputClass, "pl-9")}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">
                  Notes <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={cn(inputClass, "resize-y")}
                  rows={3}
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
              {error && <Alert>{error}</Alert>}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Badge tone="primary" className="self-start sm:self-auto">
                  <CalendarDays className="size-3" />
                  {fmtDateStr(selectedDate).replace(/, \d{4}$/, "")} Â· {fmtSlot(selectedSlot)}
                </Badge>
                <button type="submit" disabled={submitting} className={cn(buttonClass("primary", "lg"), "sm:min-w-48")}>
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Bookingâ€¦
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      Confirm booking
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </main>
  );
}
