-- Busy windows imported from Google Calendar, Outlook, Muse, or another
-- trusted owner-side sync process. Public APIs only use these as opaque blocks.

CREATE TABLE IF NOT EXISTS calendar_busy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  start_utc TIMESTAMPTZ NOT NULL,
  end_utc TIMESTAMPTZ NOT NULL,
  summary TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT calendar_busy_valid_window CHECK (end_utc > start_utc),
  CONSTRAINT calendar_busy_source_external_key UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS calendar_busy_window_idx
  ON calendar_busy (start_utc, end_utc);
