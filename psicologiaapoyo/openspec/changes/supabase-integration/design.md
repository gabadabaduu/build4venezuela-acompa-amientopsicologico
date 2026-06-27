# Phase 3: Design — Architecture

## Folder Structure (Feature-First)

```
src/
├── app/
│   ├── app.config.ts          # Provides router, httpClient
│   ├── app.routes.ts          # Route tree
│   ├── app.ts                 # Root component
│   ├── app.html               # Shell layout + router-outlet
│   ├── models/
│   │   ├── user.model.ts      # User, Profile interfaces
│   │   ├── session.model.ts   # Session interface
│   │   └── resource.model.ts  # Resource interface
│   ├── services/
│   │   ├── supabase.service.ts    # Supabase client singleton
│   │   ├── auth.service.ts        # Auth state + methods
│   │   ├── profile.service.ts     # Profile CRUD
│   │   ├── session.service.ts     # Session CRUD
│   │   └── resource.service.ts    # Resource CRUD
│   ├── pages/
│   │   ├── login/
│   │   │   ├── login.ts
│   │   │   ├── login.html
│   │   │   └── login.spec.ts
│   │   ├── register/
│   │   │   ├── register.ts
│   │   │   ├── register.html
│   │   │   └── register.spec.ts
│   │   ├── profile/
│   │   │   ├── profile.ts
│   │   │   ├── profile.html
│   │   │   └── profile.spec.ts
│   │   └── dashboard/
│   │       ├── dashboard.ts
│   │       ├── dashboard.html
│   │       └── dashboard.spec.ts
│   └── guards/
│       └── auth.guard.ts
├── environments/
│   └── environment.ts         # Supabase URL + anon key (placeholders)
```

## Architecture Patterns

### Service Layer
- `SupabaseService`: Thin wrapper around `@supabase/supabase-js` client. Provides the `SupabaseClient` instance.
- `AuthService`: Uses Supabase Auth. Exposes signals for reactive auth state.
- Domain services (`ProfileService`, `SessionService`, `ResourceService`): CRUD operations against Supabase tables.

### State Management with Signals
- No external state library needed. Angular signals handle it.
- `AuthService.isAuthenticated` = `computed(() => !!currentUser())`
- Components consume signals via `inject(AuthService).isAuthenticated()`

### Dependency Injection
- All services: `@Injectable({ providedIn: 'root' })`
- Components inject via `inject()` function (no constructor DI)
- `takeUntilDestroyed()` in components for observable cleanup

### Route Guards
- Functional guard: `authGuard` checks `AuthService.isAuthenticated()`
- Redirects to `/login` if not authenticated

## Component Tree

```
App (shell layout)
├── Header (conditional nav based on auth)
├── RouterOutlet
│   ├── LoginPage     (/login)
│   ├── RegisterPage  (/register)
│   ├── ProfilePage   (/profile)      [protected]
│   └── DashboardPage (/dashboard)    [protected]
```
