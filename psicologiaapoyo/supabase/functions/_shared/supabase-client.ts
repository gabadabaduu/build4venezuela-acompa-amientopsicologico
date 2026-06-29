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

export class DuplicateUserError extends Error {
  constructor(message = 'A user with this email or phone already exists') {
    super(message);
    this.name = 'DuplicateUserError';
  }
}

function generateTemporaryPassword(): string {
  // 4 bytes -> 8 hex chars (meets the 8-char minimum, easy to read and share).
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function assertAuthUserAvailable(
  supabase: SupabaseClient,
  contact: { email?: string; phone?: string },
): Promise<void> {
  if (contact.email) {
    const { data, error } = await supabase.rpc('auth_user_exists_by_email', {
      p_email: contact.email,
    });
    if (error) throw error;
    if (data) throw new DuplicateUserError('A user with this email already exists');
  }

  if (contact.phone) {
    const { data, error } = await supabase.rpc('auth_user_exists_by_phone', {
      p_phone: contact.phone,
    });
    if (error) throw error;
    if (data) throw new DuplicateUserError('A user with this phone already exists');
  }
}

export async function createAuthUserWithProfile(
  supabase: SupabaseClient,
  input: import('./profile-types.ts').CreateProfileUserInput,
): Promise<import('./profile-types.ts').CreateProfileUserResult> {
  await assertAuthUserAvailable(supabase, {
    email: input.email,
    phone: input.phone,
  });

  const password = input.password ?? generateTemporaryPassword();
  const passwordWasGenerated = !input.password;

  const createPayload: {
    email?: string;
    phone?: string;
    password: string;
    email_confirm: boolean;
    phone_confirm: boolean;
    user_metadata: { full_name: string; must_change_password: boolean };
  } = {
    password,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      must_change_password: true,
    },
  };

  if (input.email) createPayload.email = input.email;
  if (input.phone) createPayload.phone = input.phone;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser(createPayload);

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes('already')) {
      throw new DuplicateUserError();
    }
    throw authError ?? new Error('Failed to create auth user');
  }

  const userId = authData.user.id;

  const profileRow = {
    id: userId,
    full_name: input.full_name,
    role: input.role ?? 'volunteer',
    phone: input.phone ?? null,
    bio: input.bio ?? null,
    avatar_url: input.avatar_url ?? null,
    professional_name: input.professional_name ?? null,
    specialty: input.specialty ?? null,
    presentation: input.presentation ?? null,
    available_schedule: input.available_schedule ?? null,
    photo_url: input.photo_url ?? null,
    session_orientation: input.session_orientation ?? null,
    studies_status: input.studies_status ?? null,
    professional_registry_number: input.professional_registry_number ?? null,
    place: input.place ?? null,
  };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert(profileRow)
    .select()
    .single();

  if (profileError || !profile) {
    await supabase.auth.admin.deleteUser(userId);
    throw profileError ?? new Error('Failed to create profile');
  }

  return {
    user_id: userId,
    email: authData.user.email ?? null,
    phone: authData.user.phone ?? input.phone ?? null,
    temporary_password: passwordWasGenerated ? password : undefined,
    must_change_password: true,
    profile: profile as import('./profile-types.ts').ProfileRow,
  };
}
