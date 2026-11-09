"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "./ui";

const subscribe = () => () => {};

/** Light / system / dark segmented switch. Renders a placeholder until hydrated. */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  const options = [
    { value: "light", label: "Light theme", Icon: Sun },
    { value: "system", label: "System theme", Icon: Monitor },
    { value: "dark", label: "Dark theme", Icon: Moon },
  ] as const;

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex items-center gap-0.5 rounded-full border border-border bg-card/70 p-0.5 backdrop-blur"
    >
      {options.map(({ value, label, Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
