-- meet-siv19-dev schema, v1.
-- Run with: npm run db:migrate
-- (The migrate script splits this file on statement boundaries, so keep one
--  statement per block and no semicolons inside string literals.)

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS date_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_unavailable BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS date_overrides_date_key
  ON date_overrides (date);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  start_utc TIMESTAMPTZ NOT NULL,
  end_utc TIMESTAMPTZ NOT NULL,
  booker_name TEXT NOT NULL,
  booker_email TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  cancel_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_start_utc_idx
  ON bookings (start_utc);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limits_ip_endpoint_created_idx
  ON rate_limits (ip, endpoint, created_at);

-- Seed defaults (only if the keys do not exist yet).
-- Weekly hours: Mon-Fri 09:00-17:00 in TZ_NAME, Sat/Sun closed.
-- Array index 0 = Sunday, 6 = Saturday.
INSERT INTO settings (key, value) VALUES
  ('weekly_hours',
   '[{"day":1,"start":"09:00","end":"17:00"},{"day":2,"start":"09:00","end":"17:00"},{"day":3,"start":"09:00","end":"17:00"},{"day":4,"start":"09:00","end":"17:00"},{"day":5,"start":"09:00","end":"17:00"}]'::jsonb),
  ('min_notice_minutes', '60'::jsonb),
  ('slot_step_minutes', '30'::jsonb),
  ('max_days_ahead', '60'::jsonb),
  ('event_types',
   '[{"id":"call","name":"Call with Sivaganesh","durations":[15,30,60],"description":"A video call over Google Meet."}]'::jsonb)
ON CONFLICT (key) DO NOTHING;
