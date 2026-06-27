import { inject, Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { Resource } from '../models/resource.model';

@Injectable({ providedIn: 'root' })
export class ResourceService {
  private readonly supabase = inject(SupabaseService);

  async getResources(): Promise<Resource[]> {
    const { data, error } = await this.supabase.client
      .from('resources')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async createResource(resource: Pick<Resource, 'title' | 'description' | 'content' | 'type' | 'author_id'>) {
    const { data, error } = await this.supabase.client
      .from('resources')
      .insert(resource)
      .select()
      .single();

    if (error) throw error;
    return data as Resource;
  }

  async updateResource(id: string, updates: Partial<Pick<Resource, 'title' | 'description' | 'content' | 'type' | 'published'>>) {
    const { data, error } = await this.supabase.client
      .from('resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Resource;
  }
}
