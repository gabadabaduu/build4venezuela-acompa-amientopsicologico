-- Volunteer release / complete actions (race-safe, SECURITY DEFINER).

CREATE OR REPLACE FUNCTION release_volunteer_from_guest_session(
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
  v_session guest_sessions;
BEGIN
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
  SET
    status = 'not_assigned',
    volunteer_id = NULL
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION release_volunteer_from_session(
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
  v_session sessions;
BEGIN
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
  SET
    status = 'not_assigned',
    psychologist_id = NULL
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION complete_volunteer_guest_session(
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
  v_session guest_sessions;
BEGIN
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
  SET status = 'completed'
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;

CREATE OR REPLACE FUNCTION complete_volunteer_session(
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
  v_session sessions;
BEGIN
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
  SET status = 'completed'
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;
