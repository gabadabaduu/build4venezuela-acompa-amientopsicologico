-- Apply if guest_sessions already exists with the previous schema
ALTER TABLE guest_sessions ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE guest_sessions DROP CONSTRAINT IF EXISTS guest_sessions_status_check;
ALTER TABLE guest_sessions
  ALTER COLUMN status SET DEFAULT 'not_assigned';
ALTER TABLE guest_sessions
  ADD CONSTRAINT guest_sessions_status_check
  CHECK (status IN ('not_assigned', 'pending', 'accepted', 'rejected', 'completed'));

-- Authenticated sessions table (if deployed from supabase-setup.sql)
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('not_assigned', 'pending', 'accepted', 'rejected', 'completed'));
