import { inject, Injectable } from '@angular/core';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import type {
  AssignSessionType,
  AssignVolunteerResult,
  GuestSession,
} from '../models/guest-session.model';
import type { Session, SessionStatus } from '../models/session.model';

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

    if (error) {
      throw await this.toInvokeError(error);
    }
    if (data?.error) throw new Error(data.error);

    return data as AssignVolunteerResult;
  }

  private async toInvokeError(error: unknown): Promise<Error> {
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.error) return new Error(body.error);
      } catch {
        // fall through
      }
    }

    return error instanceof Error ? error : new Error('No se pudo asignar la sesión');
  }

  async manageVolunteerSession(
    sessionId: string,
    sessionType: AssignSessionType,
    action: 'release' | 'complete' | 'schedule',
    scheduledAt?: string,
  ): Promise<GuestSession | Session | void> {
    if (action === 'schedule' && !scheduledAt) {
      throw new Error('scheduled_at is required');
    }

    const body: {
      session_id: string;
      session_type: AssignSessionType;
      action: 'release' | 'complete' | 'schedule';
      scheduled_at?: string;
    } = {
      session_id: sessionId,
      session_type: sessionType,
      action,
    };

    if (action === 'schedule') {
      body.scheduled_at = scheduledAt;
    }

    const { data, error } = await this.supabase.client.functions.invoke('manage-volunteer-session', {
      body,
    });

    if (error) {
      throw await this.toInvokeError(error);
    }
    if (data?.error) throw new Error(data.error);

    if (action === 'schedule') {
      return data.session as GuestSession | Session;
    }
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
