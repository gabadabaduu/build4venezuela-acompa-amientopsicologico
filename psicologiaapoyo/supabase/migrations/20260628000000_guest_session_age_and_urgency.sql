-- Add age range + urgency to guest sessions (web hotline form).
-- Nullable: the WhatsApp intake path does not collect these.

ALTER TABLE guest_sessions
  ADD COLUMN IF NOT EXISTS age_range TEXT
    CHECK (age_range IS NULL OR age_range IN ('under_10', '11_18', '19_30', '31_50', 'over_50')),
  ADD COLUMN IF NOT EXISTS urgency TEXT
    CHECK (urgency IS NULL OR urgency IN ('high', 'medium', 'low'));
