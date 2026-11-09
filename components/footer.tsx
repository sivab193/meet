const links = [
  { label: "siv19.dev", href: "https://siv19.dev/" },
  { label: "GitHub", href: "https://github.com/sivab193" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sivab193/" },
  { label: "Instagram", href: "https://www.instagram.com/siv19.dev/" },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-white py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 px-4 sm:flex-row sm:gap-4">
        <p className="text-center text-xs text-neutral-500 sm:text-sm">
          Built for better conversations, by Sivaganesh
        </p>
        <nav aria-label="Sivaganesh around the web" className="flex flex-wrap items-center justify-center gap-3 text-sm">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-neutral-500 transition-colors hover:text-neutral-950"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
