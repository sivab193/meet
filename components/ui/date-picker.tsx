"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { cn, popoverClass, triggerClass } from "./index";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function todayKey() {
  const t = new Date();
  return toKey(t.getFullYear(), t.getMonth(), t.getDate());
}

function formatKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Popover calendar for picking a "YYYY-MM-DD" date. */
export function DatePicker({
  value,
  onValueChange,
  placeholder = "Pick a date",
  minDate,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  minDate?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const base = value || todayKey();
  const [view, setView] = useState(() => ({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 }));
  const today = todayKey();

  const first = new Date(view.y, view.m, 1).getDay();
  const count = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first }, () => null);
  for (let d = 1; d <= count; d++) cells.push(toKey(view.y, view.m, d));

  function shift(delta: number) {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }

  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(view.y, view.m, 1)
  );
  const navBtn =
    "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && value) setView({ y: Number(value.slice(0, 4)), m: Number(value.slice(5, 7)) - 1 });
      }}
    >
      <Popover.Trigger asChild>
        <button type="button" className={cn(triggerClass, "py-2", className)}>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
            {value ? formatKey(value) : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} className={cn(popoverClass, "w-72 p-3")}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" className={navBtn} onClick={() => shift(-1)}>
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-semibold">{monthLabel}</span>
            <button type="button" aria-label="Next month" className={navBtn} onClick={() => shift(1)}>
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((key, i) => {
              if (!key) return <div key={`b-${i}`} />;
              const disabled = minDate !== undefined && key < minDate;
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onValueChange(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "bg-primary font-semibold text-primary-foreground"
                      : disabled
                        ? "text-muted-foreground/40"
                        : "hover:bg-primary-soft hover:text-primary-soft-foreground",
                    key === today && !selected && "font-semibold text-primary"
                  )}
                >
                  {Number(key.slice(-2))}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
