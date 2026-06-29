export type UserRole = 'volunteer' | 'admin';

export type StudiesStatus =
  | 'en_curso'
  | 'titulado'
  | 'especializacion'
  | 'maestria'
  | 'doctorado';

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
  studies_status: StudiesStatus | null;
  professional_registry_number: string | null;
  place: string | null;
  google_calendar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string | null;
}

export const STUDIES_STATUS_LABELS: Record<StudiesStatus, string> = {
  en_curso: 'En curso / Estudiante',
  titulado: 'Titulado/a',
  especializacion: 'Especialización',
  maestria: 'Maestría',
  doctorado: 'Doctorado',
};

export interface CreateProfileUserRequest {
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
  google_calendar_url?: string;
}

export interface CreateProfileUserResult {
  ok: boolean;
  user_id: string;
  email: string | null;
  phone: string | null;
  temporary_password?: string;
  must_change_password?: boolean;
  profile: Pick<
    Profile,
    | 'id'
    | 'full_name'
    | 'role'
    | 'phone'
    | 'place'
    | 'studies_status'
    | 'professional_registry_number'
    | 'place'
    | 'google_calendar_url'
    | 'created_at'
  >;
}
