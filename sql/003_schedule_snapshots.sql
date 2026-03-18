CREATE TABLE schedule_snapshots (
  cache_key TEXT PRIMARY KEY,
  hub TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('departures', 'arrivals')),
  day_ts BIGINT NOT NULL,
  payload JSONB NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'unknown',
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedule_snapshots_lookup ON schedule_snapshots (hub, direction, day_ts);
CREATE INDEX idx_schedule_snapshots_expires_at ON schedule_snapshots (expires_at);

-- Server-side only table for resilient schedule fallbacks across deploys.
ALTER TABLE schedule_snapshots ENABLE ROW LEVEL SECURITY;
