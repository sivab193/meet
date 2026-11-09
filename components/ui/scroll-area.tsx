"use client";

import { ScrollArea as ScrollPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "./index";

/**
 * Scroll container with a slim overlay scrollbar that matches the theme.
 * Give it a height (e.g. `max-h-80`) through `viewportClassName`.
 */
export function ScrollArea({
  children,
  className,
  viewportClassName,
  horizontal = false,
  alwaysShow = false,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  horizontal?: boolean;
  /** Keep the bar visible (useful where overflow isn't obvious, e.g. wide tables on phones). */
  alwaysShow?: boolean;
}) {
  return (
    <ScrollPrimitive.Root type={alwaysShow ? "auto" : "hover"} scrollHideDelay={400} className={cn("relative overflow-hidden", className)}>
      <ScrollPrimitive.Viewport className={cn("size-full rounded-[inherit]", viewportClassName)}>
        {children}
      </ScrollPrimitive.Viewport>
      <Bar orientation="vertical" />
      {horizontal && <Bar orientation="horizontal" />}
      <ScrollPrimitive.Corner />
    </ScrollPrimitive.Root>
  );
}

function Bar({ orientation }: { orientation: "vertical" | "horizontal" }) {
  return (
    <ScrollPrimitive.Scrollbar
      orientation={orientation}
      className={cn(
        "flex touch-none select-none p-0.5 transition-opacity",
        orientation === "vertical" ? "h-full w-2.5" : "h-2.5 flex-col"
      )}
    >
      <ScrollPrimitive.Thumb className="relative flex-1 rounded-full bg-muted-foreground/35 hover:bg-muted-foreground/60" />
    </ScrollPrimitive.Scrollbar>
  );
}
