import type { SessionStatus } from './session.model';
import type { Session } from './session.model';

export interface CreateGuestSessionRequest {
  full_name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface GuestSession {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  scheduled_at: string | null;
  status: SessionStatus;
  notes: string | null;
  source: 'web' | 'whatsapp';
  volunteer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestSessionResponse {
  id: string;
  status: SessionStatus;
  scheduled_at: string | null;
  created_at: string;
}

export interface CreateGuestSessionResult {
  ok: boolean;
  session: GuestSessionResponse;
}

export interface AssignVolunteerResult {
  ok: boolean;
  session_type: AssignSessionType;
  session: GuestSession | Session;
}

export type AssignSessionType = 'guest' | 'registered';
