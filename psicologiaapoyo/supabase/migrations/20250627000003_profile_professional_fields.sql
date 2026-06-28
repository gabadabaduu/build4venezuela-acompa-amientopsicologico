-- Professional and volunteer profile fields (all optional except full_name / role)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS professional_name TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS presentation TEXT,
  ADD COLUMN IF NOT EXISTS available_schedule TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS session_orientation TEXT,
  ADD COLUMN IF NOT EXISTS studies_status TEXT,
  ADD COLUMN IF NOT EXISTS professional_registry_number TEXT,
  ADD COLUMN IF NOT EXISTS place TEXT;

COMMENT ON COLUMN profiles.professional_name IS 'Public display name for volunteers';
COMMENT ON COLUMN profiles.specialty IS 'Professional specialty or focus area';
COMMENT ON COLUMN profiles.presentation IS 'Short professional bio';
COMMENT ON COLUMN profiles.available_schedule IS 'Availability description or schedule text';
COMMENT ON COLUMN profiles.photo_url IS 'Profile photo URL for public listing';
COMMENT ON COLUMN profiles.session_orientation IS 'How sessions are conducted (online, in-person, etc.)';
COMMENT ON COLUMN profiles.studies_status IS 'Education/training status of the volunteer';
COMMENT ON COLUMN profiles.professional_registry_number IS 'Professional license or registry number';
COMMENT ON COLUMN profiles.place IS 'City or location of the volunteer';
