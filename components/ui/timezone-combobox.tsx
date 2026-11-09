"use client";

import { Command } from "cmdk";
import { Check, ChevronDown, Globe2, Search } from "lucide-react";
import { Popover } from "radix-ui";
import { useMemo, useRef, useState } from "react";
import { cn, popoverClass, triggerClass } from "./index";

type ZoneInfo = { zone: string; label: string; offset: string; offsetMinutes: number; region: string; aliases: string[] };

/**
 * Browsers report some zones under their legacy IANA names (Chromium lists
 * Asia/Calcutta, not Asia/Kolkata). Show and search the current city names.
 */
const MODERN_NAMES: Record<string, string> = {
  "Asia/Calcutta": "Kolkata (India)",
  "Asia/Kolkata": "Kolkata (India)",
  "Asia/Saigon": "Ho Chi Minh City",
  "Asia/Katmandu": "Kathmandu",
  "Asia/Rangoon": "Yangon",
  "Europe/Kiev": "Kyiv",
  "America/Buenos_Aires": "Buenos Aires",
  "America/Indianapolis": "Indianapolis",
  "America/Louisville": "Louisville",
  "Atlantic/Faeroe": "Faroe",
  "Pacific/Truk": "Chuuk",
  "Pacific/Ponape": "Pohnpei",
  "Pacific/Enderbury": "Kanton",
  "Asia/Ulan_Bator": "Ulaanbaatar",
};

const EXTRA_KEYWORDS: Record<string, string[]> = {
  "Asia/Calcutta": ["Kolkata", "Calcutta", "India", "IST", "Mumbai", "Delhi", "Bangalore", "Chennai"],
  "Asia/Kolkata": ["Kolkata", "Calcutta", "India", "IST", "Mumbai", "Delhi", "Bangalore", "Chennai"],
  "America/New_York": ["Eastern", "EST", "EDT", "ET"],
  "America/Chicago": ["Central", "CST", "CDT", "CT"],
  "America/Denver": ["Mountain", "MST", "MDT"],
  "America/Los_Angeles": ["Pacific", "PST", "PDT", "PT", "San Francisco", "Seattle"],
  "Europe/London": ["UK", "GMT", "BST", "Britain"],
  "UTC": ["GMT", "Coordinated Universal Time"],
};

function offsetMinutesFor(zone: string, at: Date): number {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

function describe(zone: string, at: Date): ZoneInfo {
  const offsetMinutes = offsetMinutesFor(zone, at);
  const parts = zone.split("/");
  const fallback = parts.slice(1).join(" / ").replaceAll("_", " ") || zone;
  return {
    zone,
    label: MODERN_NAMES[zone] ?? fallback,
    offset: formatOffset(offsetMinutes),
    offsetMinutes,
    region: parts.length > 1 ? parts[0] : "Other",
    aliases: [fallback, ...(EXTRA_KEYWORDS[zone] ?? [])],
  };
}

/** Substring match. Exact keyword > prefix > word start > mid-word; no fuzzy noise. */
function filterZones(value: string, search: string, keywords?: string[]): number {
  const q = search.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return 1;
  let best = 0;
  for (const raw of [value, ...(keywords ?? [])]) {
    const text = raw.toLowerCase().replaceAll("_", " ");
    if (text === q || text.split(/[\s/()-]+/).includes(q)) return 1;
    const i = text.indexOf(q);
    if (i === -1) continue;
    const wordStart = i === 0 || /[\s/(-]/.test(text[i - 1]);
    best = Math.max(best, i === 0 ? 0.8 : wordStart ? 0.7 : 0.4);
  }
  return best;
}

function localTime(zone: string): string {
  return new Intl.DateTimeFormat(undefined, { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(
    new Date()
  );
}

/** Searchable timezone picker. Type a city, region, or offset like "+5:30". */
export function TimezoneCombobox({
  value,
  onValueChange,
  zones,
  detectedZone,
  id,
}: {
  value: string;
  onValueChange: (zone: string) => void;
  zones: string[];
  detectedZone?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(() => describe(value, new Date()), [value]);

  // Offsets only need computing once the list is opened. One flat list (detected
  // zone first) so search results sort purely by match quality across regions.
  const items = useMemo(() => {
    if (!open) return [];
    const now = new Date();
    const list = zones
      .filter((zone) => zone !== detectedZone)
      .map((zone) => describe(zone, now))
      .sort((a, b) => a.region.localeCompare(b.region) || a.label.localeCompare(b.label));
    return detectedZone ? [describe(detectedZone, now), ...list] : list;
  }, [open, zones, detectedZone]);

  function choose(zone: string) {
    onValueChange(zone);
    setOpen(false);
  }

  function item(info: ZoneInfo) {
    return (
      <Command.Item
        key={info.zone}
        value={info.zone}
        keywords={[info.label, info.offset, info.region, ...info.aliases]}
        onSelect={() => choose(info.zone)}
        className={cn(
          "flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none",
          "data-[selected=true]:bg-primary-soft data-[selected=true]:text-primary-soft-foreground"
        )}
      >
        <Check className={cn("size-4 shrink-0 text-primary", info.zone === value ? "opacity-100" : "opacity-0")} />
        <span className="min-w-0 flex-1 truncate">
          {info.label}
          <span className="ml-1.5 text-xs text-muted-foreground">
            {info.zone === detectedZone ? "Detected" : info.region}
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{info.offset}</span>
      </Command.Item>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button id={id} type="button" aria-label={`Timezone: ${selected.label}`} className={triggerClass}>
          <Globe2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{selected.label}</span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{selected.offset}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className={cn(popoverClass, "w-[min(24rem,calc(100vw-1.5rem))]")}
        >
          <Command loop filter={filterZones}>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder="Search city, region, or offset…"
                // Show the best match: jump back to the top whenever the query changes.
                onValueChange={() => requestAnimationFrame(() => listRef.current?.scrollTo({ top: 0 }))}
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
            </div>
            <Command.List ref={listRef} className="max-h-[min(22rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                No timezone found.
              </Command.Empty>
              {items.map(item)}
            </Command.List>
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Local time there: <span className="font-medium text-foreground">{localTime(value)}</span>
            </div>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
