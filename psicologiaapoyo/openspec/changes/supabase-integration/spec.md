# Phase 2: Spec — Supabase Integration

## Functional Requirements

### FR-AUTH: Authentication
- **FR-AUTH-01**: User can register with email, password, and role (patient/psychologist)
- **FR-AUTH-02**: User can log in with email and password
- **FR-AUTH-03**: User can log out
- **FR-AUTH-04**: Auth state is persisted across page reloads (Supabase session)
- **FR-AUTH-05**: Protected routes redirect unauthenticated users to login

### FR-PROFILE: User Profiles
- **FR-PROF-01**: After registration, a profile is created in `profiles` table
- **FR-PROF-02**: User can view and edit their profile
- **FR-PROF-03**: Profile contains: full_name, role, phone, bio

### FR-SESSION: Support Sessions
- **FR-SESS-01**: Patient can request a session
- **FR-SESS-02**: Psychologist can accept/reject session requests
- **FR-SESS-03**: Both can view their upcoming sessions
- **FR-SESS-04**: Session has status: pending, accepted, rejected, completed

### FR-RESOURCE: Resource Library
- **FR-RES-01**: Psychologist can create resources (articles, exercises)
- **FR-RES-02**: Anyone authenticated can view published resources
- **FR-RES-03**: Resources have: title, description, content, type, published flag

---

## Database Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'psychologist')),
  phone TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SESSIONS TABLE
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id),
  psychologist_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RESOURCES TABLE
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'article' CHECK (type IN ('article', 'exercise', 'guide')),
  author_id UUID NOT NULL REFERENCES profiles(id),
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## RLS Policies

```sql
-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Sessions: patients see their sessions, psychologists see assigned sessions
CREATE POLICY "Patients see own sessions"
  ON sessions FOR SELECT TO authenticated USING (patient_id = auth.uid());

CREATE POLICY "Psychologists see assigned sessions"
  ON sessions FOR SELECT TO authenticated USING (psychologist_id = auth.uid());

CREATE POLICY "Patients create sessions"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Psychologists update assigned sessions"
  ON sessions FOR UPDATE TO authenticated
  USING (psychologist_id = auth.uid());

-- Resources: anyone authenticated can read published; author can CRUD
CREATE POLICY "Anyone can read published resources"
  ON resources FOR SELECT TO authenticated USING (published = true);

CREATE POLICY "Author manages own resources"
  ON resources FOR ALL TO authenticated USING (author_id = auth.uid());
```

## Angular Service Operations

### AuthService
- `signUp(email, password, fullName, role)`
- `signIn(email, password)`
- `signOut()`
- Signals: `currentUser`, `isAuthenticated`, `isLoading`

### ProfileService
- `getProfile(userId)`
- `updateProfile(userId, data)`

### SessionService
- `getMySessions()` — filtered by role
- `createSession(data)`
- `updateSessionStatus(id, status)`

### ResourceService
- `getResources()`
- `createResource(data)`
- `updateResource(id, data)`
