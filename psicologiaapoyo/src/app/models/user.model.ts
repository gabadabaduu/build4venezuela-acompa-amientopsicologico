export interface Profile {
  id: string;
  full_name: string;
  role: 'patient' | 'psychologist';
  phone?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  profile?: Profile;
}
