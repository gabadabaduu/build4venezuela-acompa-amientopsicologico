export type SessionStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

export interface Session {
  id: string;
  patient_id: string;
  psychologist_id?: string;
  scheduled_at?: string;
  status: SessionStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}
