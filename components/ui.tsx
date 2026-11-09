import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

/** Join class names, skipping falsy values. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary-hover",
  secondary:
    "border border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger:
    "border border-danger/40 bg-transparent text-danger hover:bg-danger-soft",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-5 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    buttonVariants[variant],
    buttonSizes[size]
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/80 text-card-foreground shadow-sm backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

export const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground",
  "placeholder:text-muted-foreground/70 transition-colors",
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30",
  "disabled:opacity-50"
);

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

/** Small uppercase heading used above each step of a form. */
export function SectionLabel({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        className
      )}
    >
      {icon}
      {children}
    </h2>
  );
}

export function Badge({
  tone = "primary",
  children,
  className,
}: {
  tone?: "primary" | "success" | "muted" | "danger";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    primary: "bg-primary-soft text-primary-soft-foreground",
    success: "bg-success-soft text-success",
    muted: "bg-muted text-muted-foreground",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "success" | "muted";
  children: ReactNode;
}) {
  const tones = {
    danger: "border-danger/30 bg-danger-soft text-danger",
    success: "border-success/30 bg-success-soft text-success",
    muted: "border-border bg-muted text-foreground",
  };
  return (
    <p role="status" className={cn("rounded-xl border px-3.5 py-2.5 text-sm", tones[tone])}>
      {children}
    </p>
  );
}

/** The gradient "S" monogram used in the header and favicon-style spots. */
export function Monogram({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 font-bold text-white shadow-lg shadow-indigo-500/30",
        className
      )}
    >
      S
    </span>
  );
}
