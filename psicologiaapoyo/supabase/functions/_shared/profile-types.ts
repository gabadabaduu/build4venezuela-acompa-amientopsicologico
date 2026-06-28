export type UserRole = 'volunteer' | 'admin';

export type StudiesStatus =
  | 'en_curso'
  | 'titulado'
  | 'especializacion'
  | 'maestria'
  | 'doctorado';

export interface ProfileRow {
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
  studies_status: StudiesStatus | null;
  professional_registry_number: string | null;
  place: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProfileUserInput {
  full_name: string;
  email?: string;
  password?: string;
  role?: UserRole;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  professional_name?: string;
  specialty?: string;
  presentation?: string;
  available_schedule?: string;
  photo_url?: string;
  session_orientation?: string;
  studies_status?: StudiesStatus;
  professional_registry_number?: string;
  place?: string;
}

export interface CreateProfileUserResult {
  user_id: string;
  email: string | null;
  phone: string | null;
  temporary_password?: string;
  must_change_password?: boolean;
  profile: ProfileRow;
}

export function publicProfilePayload(profile: ProfileRow) {
  return {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role,
    phone: profile.phone,
    place: profile.place,
    studies_status: profile.studies_status,
    professional_registry_number: profile.professional_registry_number,
    created_at: profile.created_at,
  };
}
