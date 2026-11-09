"use client";

import { Check, Minus, Plus } from "lucide-react";
import { Checkbox as CheckboxPrimitive, Switch as SwitchPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "./index";

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  id?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium">
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-md border border-input bg-background transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="size-3.5" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label}
    </label>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  "aria-label": ariaLabel,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  "aria-label"?: string;
  id?: string;
}) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "bg-input data-[state=checked]:bg-primary"
      )}
    >
      <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-md transition-transform data-[state=checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  );
}

/** Integer input with − / + buttons. */
export function NumberField({
  value,
  onValueChange,
  min = 0,
  max = 100000,
  step = 1,
  suffix,
  label,
  id,
}: {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  label: string;
  id: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const btn =
    "flex size-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40";
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center overflow-hidden rounded-xl border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
        <button type="button" aria-label={`Decrease ${label}`} className={btn} disabled={value <= min} onClick={() => onValueChange(clamp(value - step))}>
          <Minus className="size-3.5" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onValueChange(clamp(Number(e.target.value) || 0))}
          className="h-9 w-full min-w-0 bg-transparent text-center text-sm font-medium tabular-nums outline-none"
        />
        {suffix && <span className="pr-1 text-xs text-muted-foreground">{suffix}</span>}
        <button type="button" aria-label={`Increase ${label}`} className={btn} disabled={value >= max} onClick={() => onValueChange(clamp(value + step))}>
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
