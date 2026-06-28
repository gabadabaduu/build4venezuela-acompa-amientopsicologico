import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import type {
  CreateGuestSessionRequest,
  CreateGuestSessionResult,
} from '../models/guest-session.model';

@Injectable({ providedIn: 'root' })
export class GuestSessionApiService {
  private readonly functionsUrl = `${environment.supabase.url}/functions/v1/create-session`;

  async createSession(
    request: CreateGuestSessionRequest,
    idempotencyKey?: string,
  ): Promise<CreateGuestSessionResult> {
    const apiKey = environment.supabase.publicApiKey?.trim();
    if (!apiKey || apiKey === 'replace-with-your-public-api-key') {
      throw new Error(
        'Configura publicApiKey en environment.ts con el mismo valor que PUBLIC_API_KEY en Supabase.',
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await fetch(this.functionsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error ?? 'Failed to create session');
    }

    return body as CreateGuestSessionResult;
  }
}
