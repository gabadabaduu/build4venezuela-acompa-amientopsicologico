-- Helpers for create-profile-user: check auth.users before creating accounts.

CREATE OR REPLACE FUNCTION public.auth_user_exists_by_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email IS NOT NULL
      AND lower(email) = lower(trim(p_email))
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_exists_by_phone(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE phone IS NOT NULL
      AND phone = trim(p_phone)
  );
$$;

REVOKE ALL ON FUNCTION public.auth_user_exists_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auth_user_exists_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_exists_by_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_exists_by_phone(TEXT) TO service_role;
