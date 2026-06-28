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
