---
date: 2026-06-28T20:18:07+0200
researcher: claude
git_commit: 47c1d68912beb4669ef81ac7fa4ca7f516b8836d
branch: main
repository: build4venezuela-acompa-amientopsicologico
topic: "Authentication and role-based access (patient vs psychologist)"
tags: [research, codebase, auth, rls, supabase, signals, route-guards, roles]
status: complete
last_updated: 2026-06-28
last_updated_by: claude
---

# Research: Authentication and role-based access (patient vs psychologist)

**Date**: 2026-06-28T20:18:07+0200
**Researcher**: claude
**Git Commit**: 47c1d68912beb4669ef81ac7fa4ca7f516b8836d
**Branch**: main
**Repository**: build4venezuela-acompa-amientopsicologico

## Research Question

How does authentication and role-based access (patient vs psychologist) work in this app — across the Angular services, route guards, and Supabase RLS? Map the main pages, services, and models.

## Summary

Authentication is a thin Angular signal-based wrapper over Supabase Auth. Role (`patient | psychologist`) is **not** part of the auth token — it lives only in the `profiles` table, written at sign-up. As a result:

- **The route guard is auth-only, not role-aware.** `authGuard` checks `isAuthenticated()` and nothing else, and it guards only `/profile`. `/dashboard` is unprotected.
- **Role enforcement is split across two layers** (as CLAUDE.md prescribes): Postgres **RLS policies** (source of truth) and **service-layer query branching** (`SessionService.getMySessions` switches on the fetched role). The UI then branches on role inside the Dashboard and Profile components.
- **Role-based UI** reads role by fetching the profile (Dashboard, Profile), since `currentUser` only carries `{ id, email }` — the role is not in the signal.
- A newer **guest-session / volunteer** subsystem (migrations) adds psychologist-only RLS policies enforced with `EXISTS (SELECT … FROM profiles WHERE id = auth.uid() AND role = 'psychologist')`, gated to the backend service_role for writes.

## Detailed Findings

### Authentication core (signals over Supabase Auth)

- `src/app/services/supabase.service.ts:7-10` — single `SupabaseClient` from `createClient(environment.supabase.url, environment.supabase.anonKey)`; everything injects this.
- `src/app/services/auth.service.ts`:
  - `currentUser` signal `<AuthUser | null>` carrying only `{ id, email }` (`:16`); `isAuthenticated = computed(() => !!currentUser())` (`:17`); `isLoading` (`:18`).
  - Constructor (`:20-28`) calls `getSession()` then subscribes to `onAuthStateChange`, both routing through `handleAuthStateChange` (`:62-71`) which sets `currentUser`.
  - `signUp(email, password, fullName, role)` (`:31-44`) creates the auth user, then inserts the `profiles` row `{ id, full_name, role }` (`:37-39`) — **auth user + profile created together**, role assigned here (`:39`).
  - `signIn` (`:46-54`), `signOut` (`:56-60`, clears `currentUser`, navigates to `/login`).

**Key fact:** role is never placed into `currentUser`; consumers must query `profiles` to learn it.

### Route guard and routing

- `src/app/guards/auth.guard.ts:5-14` — functional `CanActivateFn`; returns `true` if `isAuthenticated()`, else `router.parseUrl('/login')`. **No role check.**
- `src/app/app.routes.ts:4-11` — lazy `loadComponent` routes. Only `/profile` has `canActivate: [authGuard]` (`:7`). `/dashboard` (`:8`) is **unprotected**; `''` and `**` redirect to `/dashboard`.

### Role enforcement — service layer

- `src/app/services/session.service.ts`:
  - `getMySessions()` (`:23-45`) fetches the user's `role` from `profiles` (`:27-31`), then branches: `patient` → `.eq('patient_id', user.id)` (`:37`); else → `.eq('psychologist_id', user.id)` (`:39`). This is the canonical service-layer role branch.
  - `listUnassigned()` (`:11-21`) filters `status = 'not_assigned'` and `psychologist_id IS NULL`.
  - `createSession` (`:47-56`), `updateSessionStatus` (`:58-68`) — relies on RLS to restrict who can write.
- `src/app/services/resource.service.ts` — `getResources()` filters `published = true` (`:13`); create/update rely on RLS `author_id = auth.uid()`.
- `src/app/services/profile.service.ts` — `getProfile()` (`:9-18`) reads any profile (RLS allows all authenticated reads); `updateProfile()` (`:20-30`) restricted by RLS to own row.

### Role enforcement — Postgres RLS (source of truth)

`supabase-setup.sql`:
- **profiles** (`:8-23`): `role TEXT CHECK (role IN ('patient','psychologist'))` (`:11`). Policies: SELECT `USING (true)` for all authenticated (`:69-70`); UPDATE/INSERT gated by `auth.uid() = id` (`:72-76`).
- **sessions** (`:26-35`): status enum `not_assigned|pending|accepted|rejected|completed` (`:31`). Policies: patients SELECT `patient_id = auth.uid()` (`:79-80`); psychologists SELECT `psychologist_id = auth.uid()` (`:82-83`); patients INSERT with `patient_id = auth.uid()` (`:85-87`); psychologists UPDATE `psychologist_id = auth.uid()` (`:89-91`).
- **resources** (`:38-48`): type enum `article|exercise|guide` (`:43`). Policies: SELECT `published = true` (`:94-95`); author ALL via `author_id = auth.uid()` (`:97-98`).

Guest/volunteer subsystem:
- `supabase/migrations/20250627000000_guest_sessions_and_rate_limits.sql` — `guest_sessions` table (`:4-18`); **no public policies** — only service_role/Edge Functions (`:28`).
- `supabase/migrations/20250627000002_volunteer_assignment.sql` — psychologist-only policies enforced via `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'psychologist')`: view unassigned guest (`:14-22`), view own assigned (`:24-31`), view unassigned registered (`:33-41`), update assigned guest (`:115-128`).

### Role-based UI (pages)

- `src/app/pages/dashboard/dashboard.ts` — **unprotected route but role-aware UI.** `loadDashboard()` (`:43-76`) sets `const volunteer = profile?.role === 'psychologist'` (`:50`); psychologists load assigned + unassigned guest/registered sessions, patients load only their own (`:53-70`). `isVolunteer` signal (`:29`), `isLoggedIn = computed(...)` (`:37`). Methods: `createSession` (`:88-108`), `assignVolunteer` (`:110-120`), `updateStatus`/`updateGuestStatus` (`:122-138`).
- `src/app/pages/profile/profile.ts` — `effect()` in constructor (`:37-46`) watches `auth.currentUser()` and loads the profile; saves professional-only fields when `current.role === 'psychologist'` (`:89-95`). Template shows the professional section only if `p.role === 'psychologist'` (`profile.html:43`).
- `src/app/pages/login/login.ts` (`:17-20` signals) and `register/register.ts` (`role = signal<'patient'|'psychologist'>('patient')` `:19`, passed to `signUp` `:28`) — signal + `[ngModel]="x()" (ngModelChange)="x.set($event)"` pattern.

### Models

- `src/app/models/user.model.ts` — `Profile.role: 'patient' | 'psychologist'` (`:4`) plus optional psychologist fields (`professional_name`, `specialty`, `presentation`, `available_schedule`, `photo_url`, `session_orientation`).
- `src/app/models/session.model.ts` — `SessionStatus` (`:1`); `Session` with `patient_id`, optional `psychologist_id`.
- `src/app/models/resource.model.ts` — `ResourceType = 'article'|'exercise'|'guide'` (`:1`).
- `src/app/models/guest-session.model.ts` — `GuestSession` (reuses `SessionStatus`, `source: 'web'|'whatsapp'`, `volunteer_id`).

### Bootstrap

- `src/main.ts` — `bootstrapApplication(App, appConfig)`.
- `src/app/app.config.ts` — `provideRouter(routes)`, `provideHttpClient()`, global error listeners.
- `src/app/app.ts` — root injects `AuthService`; template is just `<router-outlet>`.

## Code References

- `src/app/services/auth.service.ts:31-44` — sign-up creates auth user + profiles row with role
- `src/app/services/auth.service.ts:16-17` — `currentUser` (id/email only) and `isAuthenticated`
- `src/app/guards/auth.guard.ts:5-14` — auth-only guard, no role check
- `src/app/app.routes.ts:7-8` — `/profile` guarded; `/dashboard` not
- `src/app/services/session.service.ts:36-40` — service-layer role branch
- `supabase-setup.sql:79-91` — sessions RLS by patient_id/psychologist_id
- `supabase/migrations/20250627000002_volunteer_assignment.sql:14-41` — psychologist-role RLS via EXISTS on profiles
- `src/app/pages/dashboard/dashboard.ts:50-70` — role-based dashboard data loading
- `src/app/pages/profile/profile.ts:89-95` — psychologist-only profile fields

## Architecture Insights

- **Role is data, not identity.** It is stored in `profiles`, not in the JWT/`currentUser` signal, so every role decision requires a profile read. This keeps auth simple but means UI/service code re-fetches role.
- **Two-layer enforcement, as documented in CLAUDE.md.** RLS is the real security boundary; service-layer branching is a UX/query-shaping convenience. They must stay consistent when changing who-can-see-what.
- **Guard is intentionally minimal.** Authorization beyond "logged in" is delegated to RLS, not the router. `/dashboard` being public is by design (it shows a public hotline + login CTA) but means any role-gating there is UI-only.
- **Guest/volunteer flow is backend-mediated.** `guest_sessions` has no public RLS; writes go through Edge Functions (service_role), with psychologist-only read/update policies layered on via migrations.
- **Consistent signal idiom.** `signal()`/`computed()`/`effect()` with `FormsModule` `[ngModel]`/`(ngModelChange)` two-way binding; no RxJS stores.

## Historical Context (from thoughts/)

No prior `thoughts/` documents existed at research time — `thoughts/research/` was created by this run. Design rationale for the Supabase integration lives under `openspec/changes/supabase-integration/` (per CLAUDE.md) and was not re-read here.

## Related Research

None yet — this is the first research document in `thoughts/research/`.

## Open Questions

- `/dashboard` is unprotected and reads role only after a profile fetch — is the intent that logged-out users land there (hotline CTA), with all sensitive data still RLS-protected? Looks intentional, worth confirming.
- `environment.ts` ships live Supabase URL + anon key committed (expected: anon key is public by design; security rests entirely on RLS correctness).
- The scaffold script resolves the git root to the parent `build4venezuela-acompa-amientopsicologico/`, so `thoughts/` lands one level above `psicologiaapoyo/`. Confirm that's the desired location.
