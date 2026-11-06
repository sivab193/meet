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
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Manage your booking</h1>
      {dbError && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          The booking system is temporarily unavailable. Please try again later.
        </p>
      )}
      {!dbError && !booking && (
        <p className="mt-4 text-neutral-600">
          We could not find a booking for this link. It may have been cancelled
          already, or the link is incorrect.
        </p>
      )}
      {booking && (
        <section className="mt-6 rounded-xl border border-neutral-200 p-6">
          <p className="text-lg font-semibold">{booking.booker_name}</p>
          <p className="mt-1 text-neutral-700">
            {fmt(booking.start_utc, tz)} – {fmtTime(booking.end_utc, tz)} ({tz})
          </p>
          <p className="mt-1 text-sm text-neutral-600">
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
          <p className="mt-1 text-sm text-neutral-600">{booking.booker_email}</p>
          {booking.notes && <p className="mt-2 text-sm">Notes: {booking.notes}</p>}
          <p className="mt-3 text-sm">
            Status:{" "}
            <span className="font-medium">
              {booking.status === "confirmed" ? "Confirmed" : "Cancelled"}
            </span>
          </p>
          {booking.status === "confirmed" && (
            <>
              {getMeetLink() && (
                <p className="mt-3">
                  <span className="font-medium">Meet link: </span>
                  <a
                    className="break-all text-blue-700 underline"
                    href={getMeetLink()}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {getMeetLink()}
                  </a>
                </p>
              )}
              <div className="mt-6">
                <CancelButton token={token ?? ""} />
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
