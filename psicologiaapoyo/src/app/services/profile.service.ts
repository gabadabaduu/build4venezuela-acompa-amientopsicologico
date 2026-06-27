import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Profile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly supabase = inject(SupabaseService);

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateProfile(userId: string, updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'bio' | 'avatar_url'>>) {
    const { data, error } = await this.supabase.client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  }
}
