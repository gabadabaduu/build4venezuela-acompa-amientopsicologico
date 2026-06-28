export type UserRole = 'patient' | 'psychologist';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  professional_name: string | null;
  specialty: string | null;
  presentation: string | null;
  available_schedule: string | null;
  photo_url: string | null;
  session_orientation: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string | null;
}
