-- SQL para configurar Supabase como backend de PsicologiaApoyo
-- Ejecutar en el SQL Editor de Supabase (https://supabase.com/dashboard)

-- 1. Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de perfiles (1:1 con auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('volunteer', 'admin')),
  phone TEXT,
  bio TEXT,
  avatar_url TEXT,
  professional_name TEXT,
  specialty TEXT,
  presentation TEXT,
  available_schedule TEXT,
  photo_url TEXT,
  session_orientation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla de sesiones
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES profiles(id),
  psychologist_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_assigned' CHECK (status IN ('not_assigned', 'pending', 'accepted', 'rejected', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabla de recursos
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

-- 5. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- POLICIES: Profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- POLICIES: Sessions
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

-- POLICIES: Resources
CREATE POLICY "Anyone can read published resources"
  ON resources FOR SELECT TO authenticated USING (published = true);

CREATE POLICY "Author manages own resources"
  ON resources FOR ALL TO authenticated USING (author_id = auth.uid());
