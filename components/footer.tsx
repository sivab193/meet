import type { ReactNode } from "react";

/*
 * Same content as the shared siv19.dev footer (github.com/sivab193/unison,
 * components/site-footer.tsx), restyled with this site's theme tokens so it
 * follows light and dark mode.
 */

function GitHubIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const iconLinks: { label: string; href: string; icon: ReactNode }[] = [
  { label: "GitHub", href: "https://github.com/sivab193", icon: <GitHubIcon /> },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sivab193/", icon: <LinkedInIcon /> },
  { label: "Instagram", href: "https://www.instagram.com/siv19.dev/", icon: <InstagramIcon /> },
];

const linkClass =
  "rounded text-muted-foreground transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background/80 px-4 py-5 backdrop-blur md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-3 text-center sm:flex-row sm:gap-6">
        <p className="text-center text-xs text-muted-foreground md:text-sm">
          Build • Automate • Open Source
        </p>
        <nav aria-label="Sivaganesh around the web" className="flex flex-row items-center justify-center gap-4 text-xs md:text-sm">
          <a href="https://siv19.dev/" target="_blank" rel="noopener noreferrer" className={`${linkClass} font-medium`}>
            siv19.dev
          </a>
          {iconLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              title={link.label}
              className={linkClass}
            >
              {link.icon}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
