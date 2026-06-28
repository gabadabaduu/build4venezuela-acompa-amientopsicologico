-- Base schema: profiles, sessions, resources, RLS
-- Must run before guest_sessions (which references profiles)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'psychologist')),
  phone TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id),
  psychologist_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_assigned'
    CHECK (status IN ('not_assigned', 'pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
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

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS sessions_updated_at ON sessions;
CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS resources_updated_at ON resources;
CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Patients see own sessions" ON sessions;
CREATE POLICY "Patients see own sessions"
  ON sessions FOR SELECT TO authenticated USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Psychologists see assigned sessions" ON sessions;
CREATE POLICY "Psychologists see assigned sessions"
  ON sessions FOR SELECT TO authenticated USING (psychologist_id = auth.uid());

DROP POLICY IF EXISTS "Patients create sessions" ON sessions;
CREATE POLICY "Patients create sessions"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());

DROP POLICY IF EXISTS "Psychologists update assigned sessions" ON sessions;
CREATE POLICY "Psychologists update assigned sessions"
  ON sessions FOR UPDATE TO authenticated
  USING (psychologist_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can read published resources" ON resources;
CREATE POLICY "Anyone can read published resources"
  ON resources FOR SELECT TO authenticated USING (published = true);

DROP POLICY IF EXISTS "Author manages own resources" ON resources;
CREATE POLICY "Author manages own resources"
  ON resources FOR ALL TO authenticated USING (author_id = auth.uid());
