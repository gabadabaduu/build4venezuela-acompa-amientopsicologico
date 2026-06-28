import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type {
  AssignSessionType,
  AssignVolunteerResult,
  GuestSession,
} from '../models/guest-session.model';
import type { SessionStatus } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class GuestSessionService {
  private readonly supabase = inject(SupabaseService);

  async listAssignedToMe(userId: string): Promise<GuestSession[]> {
    const { data, error } = await this.supabase.client
      .from('guest_sessions')
      .select('*')
      .eq('volunteer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as GuestSession[];
  }

  async listUnassigned(): Promise<GuestSession[]> {
    const { data, error } = await this.supabase.client
      .from('guest_sessions')
      .select('*')
      .eq('status', 'not_assigned')
      .is('volunteer_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as GuestSession[];
  }

  async assignVolunteer(
    sessionId: string,
    sessionType: AssignSessionType = 'guest',
  ): Promise<AssignVolunteerResult> {
    const { data, error } = await this.supabase.client.functions.invoke('assign-volunteer', {
      body: {
        session_id: sessionId,
        session_type: sessionType,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data as AssignVolunteerResult;
  }

  async updateStatus(id: string, status: SessionStatus): Promise<GuestSession> {
    const { data, error } = await this.supabase.client
      .from('guest_sessions')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as GuestSession;
  }
}
