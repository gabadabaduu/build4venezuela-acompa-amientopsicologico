-- Volunteer sets scheduled_at on assigned sessions (pending/accepted).

CREATE OR REPLACE FUNCTION schedule_volunteer_guest_session(
  p_session_id UUID,
  p_volunteer_id UUID,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS guest_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_session guest_sessions;
BEGIN
  IF p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'scheduled_at_required';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = p_volunteer_id;

  IF v_role IS DISTINCT FROM 'volunteer' THEN
    RAISE EXCEPTION 'volunteer_not_allowed';
  END IF;

  SELECT * INTO v_session
  FROM guest_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF v_session.volunteer_id IS DISTINCT FROM p_volunteer_id THEN
    RAISE EXCEPTION 'session_not_assigned_to_volunteer';
  END IF;

  IF v_session.status = 'completed' THEN
    RAISE EXCEPTION 'session_already_completed';
  END IF;

  UPDATE guest_sessions
  SET scheduled_at = p_scheduled_at
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION schedule_volunteer_session(
  p_session_id UUID,
  p_volunteer_id UUID,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_session sessions;
BEGIN
  IF p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'scheduled_at_required';
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = p_volunteer_id;

  IF v_role IS DISTINCT FROM 'volunteer' THEN
    RAISE EXCEPTION 'volunteer_not_allowed';
  END IF;

  SELECT * INTO v_session
  FROM sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF v_session.psychologist_id IS DISTINCT FROM p_volunteer_id THEN
    RAISE EXCEPTION 'session_not_assigned_to_volunteer';
  END IF;

  IF v_session.status = 'completed' THEN
    RAISE EXCEPTION 'session_already_completed';
  END IF;

  UPDATE sessions
  SET scheduled_at = p_scheduled_at
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;
