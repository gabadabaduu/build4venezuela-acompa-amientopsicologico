import { inject, Injectable } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import type { Profile } from '../models/user.model';

export interface NewVolunteerInput {
  full_name: string; // required
  email?: string; // email OR phone required
  phone?: string;
  password?: string; // optional; omit to auto-generate
  // optional profile fields
  bio?: string;
  avatar_url?: string;
  professional_name?: string;
  specialty?: string;
  presentation?: string;
  available_schedule?: string;
  photo_url?: string;
  session_orientation?: string;
  studies_status?: string;
  professional_registry_number?: string;
  place?: string;
}

export interface CreateVolunteerResult {
  ok: boolean;
  user_id: string;
  email: string | null;
  phone: string | null;
  temporary_password?: string; // present only when password was auto-generated
  profile: Profile;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly supabase = inject(SupabaseService);

  async createVolunteer(input: NewVolunteerInput): Promise<CreateVolunteerResult> {
    const { data, error } = await this.supabase.client.functions.invoke<CreateVolunteerResult>(
      'create-profile-user',
      { body: { role: 'volunteer', ...input } },
    );

    if (error) {
      throw new Error(await extractFunctionError(error));
    }
    return data as CreateVolunteerResult;
  }

  async listVolunteers(): Promise<Profile[]> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('role', 'volunteer')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Profile[];
  }
}

// On a non-2xx, supabase-js returns a FunctionsHttpError whose `.context` is the
// raw Response. Read the function's `{ error }` body; fall back to the generic message.
async function extractFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error as string;
    } catch {
      /* non-JSON body — fall through */
    }
  }
  return error instanceof Error ? error.message : 'No se pudo crear el psicólogo';
}
