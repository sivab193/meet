import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import { Monogram } from "./ui";

export default function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Monogram className="size-8 text-sm transition-transform group-hover:-rotate-6" />
          <span className="text-sm font-semibold tracking-tight">
            meet<span className="text-muted-foreground">.siv19.dev</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
