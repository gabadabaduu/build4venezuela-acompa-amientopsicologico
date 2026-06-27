import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import type { Session } from '@supabase/supabase-js';

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
    this.supabase.client.auth
      .getSession()
      .then(({ data: { session } }) => this.handleAuthStateChange(session))
      .catch(() => this.currentUser.set(null))
      .finally(() => this.isLoading.set(false));

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.handleAuthStateChange(session);
    });
  }

  async waitUntilReady(): Promise<void> {
    if (!this.isLoading()) {
      return;
    }

    return new Promise((resolve) => {
      const check = (): void => {
        if (!this.isLoading()) {
          resolve();
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  async signUp(email: string, password: string, fullName: string) {
    const role = 'patient' as const;

    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });

    if (error) {
      console.error('Sign-up failed:', error.message);
      throw error;
    }
    if (!data.user) {
      throw new Error('Sign-up failed: no user returned');
    }

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
