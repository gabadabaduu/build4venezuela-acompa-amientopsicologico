import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  DEFAULT_SESSION_STATUS,
  type GuestSessionRow,
  type GuestSessionSource,
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
  notes?: string;
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
      notes: input.notes ?? null,
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
