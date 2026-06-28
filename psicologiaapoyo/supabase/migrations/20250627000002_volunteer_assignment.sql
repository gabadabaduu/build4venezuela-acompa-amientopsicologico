-- Volunteer assignment for open guest sessions and registered sessions

ALTER TABLE guest_sessions
  ADD COLUMN IF NOT EXISTS volunteer_id UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS guest_sessions_volunteer_id_idx ON guest_sessions (volunteer_id);
CREATE INDEX IF NOT EXISTS guest_sessions_unassigned_idx
  ON guest_sessions (created_at DESC)
  WHERE status = 'not_assigned' AND volunteer_id IS NULL;

ALTER TABLE sessions ALTER COLUMN status SET DEFAULT 'not_assigned';

-- Psychologists can browse the unassigned pool (assignments go through Edge Function RPC)
CREATE POLICY "Psychologists view unassigned guest sessions"
  ON guest_sessions FOR SELECT TO authenticated
  USING (
    status = 'not_assigned'
    AND volunteer_id IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'psychologist'
    )
  );

CREATE POLICY "Psychologists view own assigned guest sessions"
  ON guest_sessions FOR SELECT TO authenticated
  USING (
    volunteer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'psychologist'
    )
  );

CREATE POLICY "Psychologists view unassigned sessions"
  ON sessions FOR SELECT TO authenticated
  USING (
    status = 'not_assigned'
    AND psychologist_id IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'psychologist'
    )
  );

CREATE OR REPLACE FUNCTION assign_volunteer_to_guest_session(
  p_session_id UUID,
  p_volunteer_id UUID
)
RETURNS guest_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_result guest_sessions;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = p_volunteer_id;

  IF v_role IS DISTINCT FROM 'psychologist' THEN
    RAISE EXCEPTION 'volunteer_not_allowed';
  END IF;

  UPDATE guest_sessions
  SET
    status = 'pending',
    volunteer_id = p_volunteer_id
  WHERE id = p_session_id
    AND status = 'not_assigned'
    AND volunteer_id IS NULL
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'session_not_available';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION assign_volunteer_to_session(
  p_session_id UUID,
  p_volunteer_id UUID
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_result sessions;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = p_volunteer_id;

  IF v_role IS DISTINCT FROM 'psychologist' THEN
    RAISE EXCEPTION 'volunteer_not_allowed';
  END IF;

  UPDATE sessions
  SET
    status = 'pending',
    psychologist_id = p_volunteer_id
  WHERE id = p_session_id
    AND status = 'not_assigned'
    AND psychologist_id IS NULL
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'session_not_available';
  END IF;

  RETURN v_result;
END;
$$;

CREATE POLICY "Psychologists update assigned guest sessions"
  ON guest_sessions FOR UPDATE TO authenticated
  USING (
    volunteer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'psychologist'
    )
  )
  WITH CHECK (
    volunteer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'psychologist'
    )
  );
