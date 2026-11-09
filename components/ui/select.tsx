"use client";

import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn, popoverClass, triggerClass } from "./index";

export type SelectOption = { value: string; label: string; hint?: string };

/** Accessible, keyboard-friendly dropdown built on Radix Select. */
export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  icon,
  disabled,
  className,
  "aria-label": ariaLabel,
  id,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  id?: string;
}) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger id={id} aria-label={ariaLabel} className={cn(triggerClass, className)}>
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
        <span className="min-w-0 flex-1 truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            popoverClass,
            "max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronUp className="size-4" />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-8 pr-3 text-sm outline-none",
                  "data-[highlighted]:bg-primary-soft data-[highlighted]:text-primary-soft-foreground",
                  "data-[state=checked]:font-medium data-[disabled]:opacity-40"
                )}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2.5 inline-flex">
                  <Check className="size-4 text-primary" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                {option.hint && (
                  <span className="ml-auto pl-3 text-xs text-muted-foreground">{option.hint}</span>
                )}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-muted-foreground">
            <ChevronDown className="size-4" />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/** Time picker as a dropdown of fixed steps ("09:00", "09:15", ...), shown as "9:00 AM". */
export function TimeSelect({
  value,
  onValueChange,
  stepMinutes = 15,
  disabled,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  stepMinutes?: number;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}) {
  const options: SelectOption[] = [];
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    options.push({ value: `${hh}:${mm}`, label: formatTime12(`${hh}:${mm}`) });
  }
  // Keep a stored value that is off the step grid (e.g. 09:10) selectable.
  if (value && !options.some((o) => o.value === value)) {
    options.push({ value, label: formatTime12(value) });
    options.sort((a, b) => a.value.localeCompare(b.value));
  }
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      options={options}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn("w-32 py-2", className)}
    />
  );
}

export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
