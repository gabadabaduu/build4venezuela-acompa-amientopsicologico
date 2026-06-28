-- Reject overlapping volunteer schedules (60-minute sessions).

CREATE OR REPLACE FUNCTION assert_volunteer_schedule_available(
  p_volunteer_id UUID,
  p_scheduled_at TIMESTAMPTZ,
  p_exclude_guest_session_id UUID DEFAULT NULL,
  p_exclude_registered_session_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end TIMESTAMPTZ;
BEGIN
  v_end := p_scheduled_at + interval '60 minutes';

  IF EXISTS (
    SELECT 1
    FROM guest_sessions gs
    WHERE gs.volunteer_id = p_volunteer_id
      AND gs.scheduled_at IS NOT NULL
      AND gs.status IN ('pending', 'accepted')
      AND (p_exclude_guest_session_id IS NULL OR gs.id IS DISTINCT FROM p_exclude_guest_session_id)
      AND gs.scheduled_at < v_end
      AND p_scheduled_at < (gs.scheduled_at + interval '60 minutes')
  ) THEN
    RAISE EXCEPTION 'schedule_overlap';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM sessions s
    WHERE s.psychologist_id = p_volunteer_id
      AND s.scheduled_at IS NOT NULL
      AND s.status IN ('pending', 'accepted')
      AND (p_exclude_registered_session_id IS NULL OR s.id IS DISTINCT FROM p_exclude_registered_session_id)
      AND s.scheduled_at < v_end
      AND p_scheduled_at < (s.scheduled_at + interval '60 minutes')
  ) THEN
    RAISE EXCEPTION 'schedule_overlap';
  END IF;
END;
$$;

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

  PERFORM assert_volunteer_schedule_available(
    p_volunteer_id,
    p_scheduled_at,
    p_session_id,
    NULL
  );

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

  PERFORM assert_volunteer_schedule_available(
    p_volunteer_id,
    p_scheduled_at,
    NULL,
    p_session_id
  );

  UPDATE sessions
  SET scheduled_at = p_scheduled_at
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN v_session;
END;
$$;
