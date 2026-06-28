-- Remove unused notes column from sessions and guest_sessions

ALTER TABLE sessions DROP COLUMN IF EXISTS notes;
ALTER TABLE guest_sessions DROP COLUMN IF EXISTS notes;
