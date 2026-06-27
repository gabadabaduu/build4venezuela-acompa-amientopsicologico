-- SOS psychological support requests

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TYPE public.sos_urgency AS ENUM ('low', 'medium', 'critical');
CREATE TYPE public.sos_status AS ENUM ('pending', 'assigned', 'in_progress', 'closed');
CREATE TYPE public.sos_help_type AS ENUM ('psychological');

CREATE TABLE public.sos_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  full_name text NOT NULL,
  phone text NOT NULL,
  phone_normalized text NOT NULL,
  email text NOT NULL,
  national_id text,
  location_text text NOT NULL,
  lat double precision,
  lng double precision,
  message text NOT NULL,
  urgency public.sos_urgency NOT NULL,
  help_type public.sos_help_type NOT NULL DEFAULT 'psychological',
  status public.sos_status NOT NULL DEFAULT 'pending',
  tracking_code text NOT NULL UNIQUE,
  assigned_to uuid REFERENCES auth.users (id),
  consent boolean NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT sos_requests_consent_required CHECK (consent = true),
  CONSTRAINT sos_requests_full_name_not_empty CHECK (length(trim(full_name)) > 0),
  CONSTRAINT sos_requests_phone_not_empty CHECK (length(trim(phone)) > 0),
  CONSTRAINT sos_requests_email_not_empty CHECK (length(trim(email)) > 0),
  CONSTRAINT sos_requests_location_not_empty CHECK (length(trim(location_text)) > 0),
  CONSTRAINT sos_requests_message_not_empty CHECK (length(trim(message)) > 0)
);

CREATE UNIQUE INDEX sos_requests_phone_open_unique
  ON public.sos_requests (phone_normalized)
  WHERE status IN ('pending', 'assigned', 'in_progress');

CREATE INDEX sos_requests_status_idx ON public.sos_requests (status);
CREATE INDEX sos_requests_tracking_code_idx ON public.sos_requests (tracking_code);

CREATE OR REPLACE FUNCTION public.update_sos_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sos_requests_updated_at
  BEFORE UPDATE ON public.sos_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sos_requests_updated_at();

CREATE OR REPLACE FUNCTION public.normalize_phone(raw_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');

  IF digits IS NULL OR length(digits) = 0 THEN
    RAISE EXCEPTION 'phone is required';
  END IF;

  IF length(digits) = 10 AND left(digits, 1) = '4' THEN
    digits := '58' || digits;
  ELSIF length(digits) = 11 AND left(digits, 1) = '0' THEN
    digits := '58' || substring(digits from 2);
  END IF;

  RETURN digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'SOS-';
  i int;
  byte_val int;
  bytes bytea;
BEGIN
  bytes := extensions.gen_random_bytes(5);

  FOR i IN 0..4 LOOP
    byte_val := get_byte(bytes, i);
    result := result || substr(chars, (byte_val % length(chars)) + 1, 1);
  END LOOP;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'operator',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_sos_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'pending' AND NEW.status = 'assigned' THEN
    IF NEW.assigned_to IS NULL THEN
      RAISE EXCEPTION 'assigned_to required when status is assigned';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'assigned' AND NEW.status IN ('in_progress', 'closed') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'in_progress' AND NEW.status = 'closed' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid status transition from % to %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER validate_sos_status_transition
  BEFORE UPDATE OF status ON public.sos_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_sos_status_transition();

CREATE OR REPLACE FUNCTION public.submit_sos_request(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_phone text;
  v_phone_normalized text;
  v_email text;
  v_location_text text;
  v_message text;
  v_urgency public.sos_urgency;
  v_consent boolean;
  v_national_id text;
  v_lat double precision;
  v_lng double precision;
  v_existing public.sos_requests%ROWTYPE;
  v_new public.sos_requests%ROWTYPE;
  v_tracking text;
  v_attempts int := 0;
BEGIN
  v_full_name := trim(payload ->> 'full_name');
  v_phone := trim(payload ->> 'phone');
  v_email := trim(payload ->> 'email');
  v_location_text := trim(payload ->> 'location_text');
  v_message := trim(payload ->> 'message');
  v_consent := coalesce((payload ->> 'consent')::boolean, false);
  v_national_id := nullif(trim(payload ->> 'national_id'), '');

  IF payload ? 'lat' AND payload ->> 'lat' IS NOT NULL THEN
    v_lat := (payload ->> 'lat')::double precision;
  END IF;

  IF payload ? 'lng' AND payload ->> 'lng' IS NOT NULL THEN
    v_lng := (payload ->> 'lng')::double precision;
  END IF;

  IF v_full_name IS NULL OR length(v_full_name) = 0 THEN
    RAISE EXCEPTION 'full_name is required';
  END IF;

  IF v_phone IS NULL OR length(v_phone) = 0 THEN
    RAISE EXCEPTION 'phone is required';
  END IF;

  IF v_email IS NULL OR length(v_email) = 0 THEN
    RAISE EXCEPTION 'email is required';
  END IF;

  IF v_location_text IS NULL OR length(v_location_text) = 0 THEN
    RAISE EXCEPTION 'location_text is required';
  END IF;

  IF v_message IS NULL OR length(v_message) = 0 THEN
    RAISE EXCEPTION 'message is required';
  END IF;

  IF NOT v_consent THEN
    RAISE EXCEPTION 'consent must be true';
  END IF;

  BEGIN
    v_urgency := (payload ->> 'urgency')::public.sos_urgency;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'urgency must be low, medium, or critical';
  END;

  v_phone_normalized := public.normalize_phone(v_phone);

  SELECT *
  INTO v_existing
  FROM public.sos_requests
  WHERE phone_normalized = v_phone_normalized
    AND status IN ('pending', 'assigned', 'in_progress')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_existing.id,
      'tracking_code', v_existing.tracking_code,
      'status', v_existing.status,
      'is_existing', true
    );
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    v_tracking := public.generate_tracking_code();

    BEGIN
      INSERT INTO public.sos_requests (
        full_name,
        phone,
        phone_normalized,
        email,
        national_id,
        location_text,
        lat,
        lng,
        message,
        urgency,
        consent,
        tracking_code,
        metadata
      )
      VALUES (
        v_full_name,
        v_phone,
        v_phone_normalized,
        v_email,
        v_national_id,
        v_location_text,
        v_lat,
        v_lng,
        v_message,
        v_urgency,
        v_consent,
        v_tracking,
        coalesce(payload -> 'metadata', '{}'::jsonb)
      )
      RETURNING * INTO v_new;

      RETURN jsonb_build_object(
        'id', v_new.id,
        'tracking_code', v_new.tracking_code,
        'status', v_new.status,
        'is_existing', false
      );
    EXCEPTION
      WHEN unique_violation THEN
        SELECT *
        INTO v_existing
        FROM public.sos_requests
        WHERE phone_normalized = v_phone_normalized
          AND status IN ('pending', 'assigned', 'in_progress')
        LIMIT 1;

        IF FOUND THEN
          RETURN jsonb_build_object(
            'id', v_existing.id,
            'tracking_code', v_existing.tracking_code,
            'status', v_existing.status,
            'is_existing', true
          );
        END IF;

        IF v_attempts >= 5 THEN
          RAISE EXCEPTION 'unable to generate unique tracking code';
        END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sos_status(p_tracking_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.sos_status;
  v_created_at timestamptz;
BEGIN
  IF p_tracking_code IS NULL OR length(trim(p_tracking_code)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT status, created_at
  INTO v_status, v_created_at
  FROM public.sos_requests
  WHERE tracking_code = trim(p_tracking_code);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'status', v_status,
    'created_at', v_created_at
  );
END;
$$;

ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY sos_requests_operator_select
  ON public.sos_requests
  FOR SELECT
  TO authenticated
  USING (public.is_operator());

CREATE POLICY sos_requests_operator_update
  ON public.sos_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());

REVOKE ALL ON TABLE public.sos_requests FROM anon;
REVOKE ALL ON TABLE public.sos_requests FROM authenticated;
GRANT SELECT, UPDATE ON TABLE public.sos_requests TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_sos_request(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sos_status(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_operator() TO authenticated;
