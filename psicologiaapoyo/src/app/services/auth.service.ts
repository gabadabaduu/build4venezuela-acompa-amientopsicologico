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

  async signUp(email: string, password: string, fullName: string, role: 'volunteer' | 'admin') {
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

  async mustChangePassword(): Promise<boolean> {
    const { data, error } = await this.supabase.client.auth.getUser();
    if (error) throw error;
    return data.user?.user_metadata?.['must_change_password'] === true;
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.client.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false },
    });

    if (error) throw error;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const user = this.currentUser();
    if (!user?.email) {
      throw new Error('No se pudo verificar tu cuenta para cambiar la contraseña.');
    }

    const { error: verifyError } = await this.supabase.client.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      throw new Error('La contraseña actual no es correcta.');
    }

    await this.updatePassword(newPassword);
  }

  async getPostLoginPath(userId: string): Promise<string> {
    if (await this.mustChangePassword()) {
      return '/change-password';
    }

    const { data, error } = await this.supabase.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.role === 'admin' ? '/admin' : '/profile';
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
