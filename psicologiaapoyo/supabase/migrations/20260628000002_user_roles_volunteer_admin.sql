-- Replace patient/psychologist roles with volunteer/admin

UPDATE profiles SET role = 'volunteer' WHERE role = 'psychologist';
UPDATE profiles SET role = 'admin' WHERE role = 'patient';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('volunteer', 'admin'));

-- RLS policies: psychologist -> volunteer
DROP POLICY IF EXISTS "Psychologists view unassigned guest sessions" ON guest_sessions;
CREATE POLICY "Volunteers view unassigned guest sessions"
  ON guest_sessions FOR SELECT TO authenticated
  USING (
    status = 'not_assigned'
    AND volunteer_id IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'volunteer'
    )
  );

DROP POLICY IF EXISTS "Psychologists view own assigned guest sessions" ON guest_sessions;
CREATE POLICY "Volunteers view own assigned guest sessions"
  ON guest_sessions FOR SELECT TO authenticated
  USING (
    volunteer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'volunteer'
    )
  );

DROP POLICY IF EXISTS "Psychologists view unassigned sessions" ON sessions;
CREATE POLICY "Volunteers view unassigned sessions"
  ON sessions FOR SELECT TO authenticated
  USING (
    status = 'not_assigned'
    AND psychologist_id IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'volunteer'
    )
  );

DROP POLICY IF EXISTS "Psychologists update assigned guest sessions" ON guest_sessions;
CREATE POLICY "Volunteers update assigned guest sessions"
  ON guest_sessions FOR UPDATE TO authenticated
  USING (
    volunteer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'volunteer'
    )
  )
  WITH CHECK (
    volunteer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'volunteer'
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

  IF v_role IS DISTINCT FROM 'volunteer' THEN
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

  IF v_role IS DISTINCT FROM 'volunteer' THEN
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
