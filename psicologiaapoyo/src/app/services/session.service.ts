import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { Session, SessionStatus } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async getMySessions(): Promise<Session[]> {
    const user = this.auth.currentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile, error: profileError } = await this.supabase.client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return [];
    }

    const query = this.supabase.client.from('sessions').select('*');

    if (profile.role === 'patient') {
      query.eq('patient_id', user.id);
    } else if (profile.role === 'psychologist') {
      query.or(
        `psychologist_id.eq.${user.id},and(psychologist_id.is.null,status.eq.pending)`,
      );
    } else {
      return [];
    }

    const { data, error } = await query.order('scheduled_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createSession(session: Pick<Session, 'patient_id' | 'scheduled_at' | 'notes'>) {
    const { data, error } = await this.supabase.client
      .from('sessions')
      .insert(session)
      .select()
      .single();

    if (error) throw error;
    return data as Session;
  }

  async updateSessionStatus(id: string, status: SessionStatus) {
    const user = this.auth.currentUser();
    if (!user) throw new Error('Not authenticated');

    const updates: { status: SessionStatus; psychologist_id?: string } = { status };

    if (status === 'accepted') {
      const { data: profile, error: profileError } = await this.supabase.client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'psychologist') {
        throw new Error('Only psychologists can accept sessions');
      }

      updates.psychologist_id = user.id;
    }

    const { data, error } = await this.supabase.client
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Session;
  }
}
