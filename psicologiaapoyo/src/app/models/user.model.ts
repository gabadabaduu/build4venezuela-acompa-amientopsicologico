export interface Profile {
  id: string;
  role: 'patient' | 'psychologist';
  full_name: string | null;
  phone: string | null;
  bio: string | null;

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
