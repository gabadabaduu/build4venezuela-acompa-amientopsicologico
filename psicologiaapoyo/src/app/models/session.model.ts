export type SessionStatus = 'not_assigned' | 'pending' | 'accepted' | 'rejected' | 'completed';

export interface Session {
  id: string;
  patient_id: string;
  psychologist_id: string | null;
  scheduled_at: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}
