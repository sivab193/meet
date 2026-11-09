import Link from "next/link";
import { loadSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await loadSettings();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
        meet.siv19.dev
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        Find a time to talk.
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-neutral-600">
        Choose the kind of conversation you want. Each link shows only the times
        available for that meeting type; Sivaganesh&apos;s private calendar stays private.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {settings.event_types.map((event) => (
          <Link
            key={event.id}
            href={`/${event.id}`}
            className="group rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold group-hover:underline">{event.name}</h2>
            {event.description && (
              <p className="mt-2 text-sm leading-6 text-neutral-600">{event.description}</p>
            )}
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
              {event.durations.join(" / ")} minutes
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-sm text-neutral-500">
        Using a personal assistant? Give it this site or the agent endpoint at{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5">/api/openapi</code>.
      </p>
    </main>
  );
}
