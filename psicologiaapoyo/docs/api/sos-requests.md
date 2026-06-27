# SOS Requests API Contract

Psychological/emotional support requests for survivors and affected people. External frontend integrates via Supabase RPCs using the anon key.

## Environment

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
```

Local development: run `npx supabase start` in `psicologiaapoyo/` and use the printed URL and anon key.

## Submit request

**RPC:** `submit_sos_request`

**Client call:**

```typescript
const { data, error } = await supabase.rpc('submit_sos_request', {
  payload: {
    full_name: 'María Pérez',
    phone: '+58 412 1234567',
    email: 'maria@example.com',
    location_text: 'Caracas, Chacao, cerca del centro comercial',
    message: 'Necesito acompañamiento emocional',
    urgency: 'critical',
    consent: true,
    national_id: 'V-12345678', // optional
    lat: 10.4806, // optional
    lng: -66.9036, // optional
  },
});
```

### Request payload

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `full_name` | string | yes | Non-empty |
| `phone` | string | yes | Normalized server-side; dedup key |
| `email` | string | yes | Non-empty |
| `location_text` | string | yes | City/neighborhood/reference |
| `message` | string | yes | Free text |
| `urgency` | `low` \| `medium` \| `critical` | yes | |
| `consent` | `true` | yes | Must be exactly `true` |
| `national_id` | string | no | Cédula |
| `lat` | number | no | Optional GPS |
| `lng` | number | no | Optional GPS |
| `metadata` | object | no | Client context (locale, source) |

### Success response

```json
{
  "id": "uuid",
  "tracking_code": "SOS-7X4K2",
  "status": "pending",
  "is_existing": false
}
```

When an open request already exists for the same phone (`pending`, `assigned`, or `in_progress`), the same shape is returned with `is_existing: true` and the existing `id` / `tracking_code`.

### Errors

| Condition | Error message |
|-----------|---------------|
| Missing required field | `{field} is required` |
| `consent` not true | `consent must be true` |
| Invalid urgency | `urgency must be low, medium, or critical` |

## Track request status

**RPC:** `get_sos_status`

**Client call:**

```typescript
const { data, error } = await supabase.rpc('get_sos_status', {
  p_tracking_code: 'SOS-7X4K2',
});
```

### Success response

```json
{
  "status": "pending",
  "created_at": "2026-06-27T12:00:00.000Z"
}
```

Returns `null` when the tracking code is unknown. No PII is exposed.

## Operator workflow

Operators are Supabase Auth users with `app_metadata.role = "operator"`.

### Seeding operators

In Supabase Dashboard → Authentication → Users → select user → User Metadata:

```json
{
  "role": "operator"
}
```

Or via Admin API:

```bash
curl -X PUT "$SUPABASE_URL/auth/v1/admin/users/<user-id>" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"app_metadata":{"role":"operator"}}'
```

### Operator queries

Authenticated operator client:

```typescript
const { data } = await supabase
  .from('sos_requests')
  .select('*')
  .eq('status', 'pending');
```

### Status transitions

Valid paths:

- `pending` → `assigned` (requires `assigned_to`)
- `assigned` → `in_progress`
- `assigned` → `closed`
- `in_progress` → `closed`

Invalid transitions raise a database error.

## Phone normalization

Server strips non-digits and applies Venezuela rules:

- `04121234567` → `584121234567`
- `4121234567` (10 digits starting with 4) → `584121234567`

Dedup uses `phone_normalized` for open requests only (`pending`, `assigned`, `in_progress`).

## Security notes

- Anonymous clients MUST use RPCs; direct `INSERT` on `sos_requests` is not allowed.
- Anonymous clients MUST NOT read full rows from `sos_requests`.
- Status lookup returns only `status` and `created_at`.
