-- Professional profile fields for psychologists (voluntariado)
-- Matches src/app/models/user.model.ts Profile interface

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS professional_name TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS presentation TEXT,
  ADD COLUMN IF NOT EXISTS available_schedule TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS session_orientation TEXT;

COMMENT ON COLUMN profiles.professional_name IS 'Public display name for psychologists';
COMMENT ON COLUMN profiles.specialty IS 'Professional specialty or focus area';
COMMENT ON COLUMN profiles.presentation IS 'Short professional bio shown to patients';
COMMENT ON COLUMN profiles.available_schedule IS 'Availability description or schedule text';
COMMENT ON COLUMN profiles.photo_url IS 'Profile photo URL for public listing';
COMMENT ON COLUMN profiles.session_orientation IS 'How sessions are conducted (online, in-person, etc.)';
