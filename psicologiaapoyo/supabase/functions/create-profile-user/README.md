# create-profile-user

Creates a Supabase Auth user and a linked `profiles` row. Callable only by authenticated **admin** users.

## Endpoint

```
POST https://qrsfnihnoiyzwvhoaisz.supabase.co/functions/v1/create-profile-user
```

## Headers

```http
Content-Type: application/json
Authorization: Bearer <admin_jwt>
apikey: <supabase_anon_key>
```

## Request body

### Required

| Field       | Type   | Notes    |
|-------------|--------|----------|
| `full_name` | string | Required |

### Account (at least one required)

| Field      | Type   | Notes                                      |
|------------|--------|--------------------------------------------|
| `email`    | string | Optional, but **email or phone** must be sent |
| `phone`    | string | E.164 format, e.g. `+584121234567`         |
| `password` | string | Optional, min 8 chars; auto-generated if omitted |

### Optional profile fields

| Field                          | Type                                                                 |
|--------------------------------|----------------------------------------------------------------------|
| `role`                         | `"volunteer"` \| `"admin"` (default: `"volunteer"`)                  |
| `bio`                          | string                                                               |
| `avatar_url`                   | string (http/https URL)                                              |
| `professional_name`            | string                                                               |
| `specialty`                    | string                                                               |
| `presentation`                 | string                                                               |
| `available_schedule`           | string                                                               |
| `photo_url`                    | string (http/https URL)                                              |
| `session_orientation`          | string                                                               |
| `studies_status`               | `"en_curso"` \| `"titulado"` \| `"especializacion"` \| `"maestria"` \| `"doctorado"` |
| `professional_registry_number` | string                                                               |
| `place`                        | string                                                               |

## Examples

### Minimal (admin form style)

```json
{
  "full_name": "María González",
  "email": "maria@ejemplo.com",
  "phone": "+584121234567",
  "role": "volunteer"
}
```

### Full payload

```json
{
  "full_name": "María González",
  "email": "maria@ejemplo.com",
  "phone": "+584121234567",
  "password": "miPassword123",
  "role": "volunteer",
  "bio": "Psicóloga clínica",
  "avatar_url": "https://example.com/avatar.jpg",
  "professional_name": "Dra. María González",
  "specialty": "Ansiedad y trauma",
  "presentation": "Acompañamiento en crisis",
  "available_schedule": "Lunes a viernes 9am-5pm",
  "photo_url": "https://example.com/photo.jpg",
  "session_orientation": "Online",
  "studies_status": "titulado",
  "professional_registry_number": "12345",
  "place": "Caracas"
}
```

## Success response (201)

```json
{
  "ok": true,
  "user_id": "uuid",
  "email": "maria@ejemplo.com",
  "phone": "+584121234567",
  "temporary_password": "only-if-password-was-auto-generated",
  "profile": {
    "id": "uuid",
    "full_name": "María González",
    "role": "volunteer",
    "phone": "+584121234567",
    "place": "Caracas",
    "studies_status": "titulado",
    "professional_registry_number": "12345",
    "created_at": "..."
  }
}
```

## Error responses

| Status | Example |
|--------|---------|
| 400 | `{ "error": "full_name is required" }` |
| 401 | `{ "error": "Only admins can create users" }` |
| 409 | `{ "error": "A user with this email already exists" }` |
| 409 | `{ "error": "A user with this phone already exists" }` |

## Password behavior

- Every new user is created with `user_metadata.must_change_password: true`. On first login the app redirects to `/change-password` and blocks `/profile` and `/admin` until they set a new password.
- If `password` is sent: used as-is (min 8 characters). Not returned in the response. The user must still change it on first login.
- If `password` is omitted: a random 48-character hex password is generated and returned once as `temporary_password`.
- Response includes `must_change_password: true` for all newly created users.

## Deploy

```bash
supabase functions deploy create-profile-user
```

Requires migration `20260628000006_auth_user_exists_checks.sql` for duplicate email/phone checks:

```bash
supabase db push --yes
```
