# meet-siv19-dev

A small single-user scheduling app for Sivaganesh. One person, one booking
page, no teams, no payments, no calendar sync, no approval queues. Bookings
auto-confirm and include his recurring Google Meet link.

- Public booking page: pick a duration (15/30/60), pick a day on the month
  calendar, pick a free slot, enter name + email. Confirmation shows the Meet
  link and a cancel link; confirmation emails carry a `.ics` invite.
- `/manage?token=…`: view and cancel a booking.
- `/admin`: password-protected dashboard with upcoming bookings, a weekly
  hours editor, and date overrides.
- API-first: every admin action is available over HTTP with an API key, so
  Jarvis can read and update availability without touching the dashboard.

## Availability model

The schedule lives in Postgres, not in anyone's memory.

- **Weekly hours** (`settings.weekly_hours`): a list of `{ day, start, end }`
  entries, `day` 0–6 (0 = Sunday), times `"HH:MM"` wall-clock in `TZ_NAME`.
  Days with no entry are closed. Default: Mon–Fri 09:00–17:00.
- **Date overrides** (`date_overrides`): one row per date. An override wins
  over weekly hours. It either sets custom hours for that date
  (`start_time`/`end_time`) or blocks the whole day (`is_unavailable`).
  Overrides are how one-off changes work ("free 6–9 PM Thursday", "block
  Friday"). Past overrides can be deleted; they do not auto-expire in the
  database, but they stop affecting slots once the date passes.
- **Bookings** (`bookings`): confirmed bookings block their time window for
  every event type (there is only one host). A slot is offered only if it
  fits fully inside the availability window, does not overlap a confirmed
  booking, starts at least `min_notice_minutes` (default 60) from now, and
  the date is within `max_days_ahead` (default 60). Slots step by
  `slot_step_minutes` (default 30).
- All storage and comparison is in UTC; windows are wall-clock in `TZ_NAME`.
  DST is handled with `Intl.DateTimeFormat` conversions (see `lib/slots.ts`
  and `tests/slots.test.ts`, which cover the 2026-11-01 fall-back and
  2027-03-14 spring-forward dates).

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind CSS v4, Postgres via
`@neondatabase/serverless` (HTTP driver, works on Vercel serverless), raw
SQL (no ORM), `nodemailer` + SMTP for email.

## Setup

1. Create a free Neon project (https://neon.com) and copy its connection
   string. Any Postgres 13+ works for local dev.
2. Copy the env file and fill it in:

   ```bash
   cp .env.example .env
   ```

   | Variable | What it is |
   |---|---|
   | `DATABASE_URL` | Neon Postgres connection string |
   | `MEET_LINK` | His recurring Google Meet URL |
   | `ADMIN_PASSWORD` | Password for `/admin` |
   | `JARVIS_API_KEY` | API key Jarvis sends as `x-api-key` |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | ZeptoMail SMTP. If absent, emails are logged to the console instead of sent |
   | `HOST_EMAIL` | His email; receives new-booking notifications |
   | `NEXT_PUBLIC_APP_URL` | Public URL, e.g. `https://meet.siv19.dev` |
   | `TZ_NAME` | IANA timezone, default `America/New_York` |

3. Create the tables and seed the defaults:

   ```bash
   npm install
   npm run db:migrate
   ```

4. Run it:

   ```bash
   npm run dev     # http://localhost:3000
   npm test        # slot/timezone unit tests
   npm run db:verify  # runs the migration + booking SQL against in-memory Postgres (PGlite)
   npm run build
   ```

## Deploy (Vercel, free tier)

This app is small (a handful of serverless functions), so Vercel Hobby
works — unlike Cal.diy, which needs Pro.

1. Push this repo to GitHub and import it in Vercel (or `vercel` from the CLI).
2. In Vercel → Settings → Environment Variables, add every variable from
   `.env.example` (use the Neon pooled connection string for `DATABASE_URL`;
   add `?sslmode=require` if it is not already there).
3. Deploy. Then run the migration once against the Neon database:
   `DATABASE_URL=<neon-url> npm run db:migrate` (or run it from your machine
   with `.env` filled in).
4. Custom domain: Vercel → Settings → Domains → add `meet.siv19.dev`.
   At your DNS provider for `siv19.dev`, add the record Vercel shows (a
   `CNAME` to `cname.vercel-dns.com`). HTTPS is provisioned automatically.
5. Set `NEXT_PUBLIC_APP_URL=https://meet.siv19.dev` and redeploy so emails
   carry the right links.

## API reference (for Jarvis)

Base URL: `NEXT_PUBLIC_APP_URL`. Public endpoints need no auth. Admin
endpoints need `x-api-key: $JARVIS_API_KEY` (the `/admin` dashboard accepts
its session cookie instead).

### Public

**GET /api/availability?month=YYYY-MM**

```bash
curl "https://meet.siv19.dev/api/availability?month=2026-11"
# { "days": { "2026-11-02": true, "2026-11-07": false, ... }, "timeZone": "America/New_York" }
```

True if the day has any availability window (weekly hours + overrides;
bookings ignored).

**GET /api/slots?date=YYYY-MM-DD&duration=30**

```bash
curl "https://meet.siv19.dev/api/slots?date=2026-11-02&duration=30"
# { "slots": ["2026-11-02T14:00:00.000Z", ...] }  (UTC instants)
```

60 requests/min per IP.

**POST /api/book**

```bash
curl -X POST https://meet.siv19.dev/api/book \
  -H 'Content-Type: application/json' \
  -d '{"date":"2026-11-02","startUtc":"2026-11-02T14:00:00.000Z","duration":30,
       "name":"Ada Lovelace","email":"ada@example.com","notes":"Intro call",
       "honeypot":"","eventType":"call"}'
# { "bookingId": "...", "meetLink": "https://meet.google.com/...",
#   "cancelUrl": "https://meet.siv19.dev/manage?token=..." }
```

Validates server-side: the honeypot field must be empty, the slot must be
one of the currently offered slots (windows + min notice + no overlap), and
the insert re-checks overlap atomically. 5 bookings/hour per IP. The
`eventType` field is optional and defaults to the first configured event
type. A booking stands even if email sending fails (the confirmation screen
already shows the Meet link and cancel link).

**GET /api/manage?token=…**

```bash
curl "https://meet.siv19.dev/api/manage?token=abc123..."
# { "id": "...", "event_type": "call", "start_utc": "...", "end_utc": "...",
#   "booker_name": "...", "booker_email": "...", "notes": null,
#   "status": "confirmed", "created_at": "..." }
```

**POST /api/cancel**

```bash
curl -X POST https://meet.siv19.dev/api/cancel \
  -H 'Content-Type: application/json' \
  -d '{"token":"abc123..."}'
# { "ok": true }
```

Sends cancellation emails to the booker and the host.

### Admin (header `x-api-key: $JARVIS_API_KEY`)

**GET /api/admin/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD**

```bash
curl "https://meet.siv19.dev/api/admin/bookings?from=2026-11-05&to=2026-12-05" \
  -H "x-api-key: $JARVIS_API_KEY"
# { "bookings": [ { "id": "...", "event_type": "call", "start_utc": "...",
#   "end_utc": "...", "booker_name": "...", "booker_email": "...",
#   "notes": null, "status": "confirmed", "cancel_token": "...",
#   "created_at": "..." }, ... ] }
```

Defaults to today .. today+30 days in `TZ_NAME` when `from`/`to` are omitted.

**GET /api/admin/availability**

```bash
curl https://meet.siv19.dev/api/admin/availability -H "x-api-key: $JARVIS_API_KEY"
# { "weekly_hours": [{"day":1,"start":"09:00","end":"17:00"}, ...],
#   "overrides": [{"id":"...","date":"2026-12-25","start_time":null,
#     "end_time":null,"is_unavailable":true}, ...],
#   "min_notice_minutes": 60, "slot_step_minutes": 30, "max_days_ahead": 60,
#   "event_types": [{"id":"call","name":"Call with Sivaganesh",
#     "durations":[15,30,60],"description":"..."}] }
```

**PUT /api/admin/availability** — replace weekly hours and/or settings,
upsert/delete overrides. Only provided fields change. Returns the updated
availability (same shape as GET).

```bash
# Block Dec 25, and make Thu Nov 12 free 18:00-21:00
curl -X PUT https://meet.siv19.dev/api/admin/availability \
  -H "x-api-key: $JARVIS_API_KEY" -H 'Content-Type: application/json' \
  -d '{"overrides":{"upsert":[
    {"date":"2026-12-25","start_time":null,"end_time":null,"is_unavailable":true},
    {"date":"2026-11-12","start_time":"18:00","end_time":"21:00","is_unavailable":false}
  ]}}'

# Replace weekly hours entirely (days omitted are closed)
curl -X PUT https://meet.siv19.dev/api/admin/availability \
  -H "x-api-key: $JARVIS_API_KEY" -H 'Content-Type: application/json' \
  -d '{"weekly_hours":[
    {"day":1,"start":"09:00","end":"17:00"},
    {"day":3,"start":"09:00","end":"17:00"},
    {"day":5,"start":"09:00","end":"17:00"}
  ], "min_notice_minutes": 120}'

# Delete an override by id
curl -X PUT https://meet.siv19.dev/api/admin/availability \
  -H "x-api-key: $JARVIS_API_KEY" -H 'Content-Type: application/json' \
  -d '{"overrides":{"delete":["<override-id>"]}}'
```

**POST /api/admin/bookings/[id]/cancel**

```bash
curl -X POST https://meet.siv19.dev/api/admin/bookings/<booking-id>/cancel \
  -H "x-api-key: $JARVIS_API_KEY"
# { "ok": true, "booking": { ... } }
```

Sends cancellation emails to the booker and the host.

## Security notes

- Rate limits are enforced in the `rate_limits` table: `/api/book` 5/hour
  per IP, `/api/slots` 60/min per IP. A public booking form will attract
  bots; the honeypot field (`website`, must stay empty) plus rate limits are
  the v1 defence. If spam becomes a problem, add a CAPTCHA.
- Cancel tokens are 32 random hex chars (`crypto.randomBytes`). The admin
  password is never logged; the session cookie holds its SHA-256 hash and is
  compared in constant time. The API key is compared the same way.
- All inputs are validated server-side; `/api/book` recomputes the offered
  slots and re-checks overlap atomically before inserting, so a stale or
  forged client cannot double-book.
- No secrets are committed: `.env` is gitignored; only `.env.example` (with
  placeholders) is in the repo.

## Known limitations (v1, by design)

- The booking page offers the `call` event type with 15/30/60-minute
  durations. If event types change in settings, update the page (or the API
  defaults handle it for direct API bookings).
- No calendar sync: busy times come only from bookings made here plus the
  availability rules. If his Google Calendar should block times, that is a
  future integration.
- No reschedule flow: cancel + rebook.
- No recurring bookings, no reminders, no time-zone picker for the host
  (host timezone is `TZ_NAME`).
