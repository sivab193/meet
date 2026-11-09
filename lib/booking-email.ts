import { sendEmail } from "./email";
import { buildIcs } from "./ics";
import { getAppUrl, getHostEmail, getMeetLink, getTimeZone } from "./settings";
import type { BookingRow } from "./bookings";

function formatBookingTime(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function formatTimeOnly(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function timeLines(booking: BookingRow): { et: string; utc: string } {
  const tz = getTimeZone();
  const start = new Date(booking.start_utc);
  const end = new Date(booking.end_utc);
  return {
    et: `${formatBookingTime(start, tz)} – ${formatTimeOnly(end, tz)} (${tz})`,
    utc: `${formatBookingTime(start, "UTC")} – ${formatTimeOnly(end, "UTC")} (UTC)`,
  };
}

/** Confirmation to the booker (with .ics) + notification to the host. Best effort; never throws. */
export async function sendBookingConfirmationEmails(booking: BookingRow): Promise<void> {
  const tz = getTimeZone();
  const start = new Date(booking.start_utc);
  const end = new Date(booking.end_utc);
  const meetLink = getMeetLink();
  const cancelUrl = `${getAppUrl()}/manage?token=${booking.cancel_token}`;
  const { et, utc } = timeLines(booking);
  const ics = buildIcs({
    uid: booking.id,
    start,
    end,
    summary: `${booking.event_type}: ${booking.booker_name} with Sivaganesh`,
    description: `Meet link: ${meetLink}\nCancel: ${cancelUrl}`,
    location: meetLink,
  });

  await sendEmail({
    to: booking.booker_email,
    subject: `Confirmed: Call with Sivaganesh — ${formatBookingTime(start, tz)}`,
    text: [
      `Hi ${booking.booker_name},`,
      ``,
      `Your call with Sivaganesh is confirmed.`,
      ``,
      `When: ${et}`,
      `      ${utc}`,
      `Where: ${meetLink || "(meeting link to follow)"}`,
      ``,
      booking.notes ? `Your notes: ${booking.notes}\n` : ``,
      `Need to cancel? ${cancelUrl}`,
      ``,
      `See you then!`,
    ].join("\n"),
    attachments: [{ filename: "booking.ics", content: ics }],
  });

  const hostEmail = getHostEmail();
  if (hostEmail) {
    await sendEmail({
      to: hostEmail,
      subject: `New booking: ${booking.booker_name} — ${formatBookingTime(start, tz)}`,
      text: [
        `New booking on meet.siv19.dev.`,
        ``,
        `Who: ${booking.booker_name} <${booking.booker_email}>`,
        `When: ${et}`,
        `      ${utc}`,
        booking.notes ? `Notes: ${booking.notes}` : ``,
        `Manage/cancel: ${cancelUrl}`,
      ].join("\n"),
      attachments: [{ filename: "booking.ics", content: ics }],
    });
  }
}

/** Cancellation notice to the booker + host. Best effort; never throws. */
export async function sendCancellationEmails(booking: BookingRow): Promise<void> {
  const tz = getTimeZone();
  const start = new Date(booking.start_utc);
  const { et } = timeLines(booking);
  await sendEmail({
    to: booking.booker_email,
    subject: `Cancelled: Call with Sivaganesh — ${formatBookingTime(start, tz)}`,
    text: [
      `Hi ${booking.booker_name},`,
      ``,
      `Your call scheduled for ${et} has been cancelled.`,
      ``,
      `Feel free to book a new time at ${getAppUrl()}.`,
    ].join("\n"),
  });
  const hostEmail = getHostEmail();
  if (hostEmail) {
    await sendEmail({
      to: hostEmail,
      subject: `Booking cancelled: ${booking.booker_name} — ${formatBookingTime(start, tz)}`,
      text: `The booking with ${booking.booker_name} <${booking.booker_email}> on ${et} was cancelled.`,
    });
  }
}
