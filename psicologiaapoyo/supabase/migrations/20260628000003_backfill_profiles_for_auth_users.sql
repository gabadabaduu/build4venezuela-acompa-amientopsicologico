-- Backfill public.profiles for auth.users that do not yet have a row.
-- New profiles default to role volunteer. Existing profiles are left unchanged.

INSERT INTO public.profiles (id, full_name, role)
SELECT
  u.id,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(split_part(u.email, '@', 1)), ''),
    'Usuario'
  ) AS full_name,
  'volunteer' AS role
FROM auth.users AS u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles AS p WHERE p.id = u.id
);
