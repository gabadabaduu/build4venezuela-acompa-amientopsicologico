export interface Profile {
  id: string;
  full_name: string;
  role: 'patient' | 'psychologist';
  phone?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  professional_name?: string | null;
  specialty?: string | null;
  presentation?: string | null;
  available_schedule?: string | null;
  photo_url?: string | null;
  session_orientation?: string | null;
}

export interface User {
  id: string;
  email: string;
  phone?: string | null;
}
