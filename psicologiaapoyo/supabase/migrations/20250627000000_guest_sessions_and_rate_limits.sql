-- Guest sessions (no auth.users / profiles required)
-- Run in Supabase SQL Editor or via: supabase db push

CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_assigned'
    CHECK (status IN ('not_assigned', 'pending', 'accepted', 'rejected', 'completed')),
  notes TEXT,
  source TEXT NOT NULL CHECK (source IN ('web', 'whatsapp')),
  external_id TEXT UNIQUE,
  volunteer_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guest_sessions_phone_idx ON guest_sessions (phone);
CREATE INDEX IF NOT EXISTS guest_sessions_created_at_idx ON guest_sessions (created_at DESC);

CREATE TRIGGER guest_sessions_updated_at
  BEFORE UPDATE ON guest_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
-- No public policies: only service_role (Edge Functions) can read/write.

CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS api_rate_limits_window_idx ON api_rate_limits (window_start);

-- Atomic rate-limit check + increment. Returns true if under limit.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_bucket_key TEXT,
  p_window_seconds INT,
  p_max_requests INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO api_rate_limits (bucket_key, window_start, request_count)
  VALUES (p_bucket_key, v_window_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_max_requests;
END;
$$;

-- Optional cleanup (run periodically via pg_cron or manual)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM api_rate_limits WHERE window_start < now() - interval '7 days';
END;
$$;
