import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { ActiveGuestSessionError } from './validation.ts';
import {
  DEFAULT_SESSION_STATUS,
  type GuestAgeRange,
  type GuestSessionRow,
  type GuestSessionSource,
  type GuestUrgency,
} from './session-types.ts';

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type { GuestSessionRow, RegisteredSessionRow } from './session-types.ts';
export { publicGuestSessionPayload } from './session-types.ts';

export interface GuestSessionInput {
  full_name: string;
  phone?: string;
  email?: string;
  age_range?: GuestAgeRange;
  urgency?: GuestUrgency;
  source: GuestSessionSource;
  external_id?: string;
}

export async function createGuestSession(
  supabase: SupabaseClient,
  input: GuestSessionInput,
): Promise<GuestSessionRow> {
  const { data, error } = await supabase
    .from('guest_sessions')
    .insert({
      full_name: input.full_name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      scheduled_at: null,
      status: DEFAULT_SESSION_STATUS,
      age_range: input.age_range ?? null,
      urgency: input.urgency ?? null,
      source: input.source,
      external_id: input.external_id ?? null,
      volunteer_id: null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505' && input.external_id) {
      const { data: existing } = await supabase
        .from('guest_sessions')
        .select()
        .eq('external_id', input.external_id)
        .single();

      if (existing) return existing as GuestSessionRow;
    }
    throw error;
  }

  return data as GuestSessionRow;
}

export async function assertNoActiveGuestSessionByContact(
  supabase: SupabaseClient,
  contact: { phone?: string; email?: string },
): Promise<void> {
  const { phone, email } = contact;
  if (!phone && !email) return;

  let query = supabase
    .from('guest_sessions')
    .select('id')
    .neq('status', 'completed')
    .limit(1);

  if (phone && email) {
    query = query.or(`phone.eq.${phone},email.eq.${email}`);
  } else if (phone) {
    query = query.eq('phone', phone);
  } else if (email) {
    query = query.eq('email', email);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (data) throw new ActiveGuestSessionError();
}
