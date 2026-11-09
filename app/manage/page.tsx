import { CalendarDays, CircleSlash, Mail, MessageSquareText, Video } from "lucide-react";
import Link from "next/link";
import { Alert, Badge, Card, buttonClass } from "@/components/ui";
import { getBookingByToken } from "@/lib/bookings";
import { getMeetLink, getTimeZone } from "@/lib/settings";
import CancelButton from "./cancel-button";

export const dynamic = "force-dynamic";

function fmt(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const tz = getTimeZone();
  let booking = null;
  let dbError = false;
  if (token) {
    try {
      booking = await getBookingByToken(token);
    } catch (err) {
      console.error("[manage page]", err);
      dbError = true;
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:py-16 md:px-8">
      <h1 className="animate-fade-up text-3xl font-bold tracking-tight">Manage your booking</h1>
      <div className="mt-6 animate-fade-up">
        {dbError && (
          <Alert>The booking system is temporarily unavailable. Please try again later.</Alert>
        )}
        {!dbError && !booking && (
          <Card className="flex flex-col items-center p-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CircleSlash className="size-6" />
            </span>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              We could not find a booking for this link. It may have been cancelled
              already, or the link is incorrect.
            </p>
            <Link href="/" className={`${buttonClass("secondary")} mt-6`}>
              Book a new time
            </Link>
          </Card>
        )}
        {booking && (
          <Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div>
                <p className="text-xs text-muted-foreground">Booked by</p>
                <p className="text-lg font-semibold">{booking.booker_name}</p>
              </div>
              <Badge tone={booking.status === "confirmed" ? "success" : "muted"}>
                {booking.status === "confirmed" ? "Confirmed" : "Cancelled"}
              </Badge>
            </div>
            <dl className="space-y-4 px-6 py-6 text-sm">
              <div className="flex gap-3">
                <dt className="sr-only">When</dt>
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
                <dd>
                  <p className="font-medium">
                    {fmt(booking.start_utc, tz)} – {fmtTime(booking.end_utc, tz)}
                  </p>
                  <p className="text-muted-foreground">{tz}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en-US", {
                      timeZone: "UTC",
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(booking.start_utc))}{" "}
                    (UTC)
                  </p>
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="sr-only">Email</dt>
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                <dd className="text-muted-foreground">{booking.booker_email}</dd>
              </div>
              {booking.notes && (
                <div className="flex gap-3">
                  <dt className="sr-only">Notes</dt>
                  <MessageSquareText className="mt-0.5 size-4 shrink-0 text-primary" />
                  <dd>{booking.notes}</dd>
                </div>
              )}
              {booking.status === "confirmed" && getMeetLink() && (
                <div className="flex gap-3">
                  <dt className="sr-only">Meeting link</dt>
                  <Video className="mt-0.5 size-4 shrink-0 text-primary" />
                  <dd className="min-w-0">
                    <a
                      className="break-all font-medium text-primary underline-offset-4 hover:underline"
                      href={getMeetLink()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {getMeetLink()}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {booking.status === "confirmed" && (
              <div className="border-t border-border px-6 py-5">
                <CancelButton token={token ?? ""} />
              </div>
            )}
          </Card>
        )}
      </div>
    </main>
  );
}
