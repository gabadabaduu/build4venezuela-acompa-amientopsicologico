export type SessionStatus = 'not_assigned' | 'pending' | 'accepted' | 'rejected' | 'completed';

export const DEFAULT_SESSION_STATUS: SessionStatus = 'not_assigned';

export type GuestSessionSource = 'web' | 'whatsapp';

export type GuestAgeRange = 'under_10' | '11_18' | '19_30' | '31_50' | 'over_50';
export type GuestUrgency = 'high' | 'medium' | 'low';

export interface GuestSessionRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  scheduled_at: string | null;
  status: SessionStatus;
  age_range: GuestAgeRange | null;
  urgency: GuestUrgency | null;
  source: GuestSessionSource;
  external_id: string | null;
  volunteer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisteredSessionRow {
  id: string;
  patient_id: string;
  psychologist_id: string | null;
  scheduled_at: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export function statusLabel(status: SessionStatus): string {
  const labels: Record<SessionStatus, string> = {
    not_assigned: 'Sin asignar',
    pending: 'Pendiente',
    accepted: 'Aceptada',
    rejected: 'Rechazada',
    completed: 'Completada',
  };
  return labels[status];
}

export function publicGuestSessionPayload(session: GuestSessionRow) {
  return {
    id: session.id,
    status: session.status,
    scheduled_at: session.scheduled_at,
    created_at: session.created_at,
  };
}
