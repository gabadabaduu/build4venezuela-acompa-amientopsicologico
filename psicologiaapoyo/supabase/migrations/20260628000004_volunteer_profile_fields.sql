-- Volunteer profile fields: studies status, registry number, place (all optional).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS studies_status TEXT,
  ADD COLUMN IF NOT EXISTS professional_registry_number TEXT,
  ADD COLUMN IF NOT EXISTS place TEXT;

COMMENT ON COLUMN profiles.studies_status IS 'Education/training status of the volunteer';
COMMENT ON COLUMN profiles.professional_registry_number IS 'Professional license or registry number';
COMMENT ON COLUMN profiles.place IS 'City or location of the volunteer';
