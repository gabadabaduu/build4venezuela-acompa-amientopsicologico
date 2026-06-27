export type SosUrgency = 'low' | 'medium' | 'critical';

export type SosStatus = 'pending' | 'assigned' | 'in_progress' | 'closed';

export type SosHelpType = 'psychological';

export interface SubmitSosRequestPayload {
  full_name: string;
  phone: string;
  email: string;
  location_text: string;
  message: string;
  urgency: SosUrgency;
  consent: true;
  national_id?: string;
  lat?: number;
  lng?: number;
  metadata?: Record<string, unknown>;
}

export interface SubmitSosRequestResult {
  id: string;
  tracking_code: string;
  status: SosStatus;
  is_existing: boolean;
}

export interface SosStatusLookupResult {
  status: SosStatus;
  created_at: string;
}

export interface SosRequestRecord {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  phone: string;
  phone_normalized: string;
  email: string;
  national_id: string | null;
  location_text: string;
  lat: number | null;
  lng: number | null;
  message: string;
  urgency: SosUrgency;
  help_type: SosHelpType;
  status: SosStatus;
  tracking_code: string;
  assigned_to: string | null;
  consent: boolean;
  metadata: Record<string, unknown>;
}
