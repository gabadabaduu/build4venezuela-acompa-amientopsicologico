# Admin: Register a New Psychologist (Volunteer) Implementation Plan

## Overview

Give **admin** users a working form on the `/admin` page to register a new psychologist (a `volunteer` account), collecting the professional fields defined on the `Profile` model. Creation goes through the **already-deployed** Supabase Edge Function `create-profile-user`, which creates the auth user + `profiles` row with the service role (callable only by an authenticated admin). The admin page also lists existing volunteers. Auth is **password-based with no email**: the admin either sets a temporary password or leaves it blank to have one auto-generated and returned once for manual sharing. The psychologist logs in with the existing login page and can later change their password from their profile.

## Current State Analysis

- **The edge function already exists and is deployed.** `POST /functions/v1/create-profile-user` on project `qrsfnihnoiyzwvhoaisz` (matches `environment.supabase.url`). It is **not in the local repo** (`supabase/functions/` has only `assign-volunteer`, `create-session`, `whatsapp-webhook`, plus an **empty** `create-volunteer/` directory that is now obsolete). We do **not** author or deploy it in this plan — we only call it.
- **The function's contract** (from its README):
  - **Headers:** `Content-Type: application/json`, `Authorization: Bearer <admin_jwt>`, `apikey: <anon_key>`. Both auth headers are auto-attached by `supabase.client.functions.invoke(...)` for a logged-in admin, so no manual header wiring is needed.
  - **Required body:** `full_name`. **At least one** of `email` / `phone` must be sent. `phone` is E.164 (`+584121234567`).
  - **Optional:** `password` (min 8; auto-generated if omitted), `role` (`volunteer`|`admin`, default `volunteer`), and all profile fields (`bio`, `avatar_url`, `professional_name`, `specialty`, `presentation`, `available_schedule`, `photo_url`, `session_orientation`, `studies_status`, `professional_registry_number`, `place`).
  - **Success (201):** `{ ok, user_id, email, phone, temporary_password?, profile }`. `temporary_password` is present **only when** `password` was omitted (a random 48-char hex).
  - **Errors:** `400 { error }` (e.g. missing `full_name`), `401 { error: "Only admins can create users" }`, `409 { error }` (duplicate email or phone).
- **Roles are `volunteer` and `admin`** (`src/app/models/user.model.ts:1`). "Psychologist" = `volunteer`. The `/admin` route is already protected by `roleGuard(['admin'])` (`src/app/app.routes.ts:12-16`).
- **The `/admin` page is a non-functional stub.** `pages/admin/admin.ts` + `admin.html` render a dummy name/email/phone form that only sets `submitted = true` (`src/app/pages/admin/admin.ts:28-33`).
- **The `Profile` model has every field** we collect (`src/app/models/user.model.ts:10-28`); Spanish studies-status labels at `STUDIES_STATUS_LABELS` (`:36-42`).
- **Listing volunteers needs no special access:** the profiles SELECT policy is `USING (true)` for authenticated users, so an admin reads `profiles WHERE role = 'volunteer'` directly through the normal client.
- **Login already supports password auth** via `signInWithPassword` (`src/app/pages/login/login.ts`); no change needed for the psychologist to log in.
- **`functions.invoke` precedent:** the existing `guest-session-api.service.ts` calls a function via raw `fetch` + `X-API-Key`. We instead use `supabase.client.functions.invoke(...)` because `create-profile-user` requires the logged-in admin's JWT (not the public API key).
- **The profile page has no password UI** today — it edits profile fields only (`src/app/pages/profile/profile.ts`).

### Key Discoveries

- No backend work, no new secrets, no migration, and no `config.toml` change are required for this plan — the function is already live. `config.toml` only governs local `supabase serve`, which is out of scope.
- Because `password` is optional and a temp password is returned once, the cleanest admin UX is: leave password blank → display the returned `temporary_password` for the admin to copy and share. We still allow the admin to type one.
- Client-side validation must mirror the **real** contract: `full_name` required, **email or phone** required, password (if typed) ≥ 8 chars. `specialty`/`studies_status` are optional (do **not** force them).

## Desired End State

- An admin opens `/admin` and sees: (a) a form to register a new psychologist, and (b) a list of existing psychologists (volunteers).
- Submitting the form calls `create-profile-user`, creating a confirmed auth user (`role = 'volunteer'`) + `profiles` row — **without disturbing the admin's session**.
- On success the form clears, a success message shows, the new psychologist appears in the list, and **if** the password was auto-generated, the `temporary_password` is displayed prominently for the admin to copy.
- The psychologist logs in at `/login` with email (or phone) + the password and is routed to `/profile`.
- The psychologist can change their password from their profile page (no email involved).

## What We're NOT Doing

- **Not building or deploying the edge function** — it already exists. No `getAuthenticatedAdmin` helper, no `supabase/functions/create-profile-user/` source, no `config.toml` entry.
- **No email of any kind** — credentials are shared manually by the admin.
- **No forgot-password / self-service reset flow** (needs SMTP). An admin resets out-of-band if needed.
- **No Google SSO / magic link.**
- **No editing or deleting** existing volunteers from the admin page (list is read-only for now).
- **No `admin` role creation from the UI** — the form always sends `role: 'volunteer'` even though the function supports `admin`.
- **No changes to roles, RLS policies, or the profiles schema.**

## Implementation Approach

1. **Cleanup:** remove the obsolete empty `supabase/functions/create-volunteer/` directory.
2. **Frontend service:** `AdminService` with `createVolunteer(...)` (invokes `create-profile-user`) and `listVolunteers()` (normal client SELECT).
3. **Admin UI:** replace the stub form with a real signal-backed form (mirroring `profile.ts`) plus a read-only volunteers list, surfacing the returned temp password.
4. **Password change (recommended):** add a "cambiar contraseña" section to the profile page using `auth.updateUser({ password })`.

---

## Phase 1: Cleanup obsolete stub directory

### Overview

Remove the empty `create-volunteer/` directory left over from an earlier approach so the repo doesn't imply a function we no longer build.

### Changes Required

- **Delete** `psicologiaapoyo/supabase/functions/create-volunteer/` (currently empty).

### Success Criteria

#### Automated Verification

- [x] Directory no longer exists: `test ! -d supabase/functions/create-volunteer && echo gone`
- [x] No source references the old name: `! grep -rn "create-volunteer" src/ supabase/`

---

## Phase 2: Frontend service — create & list volunteers

### Overview

Add an `AdminService` that invokes `create-profile-user` with the admin's session and lists existing volunteers via the normal client (allowed by the SELECT RLS policy).

### Changes Required

#### 1. AdminService

**File**: `psicologiaapoyo/src/app/services/admin.service.ts` (new)
**Changes**: Inject `SupabaseService`. `createVolunteer` uses `functions.invoke('create-profile-user', { body })` (auto-attaches the admin's JWT + anon `apikey`). It returns the parsed success payload so the UI can show `temporary_password`. On a non-2xx, extract the function's `{ error }` message from the `FunctionsHttpError` context. `listVolunteers` reads profiles.

```ts
import { inject, Injectable } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import type { Profile } from '../models/user.model';

export interface NewVolunteerInput {
  full_name: string;            // required
  email?: string;               // email OR phone required
  phone?: string;
  password?: string;            // optional; omit to auto-generate
  // optional profile fields
  bio?: string;
  avatar_url?: string;
  professional_name?: string;
  specialty?: string;
  presentation?: string;
  available_schedule?: string;
  photo_url?: string;
  session_orientation?: string;
  studies_status?: string;
  professional_registry_number?: string;
  place?: string;
}

export interface CreateVolunteerResult {
  ok: boolean;
  user_id: string;
  email: string | null;
  phone: string | null;
  temporary_password?: string;  // present only when password was auto-generated
  profile: Profile;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly supabase = inject(SupabaseService);

  async createVolunteer(input: NewVolunteerInput): Promise<CreateVolunteerResult> {
    const { data, error } = await this.supabase.client.functions.invoke<CreateVolunteerResult>(
      'create-profile-user',
      { body: { role: 'volunteer', ...input } },
    );

    if (error) {
      throw new Error(await extractFunctionError(error));
    }
    return data as CreateVolunteerResult;
  }

  async listVolunteers(): Promise<Profile[]> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('role', 'volunteer')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Profile[];
  }
}

// On a non-2xx, supabase-js returns a FunctionsHttpError whose `.context` is the
// raw Response. Read the function's `{ error }` body; fall back to the generic message.
async function extractFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error as string;
    } catch {
      /* non-JSON body — fall through */
    }
  }
  return error instanceof Error ? error.message : 'No se pudo crear el psicólogo';
}
```

> Verify `FunctionsHttpError` is exported by the installed `@supabase/supabase-js` version (`grep -r "FunctionsHttpError" node_modules/@supabase/supabase-js/dist`). If the export name differs, fall back to a duck-typed check on `error.context?.json`.

### Success Criteria

#### Automated Verification

- [x] Build passes: `npm run build`
- [x] Unit smoke test injects `AdminService` via `TestBed` (mirror `services/auth.service.spec.ts`): `npm test`

#### Manual Verification

- [ ] `listVolunteers()` returns existing volunteers when called as an admin

---

## Phase 3: Admin page UI — registration form + volunteers list

### Overview

Replace the stub in `pages/admin/admin.ts` + `admin.html` with a real signal-backed form (mirroring `profile.ts`) and a read-only list of volunteers loaded on init. Keep existing brand/sign-out chrome.

### Changes Required

#### 1. Admin component

**File**: `psicologiaapoyo/src/app/pages/admin/admin.ts`
**Changes**: Replace the stub with:

- Signals for every collected field: `fullName`, `email`, `phone`, `password` (required-ish per below), plus optional `bio`, `professionalName`, `specialty`, `presentation`, `studiesStatus`, `availableSchedule`, `sessionOrientation`, `professionalRegistryNumber`, `place`, `avatarUrl`, `photoUrl`.
- State signals: `volunteers`, `loading`, `saving`, `error`, `success`, and `tempPassword` (shown when the function auto-generated one).
- `studiesOptions = Object.entries(STUDIES_STATUS_LABELS)` for the dropdown (as `profile.ts:30`).
- On init (`ngOnInit` or `effect`): call `admin.listVolunteers()` into `volunteers`. **Drop** the stub's email-prefill of the current admin.
- `onSubmit()` client-side validation mirroring the contract:
  - `full_name` required → else "El nombre completo es obligatorio."
  - **email or phone** required → else "Indica un correo o un teléfono."
  - if `password` is non-empty, length ≥ 8 → else "La contraseña debe tener al menos 8 caracteres."
  - Build `NewVolunteerInput`, omitting empty optional fields (reuse a `nullIfEmpty`-style trim; send `undefined` for empties, not `null`, since the function treats absent fields as unset). Leave `password` out entirely when blank so the function auto-generates.
  - Call `admin.createVolunteer(...)`. On success: clear the form, set a success message, set `tempPassword` to `result.temporary_password ?? ''`, and refresh the list via `listVolunteers()`. On error: set `error` to the thrown message (e.g. the 409 duplicate text).

#### 2. Admin template

**File**: `psicologiaapoyo/src/app/pages/admin/admin.html`
**Changes**: Replace the 3-field test form with the full form (Spanish labels, `[ngModel]`/`(ngModelChange)` bindings as in `profile.html`):

- Required-marked: `full_name`. Email + phone inputs with a note that **one** is required. Password input (`type="password"`, optional) with helper text "Déjalo en blanco para generar una contraseña temporal."
- `studies_status` as a `<select>` over `studiesOptions` (optional first option).
- The remaining optional professional fields (specialty, presentation, registry, schedule, orientation, place, professional name, avatar/photo URLs).
- Show `error()` and `success()` messages.
- When `tempPassword()` is set, show a highlighted block: "Contraseña temporal (cópiala y compártela): <code>{{ tempPassword() }}</code>" — it is only returned once.
- A section listing volunteers (`@for` over `volunteers()`): show `full_name`, `specialty`, studies-status label, `place`. **Note:** `profiles` does not store email (it lives in `auth.users`), so the list shows profile fields only.
- Keep the existing `/dashboard` link and sign-out button.

#### 3. Styles

**File**: `psicologiaapoyo/src/app/pages/admin/admin.css`
**Changes**: Extend existing styles for the longer form, the temp-password callout, and the list. Reuse patterns from `profile.css`.

### Success Criteria

#### Automated Verification

- [x] Build passes: `npm run build`
- [x] Tests pass: `npm test`

#### Manual Verification

- [ ] As an admin at `/admin`, filling the form (name + email, password blank) and submitting creates the psychologist; success message shows; the displayed `temporary_password` is non-empty; the new name appears in the list.
- [ ] Submitting with a typed password ≥ 8 chars succeeds and shows **no** temp password.
- [ ] The admin remains logged in (session not replaced) after creation.
- [ ] Missing both email and phone, or a < 8-char password, shows a Spanish validation message and does **not** call the backend.
- [ ] A duplicate email/phone shows the function's 409 message (e.g. "A user with this email already exists").
- [ ] A non-admin cannot reach `/admin` (existing `roleGuard` — quick regression check).
- [ ] The created psychologist can log in at `/login` with the credentials and lands on `/profile`.

**Implementation Note**: Pause for manual confirmation after this phase.

---

## Phase 4 (recommended): Password change on profile page

### Overview

Let a logged-in psychologist change their password so the admin-known temp password doesn't persist. No email involved — uses `auth.updateUser({ password })`.

### Changes Required

#### 1. Password change UI + handler

**File**: `psicologiaapoyo/src/app/pages/profile/profile.ts` and `profile.html`, plus `auth.service.ts`
**Changes**: Add `newPassword` / `confirmPassword` signals and a `changePassword()` method that validates length ≥ 8 and match, then calls a new `AuthService.updatePassword(...)`. Add a "Cambiar contraseña" section to `profile.html` with its own submit button and status message (separate from the profile-save message). Keep Supabase access in the service layer:

```ts
// AuthService
async updatePassword(newPassword: string) {
  const { error } = await this.supabase.client.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
```

### Success Criteria

#### Automated Verification

- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm test`

#### Manual Verification

- [ ] A logged-in psychologist can set a new password (≥ 8) and re-login with it.
- [ ] Mismatched / too-short passwords show a Spanish validation message and do not call the backend.

---

## Testing Strategy

### Unit Tests

- `AdminService` creation/injection smoke test via `TestBed` (mirror `services/auth.service.spec.ts`). Does not hit Supabase.

### Integration / Manual Testing Steps

1. Log in as an existing admin → `/admin`.
2. Register a psychologist (name + email, password blank) → expect success, a displayed temp password, list update, and admin still logged in.
3. Copy the temp password; log out; log in as the new psychologist → lands on `/profile`.
4. Retry the same email/phone as admin → expect the 409 message.
5. Omit both email and phone → expect client-side validation block.
6. (Phase 4) Change password on profile, log out, log in with the new password.
7. Confirm a non-admin is redirected away from `/admin`.

## Migration Notes

- **No DB migration, no function deploy, no new secrets, no `config.toml` change** — the `create-profile-user` function is already deployed and the `profiles` table/model already contain every field. (The function's own duplicate-email/phone checks depend on migration `20260628000006_auth_user_exists_checks.sql`, which is the function owner's responsibility, not part of this frontend plan.)

## References

- Function contract: `create-profile-user` README (request/response shapes used above).
- `functions.invoke` vs raw fetch precedent: `psicologiaapoyo/src/app/services/guest-session-api.service.ts:32-44`.
- Profile form to mirror (signals + studies dropdown): `psicologiaapoyo/src/app/pages/profile/profile.ts:30-129`.
- Profile model & fields: `psicologiaapoyo/src/app/models/user.model.ts:10-42`.
- Existing (stub) admin page: `psicologiaapoyo/src/app/pages/admin/admin.ts`, `admin.html`.
- Supabase client (single instance): `psicologiaapoyo/src/app/services/supabase.service.ts`.
- Route guard: `psicologiaapoyo/src/app/app.routes.ts:12-16`.
