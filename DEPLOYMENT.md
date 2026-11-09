# Deployment plan — meet.siv19.dev

## Target architecture

- **Web/API:** Vercel, connected to `sivab193/meet`, production branch `main`.
- **Database:** Neon Postgres using the pooled, TLS-required connection string.
- **Email:** ZeptoMail SMTP (or another authenticated SMTP relay).
- **Domain:** `meet.siv19.dev` attached to the Vercel production project.
- **Calendar/Muse:** private ICS subscription for outbound events; the
  authenticated busy-window API for owner-calendar conflict import.

Public endpoints disclose event types and open UTC instants only. The owner
calendar, booking identities, configuration, and imported busy-event details
remain behind the admin cookie or `JARVIS_API_KEY`.

## 1. Pre-deployment checks

Run from a clean checkout:

```bash
npm ci
npm run lint
npm test
npm run db:verify
npm run build
npm audit
```

The deploy is blocked by lint/type/build failures, failed slot/DST tests,
failed migration checks, or any unresolved high/critical production advisory.

## 2. Provision secrets

Create a Neon project and a least-privilege production database role. Generate
independent high-entropy values for `ADMIN_PASSWORD`, `JARVIS_API_KEY`, and
`CALENDAR_FEED_TOKEN` (at least 32 random bytes each). Configure every value
from `.env.example` in Vercel's **Production** environment:

- `DATABASE_URL` — Neon pooled URL with TLS enabled.
- `MEET_LINK` — the recurring room URL shown only after a booking succeeds.
- `ADMIN_PASSWORD` — owner workspace login.
- `JARVIS_API_KEY` — owner-side Muse/Jarvis API access.
- `CALENDAR_FEED_TOKEN` — private ICS subscription capability.
- SMTP variables and `HOST_EMAIL`.
- `NEXT_PUBLIC_APP_URL=https://meet.siv19.dev`.
- `TZ_NAME=America/New_York` (or the owner's desired IANA zone).

Do not put secrets in Vercel preview environments unless preview deployments
need to exercise production services. Prefer a separate preview database.

## 3. Database migration

Run migrations before sending production traffic to the new build:

```bash
copy .env.example .env
# fill DATABASE_URL only in the local untracked .env
npm run db:migrate
```

Migrations are additive and idempotent. Verify that `settings`, `bookings`,
`date_overrides`, `rate_limits`, and `calendar_busy` exist. Never run the
in-memory `db:verify` command against Neon; it uses its own PGlite database.

## 4. First Vercel deployment

1. Import `sivab193/meet` into Vercel and keep the detected Next.js settings.
2. Add the production environment variables.
3. Deploy `main` to the temporary `*.vercel.app` URL.
4. Smoke-test `/`, `/call`, `/admin`, `/api/event-types`, `/api/openapi`, and
   the MCP `initialize` plus `tools/list` requests.
5. Create a real test booking, confirm both emails and `.ics` attachments,
   verify the private calendar view, then cancel it.
6. Push a synthetic Muse busy window and confirm `/api/slots` no longer offers
   an overlapping start.

## 5. Domain and DNS cutover

Add `meet.siv19.dev` in Vercel **Settings → Domains**. At the DNS provider for
`siv19.dev`, create the exact CNAME Vercel supplies (normally
`cname.vercel-dns.com`). Keep the old target in place until the Vercel preview
passes smoke tests, then change the record. Wait for Vercel to show a valid TLS
certificate before sharing the URL.

After cutover, verify HTTPS, redirects, security headers, email/cancel links,
and OpenAPI/MCP server URLs all use `https://meet.siv19.dev`.

## 6. Muse and calendar setup

Give Muse the MCP endpoint `https://meet.siv19.dev/api/mcp` for public
scheduling tools. Give only the owner's Muse instance `JARVIS_API_KEY` for the
admin availability and busy-window sync APIs. Configure it to refresh Google
or Outlook busy windows on a short interval and replace a bounded future range
(for example, now through 90 days).

Subscribe the owner's calendar to the private feed URL shown in the README.
The feed token is a capability secret; do not place it in public agent
instructions or client-side code.

## 7. Monitoring and rollback

- Watch Vercel function errors, Neon connection usage, SMTP failures, HTTP 429
  volume, and MCP tool errors after launch.
- Keep the previous successful Vercel deployment available for instant traffic
  rollback. The added database objects are backward-compatible, so rolling the
  web deployment back does not require dropping tables.
- Rotate any leaked secret immediately and redeploy. Rotating
  `CALENDAR_FEED_TOKEN` invalidates existing calendar subscriptions; rotating
  `JARVIS_API_KEY` requires updating Muse at the same time.
