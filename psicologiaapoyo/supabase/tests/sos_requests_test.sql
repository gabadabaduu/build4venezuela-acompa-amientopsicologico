begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

-- 1. Successful submit
select is(
  (public.submit_sos_request(
    '{
      "full_name": "María Test",
      "phone": "04121234567",
      "email": "maria@test.example",
      "location_text": "Caracas, Chacao",
      "message": "Necesito apoyo emocional",
      "urgency": "medium",
      "consent": true
    }'::jsonb
  ) ->> 'status'),
  'pending',
  'submit creates pending request'
);

select ok(
  (public.submit_sos_request(
    '{
      "full_name": "María Test",
      "phone": "04121234567",
      "email": "maria@test.example",
      "location_text": "Caracas, Chacao",
      "message": "Necesito apoyo emocional",
      "urgency": "medium",
      "consent": true
    }'::jsonb
  ) ->> 'is_existing')::boolean,
  'duplicate open phone returns is_existing true'
);

-- 2. Status lookup exposes no PII (only two keys)
select is(
  (select count(*)::int from jsonb_object_keys(public.get_sos_status(
    (public.submit_sos_request(
      '{
        "full_name": "Pedro Test",
        "phone": "04241234567",
        "email": "pedro@test.example",
        "location_text": "Valencia",
        "message": "Ayuda",
        "urgency": "low",
        "consent": true
      }'::jsonb
    ) ->> 'tracking_code')
  ))),
  2,
  'get_sos_status returns only status and created_at'
);

-- 3. Unknown tracking code
select is(
  public.get_sos_status('SOS-UNKNOWN'),
  null,
  'unknown tracking code returns null'
);

-- 4. Consent required
select throws_like(
  $$
    select public.submit_sos_request(
      '{
        "full_name": "Ana Test",
        "phone": "04161234567",
        "email": "ana@test.example",
        "location_text": "Maracaibo",
        "message": "Ayuda",
        "urgency": "low",
        "consent": false
      }'::jsonb
    )
  $$,
  '%consent must be true%',
  'consent false is rejected'
);

-- 5. Anon cannot read table directly
set local role anon;

select throws_like(
  $$ select count(*) from public.sos_requests $$,
  '%permission denied%',
  'anon direct select on sos_requests is denied'
);

reset role;

-- 5b. Operator can select with operator role claim
set local role authenticated;
set local "request.jwt.claims" to '{"app_metadata":{"role":"operator"}}';

select ok(
  (select count(*) >= 1 from public.sos_requests),
  'operator can select sos_requests'
);

reset role;

-- 6. Invalid status transition
do $$
declare
  v_id uuid;
begin
  v_id := (public.submit_sos_request(
    '{
      "full_name": "Luis Test",
      "phone": "04181234567",
      "email": "luis@test.example",
      "location_text": "Barquisimeto",
      "message": "Ayuda",
      "urgency": "low",
      "consent": true
    }'::jsonb
  ) ->> 'id')::uuid;

  alter table public.sos_requests disable trigger validate_sos_status_transition;
  update public.sos_requests
  set status = 'closed'
  where id = v_id;
  alter table public.sos_requests enable trigger validate_sos_status_transition;

  begin
    update public.sos_requests
    set status = 'pending'
    where id = v_id;
    raise exception 'expected invalid transition to fail';
  exception
    when others then
      if sqlerrm not like '%invalid status transition%' then
        raise;
      end if;
  end;
end $$;

select ok(true, 'invalid status transition rejected');

-- 6b. Dedup while status is assigned
do $$
declare
  v_operator_id uuid := '11111111-1111-1111-1111-111111111111';
  v_id uuid;
  v_result jsonb;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values (
    v_operator_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'assigned-dedup@test.example',
    crypt('test-password', gen_salt('bf')),
    now(),
    now(),
    now()
  )
  on conflict (id) do nothing;

  v_id := (public.submit_sos_request(
    '{
      "full_name": "Carla Test",
      "phone": "04191234567",
      "email": "carla@test.example",
      "location_text": "Maracay",
      "message": "Ayuda",
      "urgency": "low",
      "consent": true
    }'::jsonb
  ) ->> 'id')::uuid;

  update public.sos_requests
  set status = 'assigned', assigned_to = v_operator_id
  where id = v_id;

  v_result := public.submit_sos_request(
    '{
      "full_name": "Carla Test",
      "phone": "04191234567",
      "email": "carla@test.example",
      "location_text": "Maracay",
      "message": "Ayuda otra vez",
      "urgency": "low",
      "consent": true
    }'::jsonb
  );

  if not (v_result ->> 'is_existing')::boolean then
    raise exception 'expected is_existing true while request is assigned';
  end if;
end $$;

select ok(true, 'duplicate blocked while status is assigned');

-- 7. Re-submit after closure creates new request
select is(
  (public.submit_sos_request(
    '{
      "full_name": "Luis Test",
      "phone": "04181234567",
      "email": "luis@test.example",
      "location_text": "Barquisimeto",
      "message": "Nueva solicitud",
      "urgency": "medium",
      "consent": true
    }'::jsonb
  ) ->> 'is_existing')::boolean,
  false,
  'new request allowed after previous closed'
);

select * from finish();

rollback;
