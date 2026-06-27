import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import type { User as SupabaseAuthUser, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = signal(true);

  constructor() {
    this.supabase.client.auth.getSession().then(({ data: { session } }) => {
      this.handleAuthStateChange(session);
      this.isLoading.set(false);
    });

    this.supabase.client.auth.onAuthStateChange((event, session) => {
      this.handleAuthStateChange(session);
    });
  }

  async signUp(email: string, password: string, fullName: string, role: 'patient' | 'psychologist') {
    const { data, error } = await this.supabase.client.auth.signUp({ email, password });

    if (error) throw error;
    if (!data.user) throw new Error('Sign-up failed: no user returned');

    const { error: profileError } = await this.supabase.client
      .from('profiles')
      .insert({ id: data.user.id, full_name: fullName, role });

    if (profileError) throw profileError;

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    await this.supabase.client.auth.signOut();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  private handleAuthStateChange(session: Session | null) {
    if (session?.user) {
      this.currentUser.set({
        id: session.user.id,
        email: session.user.email ?? '',
      });
    } else {
      this.currentUser.set(null);
    }
  }
}
