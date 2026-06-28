import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import type {
  CreateProfileUserRequest,
  CreateProfileUserResult,
} from '../models/user.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ProfileUserApiService {
  private readonly supabase = inject(SupabaseService);
  private readonly functionsUrl = `${environment.supabase.url}/functions/v1/create-profile-user`;

  async createProfileUser(request: CreateProfileUserRequest): Promise<CreateProfileUserResult> {
    const { data: sessionData, error: sessionError } = await this.supabase.client.auth.getSession();
    if (sessionError) throw sessionError;

    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      throw new Error('Debes iniciar sesión como administrador.');
    }

    const response = await fetch(this.functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: environment.supabase.anonKey,
      },
      body: JSON.stringify(request),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error ?? 'No se pudo crear el usuario');
    }

    return body as CreateProfileUserResult;
  }
}
