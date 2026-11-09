import { ArrowRight, CalendarCheck, Clock, Globe2, MailCheck, Video } from "lucide-react";
import Link from "next/link";
import AgentPrompt from "@/components/agent-prompt";
import { Badge, Card } from "@/components/ui";
import { loadSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const steps = [
  {
    icon: Globe2,
    title: "Pick a time",
    body: "Open slots are shown in your timezone, detected automatically.",
  },
  {
    icon: CalendarCheck,
    title: "Confirm in seconds",
    body: "Just a name and email. No account, no back-and-forth.",
  },
  {
    icon: MailCheck,
    title: "Get the invite",
    body: "A calendar invite and the meeting link land in your inbox.",
  },
];

export default async function HomePage() {
  const settings = await loadSettings();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-14 sm:pt-20 md:px-8">
      <section className="animate-fade-up text-center">
        <Badge className="mx-auto">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Open for conversations
        </Badge>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Find a time to <span className="text-gradient">talk with Sivaganesh</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground text-pretty sm:text-lg">
          Choose the kind of conversation you want. You only see times that are open,
          and Sivaganesh&apos;s private calendar stays private.
        </p>
      </section>

      <section aria-label="Meeting types" className="mt-12 grid gap-4 sm:grid-cols-2">
        {settings.event_types.map((event, i) => (
          <Link
            key={event.id}
            href={`/${event.id}`}
            style={{ animationDelay: `${100 + i * 60}ms` }}
            className="group animate-fade-up rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="relative h-full overflow-hidden p-6 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-xl group-hover:shadow-primary/10">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-100 sm:opacity-0"
              />
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                  <Video className="size-5" />
                </span>
                <ArrowRight className="size-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <h2 className="mt-5 text-lg font-semibold tracking-tight">{event.name}</h2>
              {event.description && (
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{event.description}</p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {event.durations.map((d) => (
                  <Badge key={d} tone="muted">
                    <Clock className="size-3" />
                    {d} min
                  </Badge>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </section>

      <section aria-label="How it works" className="mt-16 grid gap-4 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="animate-fade-up" style={{ animationDelay: `${250 + i * 60}ms` }}>
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-primary">
                <Icon className="size-4" />
              </span>
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
            </div>
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <AgentPrompt />
    </main>
  );
}
