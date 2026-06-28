# Hotline Request Button + Age Field Implementation Plan

## Overview

Wire up the currently-inert "Hotline de atención rápida" form on the dashboard so its **"Solicitar atención rápida"** button actually creates a guest session via the existing `create-session` edge function. As part of this, add two new persisted fields to the hotline request: a **required age range** (dropdown: menos de 10 / 11–18 / 19–30 / 31–50 / más de 50) and the **urgency level** (the existing "Nivel de urgencia" dropdown, which today is purely cosmetic).

## Current State Analysis

The hotline form already exists visually but is completely non-functional:

- `dashboard.html:38-58` — a `<form class="form">` with plain HTML `<input>`/`<select>` elements. **No `[ngModel]` bindings, no `(ngSubmit)` handler.** The submit button (`dashboard.html:53`) does nothing when clicked.
- `dashboard.ts:18-150` — `DashboardPage` injects `GuestSessionService` (the authenticated, service-role-only reader/assigner) but **not** `GuestSessionApiService`, the public service that posts to the `create-session` edge function.
- The full public guest-session pipeline already works end-to-end and just needs to be called:
  - `GuestSessionApiService.createSession()` (`guest-session-api.service.ts:12`) → POSTs JSON with an `X-API-Key` header to `${supabase.url}/functions/v1/create-session`, supports an optional `Idempotency-Key`.
  - `create-session/index.ts:40-63` — validates body, enforces rate limits, inserts, notifies.
  - `parseCreateSessionBody()` (`_shared/validation.ts:11-32`) — validates `full_name`, optional `phone` (E.164), `email`, `notes`.
  - `createGuestSession()` (`_shared/supabase-client.ts:33-67`) — inserts into `guest_sessions`.
  - `guest_sessions` table created in migration `20250627000000_guest_sessions_and_rate_limits.sql:4-18`.

Neither `age` nor `urgency` exists anywhere in the stack today.

## Desired End State

A logged-out (or any) visitor on `/dashboard` fills in the hotline form — name, phone, **age range (required)**, **urgency (required)** — clicks "Solicitar atención rápida", and a row is created in `guest_sessions` with `source = 'web'`, including the new `age_range` and `urgency` columns. The form shows a success confirmation and resets; validation errors (e.g. missing age, bad phone) are surfaced in Spanish. Volunteers continue to see these guest sessions in their unassigned list unchanged.

### Key Discoveries:

- The form is inert — wiring it is the bulk of the "button" work (`dashboard.html:38-58`).
- The correct service to call is `GuestSessionApiService` (`guest-session-api.service.ts:12`), NOT `GuestSessionService` (which is service-role and would fail under the anon client / RLS — `guest_sessions` has no public policies, see migration line 28).
- Existing signal-form pattern to mirror: `register.ts:16-35` + `register.html` (`[ngModel]="x()" (ngModelChange)="x.set($event)"`).
- The WhatsApp path calls `createGuestSession` directly without age/urgency (`whatsapp-webhook/index.ts:113-119`), so new columns must be **nullable** and `GuestSessionInput` fields **optional** — "required" is enforced only on the web form + `parseCreateSessionBody`.
- Migrations are timestamp-named; latest is `20250627000003`. New migration must sort after it.
- `publicGuestSessionPayload` (`session-types.ts:44-51`) intentionally returns only id/status/timestamps — age/urgency need NOT be echoed back to the public caller.

## What We're NOT Doing

- Not adding age to the registration (`register.*`) or profile (`profile.*`) forms — scope is the hotline form only.
- Not adding age/urgency to the WhatsApp intake flow (columns stay null for `source = 'whatsapp'`).
- Not changing the authenticated `sessions` table or `SessionService.createSession` (the logged-in scheduling flow).
- Not surfacing age/urgency in the volunteer dashboard list UI (could be a follow-up).
- Not changing `email`/`notes` handling on the hotline form (the form has no such inputs today; leaving them out).

## Implementation Approach

Bottom-up: migrate the database first, then thread `age_range` + `urgency` through the edge-function shared modules (types → validation → insert), then the Angular model, then finally wire the dashboard component and template. This keeps every layer compiling against the layer below it.

**Enum value conventions** (stored as TEXT, rendered with Spanish labels):

- `age_range`: `under_10`, `11_18`, `19_30`, `31_50`, `over_50`
- `urgency`: `high`, `medium`, `low`

---

## Phase 1: Database migration

### Overview

Add nullable `age_range` and `urgency` columns to `guest_sessions`, each guarded by a CHECK constraint that permits NULL (for the WhatsApp path) or one of the allowed enum values.

### Changes Required:

#### 1. New migration file

**File**: `supabase/migrations/20260628000000_guest_session_age_and_urgency.sql` (new)

```sql
-- Add age range + urgency to guest sessions (web hotline form).
-- Nullable: the WhatsApp intake path does not collect these.

ALTER TABLE guest_sessions
  ADD COLUMN IF NOT EXISTS age_range TEXT
    CHECK (age_range IS NULL OR age_range IN ('under_10', '11_18', '19_30', '31_50', 'over_50')),
  ADD COLUMN IF NOT EXISTS urgency TEXT
    CHECK (urgency IS NULL OR urgency IN ('high', 'medium', 'low'));
```

### Success Criteria:

#### Automated Verification:

- [x] Migration file exists and is the latest by timestamp: `ls supabase/migrations/ | sort | tail -1`
- [ ] SQL parses (if local Supabase available): `supabase db reset` or `supabase db push --dry-run` (Supabase CLI not installed locally — deferred to manual run)

#### Manual Verification:

- [ ] Migration runs cleanly in the Supabase SQL Editor against the live project.
- [ ] `guest_sessions` shows the two new nullable columns with CHECK constraints.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Edge function — thread age_range + urgency through the shared modules

### Overview

Update the shared types, validation, and insert helper so the `create-session` function accepts, validates, and persists the two new fields. Age and urgency are **required on the web path** (validated in `parseCreateSessionBody`), but optional in the lower-level insert input so the WhatsApp path still compiles.

### Changes Required:

#### 1. Row type

**File**: `supabase/functions/_shared/session-types.ts`
**Changes**: Add the two fields to `GuestSessionRow` (after `notes`, line ~14).

```ts
export interface GuestSessionRow {
  // ...existing fields...
  notes: string | null;
  age_range: string | null;
  urgency: string | null;
  source: GuestSessionSource;
  // ...
}
```

#### 2. Validation

**File**: `supabase/functions/_shared/validation.ts`
**Changes**: Extend `CreateSessionBody` and `parseCreateSessionBody`; add allowed-value constants + a small enum validator. Age and urgency are **required**.

```ts
const AGE_RANGES = ['under_10', '11_18', '19_30', '31_50', 'over_50'];
const URGENCIES = ['high', 'medium', 'low'];

export interface CreateSessionBody {
  full_name: string;
  phone?: string;
  email?: string;
  notes?: string;
  age_range: string;
  urgency: string;
}

// inside parseCreateSessionBody, after notes:
const age_range = normalizeEnum(body.age_range, 'age_range', AGE_RANGES);
const urgency = normalizeEnum(body.urgency, 'urgency', URGENCIES);
// ...
return { full_name, phone, email, notes, age_range, urgency };

function normalizeEnum(value: unknown, field: string, allowed: string[]): string {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}
```

#### 3. Insert helper

**File**: `supabase/functions/_shared/supabase-client.ts`
**Changes**: Add **optional** `age_range`/`urgency` to `GuestSessionInput` (line ~24) and include them in the insert (line ~39), defaulting to null.

```ts
export interface GuestSessionInput {
  // ...existing...
  notes?: string;
  age_range?: string;
  urgency?: string;
  source: GuestSessionSource;
  external_id?: string;
}

// in createGuestSession insert payload:
    notes: input.notes ?? null,
    age_range: input.age_range ?? null,
    urgency: input.urgency ?? null,
    source: input.source,
```

> Note: `create-session/index.ts:48-52` spreads `...payload`, so the validated `age_range`/`urgency` flow into `createGuestSession` automatically — no change needed there. The WhatsApp webhook omits them and they default to null.

### Success Criteria:

#### Automated Verification:

- [ ] Deno type-check passes: `deno check supabase/functions/create-session/index.ts supabase/functions/whatsapp-webhook/index.ts` (Deno not installed locally — deferred to CI/manual run)
- [x] No references to the old 4-field `CreateSessionBody` shape remain: `grep -rn "CreateSessionBody" supabase/functions`

#### Manual Verification:

- [ ] Deploy functions (`supabase functions deploy create-session`) and POST a test request with valid `age_range`/`urgency` → 201 and a row appears with both fields populated.
- [ ] POST without `age_range` → 400 with the Spanish/English validation message.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Angular model

### Overview

Mirror the new fields in the frontend guest-session model so the dashboard can type its request payload.

### Changes Required:

#### 1. Request + entity interfaces

**File**: `src/app/models/guest-session.model.ts`
**Changes**: Add `age_range` (required) and `urgency` (required) to `CreateGuestSessionRequest` (line 4-9); add nullable `age_range`/`urgency` to `GuestSession` (line 11-23).

```ts
export type GuestAgeRange = 'under_10' | '11_18' | '19_30' | '31_50' | 'over_50';
export type GuestUrgency = 'high' | 'medium' | 'low';

export interface CreateGuestSessionRequest {
  full_name: string;
  phone?: string;
  email?: string;
  notes?: string;
  age_range: GuestAgeRange;
  urgency: GuestUrgency;
}

export interface GuestSession {
  // ...existing...
  notes: string | null;
  age_range: GuestAgeRange | null;
  urgency: GuestUrgency | null;
  source: 'web' | 'whatsapp';
  // ...
}
```

### Success Criteria:

#### Automated Verification:

- [x] Production build/type-check passes: `npm run build`

#### Manual Verification:

- [x] None (type-only change).

---

## Phase 4: Wire the dashboard hotline form

### Overview

Make the form functional: inject `GuestSessionApiService`, add signals for each field, add a `requestHotline()` submit handler with loading/error/success state, add the age dropdown, give the urgency dropdown real enum values, and bind everything with `ngModel`.

### Changes Required:

#### 1. Component logic

**File**: `src/app/pages/dashboard/dashboard.ts`
**Changes**: Inject the public API service; add hotline signals; add submit handler. (Mirrors `register.ts:16-35` pattern.)

```ts
import { GuestSessionApiService } from '../../services/guest-session-api.service';
import type { GuestAgeRange, GuestUrgency } from '../../models/guest-session.model';

// in class:
private readonly guestSessionApi = inject(GuestSessionApiService);

hotlineName = signal('');
hotlinePhone = signal('');
hotlineAge = signal<GuestAgeRange | ''>('');
hotlineUrgency = signal<GuestUrgency | ''>('');
hotlineSubmitting = signal(false);
hotlineError = signal('');
hotlineSuccess = signal(false);

async requestHotline() {
  this.hotlineError.set('');
  this.hotlineSuccess.set(false);

  if (!this.hotlineName().trim() || !this.hotlinePhone().trim()
      || !this.hotlineAge() || !this.hotlineUrgency()) {
    this.hotlineError.set('Por favor completa todos los campos.');
    return;
  }

  this.hotlineSubmitting.set(true);
  try {
    await this.guestSessionApi.createSession({
      full_name: this.hotlineName().trim(),
      phone: this.hotlinePhone().trim(),
      age_range: this.hotlineAge() as GuestAgeRange,
      urgency: this.hotlineUrgency() as GuestUrgency,
    });
    this.hotlineSuccess.set(true);
    this.hotlineName.set('');
    this.hotlinePhone.set('');
    this.hotlineAge.set('');
    this.hotlineUrgency.set('');
  } catch (err: unknown) {
    this.hotlineError.set(
      err instanceof Error ? err.message : 'No se pudo enviar la solicitud.',
    );
  } finally {
    this.hotlineSubmitting.set(false);
  }
}
```

#### 2. Template

**File**: `src/app/pages/dashboard/dashboard.html`
**Changes**: Replace the static form (lines 38-58) with a bound form: `(ngSubmit)="requestHotline()"`, `[ngModel]`/`(ngModelChange)` on each input, a new required age `<select>`, real `value`s on the urgency `<select>`, a disabled/loading submit button, and success/error messages. Each control needs a `name` attribute (Angular template-driven forms requirement, as in `register.html`).

```html
<form class="form" (ngSubmit)="requestHotline()">
  <label for="nombre">Nombre completo</label>
  <input id="nombre" name="nombre" type="text" placeholder="Tu nombre" required
         [ngModel]="hotlineName()" (ngModelChange)="hotlineName.set($event)" />

  <label for="telefono">Teléfono de contacto</label>
  <input id="telefono" name="telefono" type="tel" placeholder="+58 412-0000000" required
         [ngModel]="hotlinePhone()" (ngModelChange)="hotlinePhone.set($event)" />

  <label for="edad">Edad</label>
  <select id="edad" name="edad" required
          [ngModel]="hotlineAge()" (ngModelChange)="hotlineAge.set($event)">
    <option value="">Selecciona una opción</option>
    <option value="under_10">Menos de 10</option>
    <option value="11_18">11 a 18</option>
    <option value="19_30">19 a 30</option>
    <option value="31_50">31 a 50</option>
    <option value="over_50">Más de 50</option>
  </select>

  <label for="nivel">Nivel de urgencia</label>
  <select id="nivel" name="nivel" required
          [ngModel]="hotlineUrgency()" (ngModelChange)="hotlineUrgency.set($event)">
    <option value="">Selecciona una opción</option>
    <option value="high">Alta (necesito ayuda ahora)</option>
    <option value="medium">Media (hoy)</option>
    <option value="low">Baja (puede esperar)</option>
  </select>

  @if (hotlineError()) {
    <p class="error">{{ hotlineError() }}</p>
  }
  @if (hotlineSuccess()) {
    <p class="success">Solicitud enviada. Un profesional te contactará pronto.</p>
  }

  <button type="submit" [disabled]="hotlineSubmitting()">
    {{ hotlineSubmitting() ? 'Enviando...' : 'Solicitar atención rápida' }}
  </button>
  <small>
    En caso de emergencia médica o riesgo inmediato, contacta servicios de emergencia locales.
  </small>
</form>
```

> Note: phone must be E.164 to pass `normalizeOptionalPhone` (`validation.ts:53-62`); the placeholder `+58 412-0000000` works because the validator strips spaces/dashes. Consider tightening the placeholder/help text in manual review.

### Success Criteria:

#### Automated Verification:

- [x] Production build passes (AOT template check catches binding errors): `npm run build`
- [x] Existing tests pass: `npm test` (17/18 pass; the 1 failure is `app.spec.ts > should render brand name`, a pre-existing failure in the untouched App component, unrelated to this change)

#### Manual Verification:

- [ ] On `/dashboard`, filling name + phone + age + urgency and clicking "Solicitar atención rápida" creates a `guest_sessions` row with correct `age_range`, `urgency`, and `source = 'web'`.
- [ ] Submitting with any field empty shows "Por favor completa todos los campos." and does not POST.
- [ ] A bad phone returns the edge function's validation error, surfaced in the form.
- [ ] On success the form resets and shows the confirmation message.
- [ ] A logged-in volunteer still sees the new request in their unassigned guest list.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- Optional: add a `validation.ts` spec asserting `parseCreateSessionBody` rejects missing/invalid `age_range` and `urgency` and accepts valid enum values. (No Deno test harness exists today; the existing app tests are Vitest/TestBed smoke tests, so this is a stretch goal.)

### Integration Tests:

- Manual end-to-end via the deployed `create-session` function (covered in Phase 2/4 manual steps) — no automated integration harness in the repo.

### Manual Testing Steps:

1. Run the migration in the Supabase SQL Editor; confirm columns + constraints.
2. Deploy the `create-session` function.
3. `npm start`, open `/dashboard`, submit a complete hotline request → confirm success message + DB row.
4. Submit with a missing age and with a malformed phone → confirm error messages.
5. Log in as a psychologist and confirm the request shows in the unassigned list.

## Performance Considerations

Negligible — one extra dropdown and two nullable TEXT columns. The form posts a single request that already passes through existing rate limiting (`enforceWebRateLimits`).

## Migration Notes

- `guest_sessions` columns are nullable, so existing rows and the WhatsApp path are unaffected (they keep NULL age/urgency).
- Forward-only; the migration is additive with `IF NOT EXISTS`, so re-running is safe.
- No rollback needed, but rollback would be `ALTER TABLE guest_sessions DROP COLUMN age_range, DROP COLUMN urgency;`.

## References

- Inert form to wire: `src/app/pages/dashboard/dashboard.html:38-58`
- Public submit service: `src/app/services/guest-session-api.service.ts:12`
- Edge function entry: `supabase/functions/create-session/index.ts:40-63`
- Validation to extend: `supabase/functions/_shared/validation.ts:11-32`
- Insert helper: `supabase/functions/_shared/supabase-client.ts:33-67`
- Guest sessions migration (table origin): `supabase/migrations/20250627000000_guest_sessions_and_rate_limits.sql:4-18`
- Signal-form pattern to mirror: `src/app/pages/register/register.ts:16-35`
- Related research: `thoughts/research/2026-06-28-auth-and-role-based-access.md`
</content>
</invoke>
