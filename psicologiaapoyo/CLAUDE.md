# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PsicologiaApoyo — an Angular 21 web app providing psychological support for Venezuela, with **Supabase** (Postgres + Auth) as the backend. Two user roles: `patient` and `psychologist`. UI copy and user-facing strings are in **Spanish**.

## Commands

```bash
npm start              # ng serve — dev server at http://localhost:4200
npm run build          # production build to dist/
npm run watch          # dev build, rebuild on change
npm test               # run unit tests (Vitest via @angular/build:unit-test)
npx ng test --watch    # tests in watch mode
ng generate component pages/foo   # scaffold (prefix is "app")
```

There is no lint script and no e2e setup. Formatting is Prettier (`.prettierrc`).

## Architecture

**Standalone, zer­o-NgModule Angular.** Bootstrapped from `src/main.ts` with `appConfig` (`src/app/app.config.ts`). Routing uses lazy `loadComponent` in `src/app/app.routes.ts`; protected routes (`/profile`, `/dashboard`) use `authGuard`. Default route redirects to `/dashboard`.

**State uses Angular signals, not RxJS/stores.** Components and services hold state in `signal()` / `computed()`. The `@angular/forms` `FormsModule` is used with signal-backed `ngModel` bindings (see `pages/login/login.ts`). RxJS is a transitive dep only.

**Supabase access is layered:**
- `SupabaseService` (`services/supabase.service.ts`) — owns the single `SupabaseClient`, created from `environment.supabase`. Everything else injects this; never call `createClient` elsewhere.
- `AuthService` — wraps Supabase auth. Holds `currentUser`/`isAuthenticated`/`isLoading` signals, subscribes to `onAuthStateChange` in its constructor, and on `signUp` also inserts the `profiles` row (auth user + profile are created together).
- Feature services (`session.service.ts`, `resource.service.ts`, `profile.service.ts`) — inject `SupabaseService` (and `AuthService` where the current user is needed) and run typed `.from(table)` queries returning model types from `src/app/models/`.

**Role-based data access** happens in two places that must stay consistent:
1. Postgres **Row Level Security** policies (the source of truth — see `supabase-setup.sql`).
2. Service-layer query filtering (e.g. `SessionService.getMySessions` branches on the user's `role` to filter by `patient_id` vs `psychologist_id`).
When changing who-can-see-what, update both the RLS policy and the service query.

## Database

Schema and RLS live in `supabase-setup.sql` (run manually in the Supabase SQL Editor — no migration tooling). Three tables: `profiles` (1:1 with `auth.users`, has `role`), `sessions` (patient/psychologist, `status` in pending/accepted/rejected/completed), `resources` (article/exercise/guide, `published` flag). All have `updated_at` triggers. TypeScript mirrors of these tables are in `src/app/models/`; keep models and SQL in sync.

## Config

`src/environments/environment.ts` holds the Supabase URL + anon key inline (this file is committed and currently contains live project credentials). The anon key is public by design — security is enforced by RLS, so policies must be correct.

## Testing

Vitest with Angular's `@angular/build:unit-test` builder and `TestBed`. Spec files are `*.spec.ts` next to the code. Existing tests are smoke/creation tests that inject services via `TestBed` (see `services/auth.service.spec.ts`); they do not hit a real Supabase backend.

## openspec/

`openspec/changes/<name>/` holds design docs (proposal.md, design.md, spec.md) for planned work, written in phases. Consult these for intended scope and rationale before large features; the Supabase integration is documented under `openspec/changes/supabase-integration/`.
