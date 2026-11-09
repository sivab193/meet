import { queryRows } from "./db";

export type BookingRow = {
  id: string;
  event_type: string;
  start_utc: string; // ISO string
  end_utc: string; // ISO string
  booker_name: string;
  booker_email: string;
  notes: string | null;
  status: string;
  cancel_token: string;
  created_at: string;
};

const COLS =
  "id, event_type, start_utc::text AS start_utc, end_utc::text AS end_utc, booker_name, booker_email, notes, status, cancel_token, created_at::text AS created_at";

/** Confirmed bookings whose start falls in [fromUtc, toUtc). */
export async function listBookings(fromUtc: string, toUtc: string): Promise<BookingRow[]> {
  return queryRows<BookingRow>(
    `SELECT ${COLS} FROM bookings WHERE start_utc >= $1::timestamptz AND start_utc < $2::timestamptz ORDER BY start_utc`,
    [fromUtc, toUtc]
  );
}

/** Confirmed bookings overlapping [dayStartUtc, dayEndUtc), as Date windows (for slot logic). */
export async function listConfirmedWindowsForDay(
  dayStartUtc: Date,
  dayEndUtc: Date
): Promise<{ start: Date; end: Date }[]> {
  const rows = await queryRows<{ start_utc: string; end_utc: string }>(
    "SELECT start_utc::text AS start_utc, end_utc::text AS end_utc FROM bookings " +
      "WHERE status = 'confirmed' AND start_utc < $2::timestamptz AND end_utc > $1::timestamptz " +
      "UNION ALL " +
      "SELECT start_utc::text AS start_utc, end_utc::text AS end_utc FROM calendar_busy " +
      "WHERE start_utc < $2::timestamptz AND end_utc > $1::timestamptz",
    [dayStartUtc.toISOString(), dayEndUtc.toISOString()]
  );
  return rows.map((r) => ({ start: new Date(r.start_utc), end: new Date(r.end_utc) }));
}

/**
 * Insert a booking only if no confirmed booking overlaps the window.
 * Atomic single statement: 0 rows returned means the slot was taken.
 */
export async function insertBookingAtomic(input: {
  eventType: string;
  startUtc: string;
  endUtc: string;
  bookerName: string;
  bookerEmail: string;
  notes: string | null;
  cancelToken: string;
}): Promise<{ id: string } | null> {
  const rows = await queryRows<{ id: string }>(
    "INSERT INTO bookings (event_type, start_utc, end_utc, booker_name, booker_email, notes, cancel_token) " +
      "SELECT $1, $2::timestamptz, $3::timestamptz, $4, $5, $6, $7 " +
      "WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE status = 'confirmed' AND start_utc < $3::timestamptz AND end_utc > $2::timestamptz) " +
      "AND NOT EXISTS (SELECT 1 FROM calendar_busy WHERE start_utc < $3::timestamptz AND end_utc > $2::timestamptz) " +
      "RETURNING id",
    [
      input.eventType,
      input.startUtc,
      input.endUtc,
      input.bookerName,
      input.bookerEmail,
      input.notes,
      input.cancelToken,
    ]
  );
  return rows[0] ?? null;
}

export async function getBookingByToken(token: string): Promise<BookingRow | null> {
  const rows = await queryRows<BookingRow>(
    `SELECT ${COLS} FROM bookings WHERE cancel_token = $1`,
    [token]
  );
  return rows[0] ?? null;
}

export async function cancelBookingByToken(token: string): Promise<BookingRow | null> {
  const rows = await queryRows<BookingRow>(
    `UPDATE bookings SET status = 'cancelled' WHERE cancel_token = $1 AND status = 'confirmed' RETURNING ${COLS}`,
    [token]
  );
  return rows[0] ?? null;
}

export async function cancelBookingById(id: string): Promise<BookingRow | null> {
  const rows = await queryRows<BookingRow>(
    `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND status = 'confirmed' RETURNING ${COLS}`,
    [id]
  );
  return rows[0] ?? null;
}
